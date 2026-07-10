import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth-utils";
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit";

/** Only forward known worker path prefixes (SSRF / open-proxy mitigation) */
const ALLOWED_PATH_PREFIXES = [
  "extract",
  "extract-answers",
  "extract-questions",
  "health",
  "docs",
  "openapi",
];

const MAX_BODY_BYTES = 25 * 1024 * 1024; // 25MB

function isAllowedPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, "").toLowerCase();
  if (!normalized || normalized.includes("..") || normalized.includes("\\")) {
    return false;
  }
  return ALLOWED_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix + "/")
  );
}

async function handleProxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const supabase = await createClient();
    const user = await requireAuth(supabase);
    await requireRole(supabase, user.id, ["teacher", "admin"]);

    const ip = getClientIP(request);
    const rate = await checkRateLimit(`worker-proxy:${user.id}:${ip}`, 20, 60);
    if (!rate.allowed) {
      return rateLimitResponse({
        success: false,
        limit: 20,
        remaining: rate.remaining,
        resetTime: rate.reset * 1000,
      });
    }

    const resolvedParams = await params;
    const path = resolvedParams.path.join("/");

    if (!isAllowedPath(path)) {
      return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
    }

    let workerBaseUrl = process.env.PYTHON_WORKER_URL || "";
    if (!workerBaseUrl) {
      const publicUrl = process.env.NEXT_PUBLIC_WORKER_URL || "";
      if (publicUrl.startsWith("http")) {
        workerBaseUrl = publicUrl;
      } else {
        workerBaseUrl = "http://127.0.0.1:8000";
      }
    }

    // Prevent open redirect / SSRF via env typos — only http(s)
    if (!/^https?:\/\//i.test(workerBaseUrl)) {
      return NextResponse.json({ error: "Invalid worker URL configuration" }, { status: 500 });
    }

    const targetUrl = `${workerBaseUrl.replace(/\/$/, "")}/${path}`;

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    const accept = request.headers.get("accept");
    if (accept) headers.set("accept", accept);

    let body: Blob | null = null;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.blob();
      if (body.size > MAX_BODY_BYTES) {
        return NextResponse.json({ error: "Payload too large" }, { status: 413 });
      }
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("connection");
    responseHeaders.delete("keep-alive");

    const responseBody = await response.blob();

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // Auth errors from requireAuth/requireRole
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Insufficient permissions") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("[Worker Proxy] Error forwarding request:", error);
    return NextResponse.json(
      { error: "Failed to connect to PDF Worker" },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, { params });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, { params });
}
