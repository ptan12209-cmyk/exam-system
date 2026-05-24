import { NextRequest, NextResponse } from "next/server";

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    // Resolve params (works for both Next.js 13/14 and Next.js 15)
    const resolvedParams = await params;
    const path = resolvedParams.path.join("/");
    
    // Check environment variables for target worker URL
    let workerBaseUrl = process.env.PYTHON_WORKER_URL || "";
    if (!workerBaseUrl) {
      const publicUrl = process.env.NEXT_PUBLIC_WORKER_URL || "";
      if (publicUrl.startsWith("http")) {
        workerBaseUrl = publicUrl;
      } else {
        // Default fallback for VPS / Local hosting
        workerBaseUrl = "http://127.0.0.1:8000";
      }
    }
    
    const targetUrl = `${workerBaseUrl}/${path}`;

    console.log(`[Worker Proxy] Forwarding ${request.method} request to: ${targetUrl}`);

    // Clone headers
    const headers = new Headers(request.headers);
    headers.delete("host");

    // Read body if it's not a GET/HEAD request
    let body: any = null;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.blob();
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    const responseHeaders = new Headers(response.headers);
    const responseBody = await response.blob();

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("[Worker Proxy] Error forwarding request:", error);
    return NextResponse.json(
      { error: "Failed to connect to PDF Worker: " + error.message },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, { params });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, { params });
}
