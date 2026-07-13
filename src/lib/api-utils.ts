import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { cached?: boolean; ttl?: number };
}

// ---------------------------------------------------------------------------
// ApiError – throw this from anywhere in your app for consistent responses
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ---------------------------------------------------------------------------
// Response helpers – build ApiResponse objects
// ---------------------------------------------------------------------------

export function successResponse<T>(data: T, meta?: ApiResponse['meta']): ApiResponse<T> {
  const response: ApiResponse<T> = { success: true, data };
  if (meta) response.meta = meta;
  return response;
}

export function errorResponse(
  code: string,
  message: string,
  _statusCode?: number
): ApiResponse<never> {
  return {
    success: false,
    error: { code, message },
  };
}

// ---------------------------------------------------------------------------
// handleApiError – logs the error and returns a safe ApiResponse<never>
// ---------------------------------------------------------------------------

export function handleApiError(error: unknown): { response: ApiResponse<never>; status: number } {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    return {
      response: { success: false, error: { code: error.code, message: error.message } },
      status: error.statusCode,
    };
  }

  // Zod / validation errors (has .issues array)
  if (
    error &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray((error as Record<string, unknown>).issues)
  ) {
    return {
      response: {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed' },
      },
      status: 400,
    };
  }

  // Fallback — never leak internal details to clients in production
  const isProd = process.env.NODE_ENV === 'production';
  const message =
    isProd
      ? 'Internal server error'
      : error instanceof Error
        ? error.message
        : 'Internal server error';
  return {
    response: { success: false, error: { code: 'INTERNAL_ERROR', message } },
    status: 500,
  };
}

// ---------------------------------------------------------------------------
// withErrorHandler – wraps a Next.js route handler with try/catch
// ---------------------------------------------------------------------------

export function withErrorHandler<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...args: any[]) => Promise<Response>,
>(handler: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      const { response, status } = handleApiError(error);
      return NextResponse.json(response, { status });
    }
  }) as T;
}
