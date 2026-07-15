"use client"

/**
 * fetch-with-timeout.ts
 * ─────────────────────
 * A drop-in replacement for `fetch` that adds:
 *   1. Configurable request timeout (AbortController)
 *   2. Automatic online detection
 *   3. Structured error throwing with a `RequestError` class
 *
 * All other request helpers in the codebase should use this.
 */

/** Structured error from any remote request. */
export class RequestError extends Error {
  constructor(
    message: string,
    public readonly type:
      | "offline"
      | "timeout"
      | "unauthorized"
      | "forbidden"
      | "not_found"
      | "server"
      | "client"
      | "parse"
      | "unknown",
    public readonly status?: number,
  ) {
    super(message)
    this.name = "RequestError"
  }
}

export interface FetchOptions extends RequestInit {
  /** Request timeout in milliseconds. Defaults to 20_000 (20 s). */
  timeoutMs?: number
}

/**
 * Enhanced `fetch` wrapper with timeout and structured errors.
 * Throws `RequestError` on any failure (offline, timeout, HTTP error, etc.)
 * so callers can distinguish between error types consistently.
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const { timeoutMs = 20_000, ...fetchOptions } = options

  // 1. Bail early if we are definitely offline
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new RequestError(
      "No internet connection. Please check your network and try again.",
      "offline",
    )
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    clearTimeout(timer)
    return response
  } catch (err: any) {
    clearTimeout(timer)

    if (err?.name === "AbortError") {
      throw new RequestError(
        "The request took too long. Please try again.",
        "timeout",
      )
    }

    // Network error (no connection, DNS failure, CORS, etc.)
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new RequestError(
        "No internet connection. Please check your network and try again.",
        "offline",
      )
    }

    throw new RequestError(
      err?.message || "An unexpected network error occurred.",
      "unknown",
    )
  }
}

/**
 * Generic helper that fetches, checks status and parses JSON.
 * Returns the parsed body on success.
 * Throws `RequestError` on any failure (offline, timeout, HTTP error, JSON parse, etc.)
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const response = await fetchWithTimeout(url, options)

  if (!response.ok) {
    // Try to extract a server-provided error message
    let serverMessage = `HTTP ${response.status}: ${response.statusText}`
    try {
      const ct = response.headers.get("content-type") ?? ""
      if (ct.includes("application/json")) {
        const body = await response.json()
        serverMessage = body?.message || body?.error || serverMessage
      }
    } catch {
      // ignore
    }

    const type = mapStatusToErrorType(response.status)

    // Trigger global unauthorized handler without a circular import
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zetime:unauthorized"))
    }

    throw new RequestError(serverMessage, type, response.status)
  }

  // Parse JSON body
  try {
    return (await response.json()) as T
  } catch {
    throw new RequestError(
      `Could not parse JSON response from ${url}`,
      "parse",
      response.status,
    )
  }
}

function mapStatusToErrorType(
  status: number,
): RequestError["type"] {
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  if (status === 404) return "not_found"
  if (status >= 500) return "server"
  if (status >= 400) return "client"
  return "unknown"
}

/** Human-readable message for a RequestError suitable for display in the UI. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof RequestError) {
    switch (error.type) {
      case "offline":
        return "You appear to be offline. Please check your connection."
      case "timeout":
        return "The server took too long to respond. Please try again."
      case "unauthorized":
        return "Your session has expired. Please sign in again."
      case "forbidden":
        return "You don't have permission to access this resource."
      case "not_found":
        return "The requested data could not be found."
      case "server":
        return error.message || "A server error occurred. Please try again later."
      case "client":
        return error.message || "Invalid request. Please check your inputs."
      case "parse":
        return "Received an unexpected response from the server."
      default:
        return error.message || "An unexpected error occurred."
    }
  }
  if (error instanceof Error) return error.message
  return "An unexpected error occurred."
}

/** True if the error is known to be an offline condition. */
export function isOfflineError(error: unknown): boolean {
  return error instanceof RequestError && error.type === "offline"
}

/** True if the error is a timeout. */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof RequestError && error.type === "timeout"
}
