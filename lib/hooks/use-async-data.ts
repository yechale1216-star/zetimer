"use client"

/**
 * use-async-data.ts
 * ─────────────────
 * Universal hook for any remote data-fetching concern.
 *
 * Features:
 *  ✓ Distinct states: loading | success | empty | error
 *  ✓ Error type awareness (offline / timeout / server / unauthorized)
 *  ✓ Race-condition-free (AbortController cancels stale requests)
 *  ✓ Configurable minimum loading time (avoids flash)
 *  ✓ Background refresh (data stays visible while re-fetching)
 *  ✓ Automatic retry with exponential back-off (optional)
 *  ✓ Online recovery: auto re-fetches when connection restored
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { getErrorMessage, isOfflineError, RequestError } from "@/lib/utils/fetch-with-timeout"

// ─── Types ────────────────────────────────────────────────────────────────────

export type AsyncStatus = "idle" | "loading" | "success" | "error"

export interface AsyncState<T> {
  data: T | null
  /** True only while the very first load is in-flight (no data shown yet). */
  isLoading: boolean
  /** True while a background refresh is in-flight (data is still showing). */
  isRefreshing: boolean
  /** Human-readable error string from the last failed fetch. */
  error: string | null
  errorType: RequestError["type"] | null
  status: AsyncStatus
  /** Convenience flag: data was fetched but the array / object is empty. */
  isEmpty: boolean
}

export interface UseAsyncDataOptions<T> {
  /** Function that performs the async fetch. Must throw on failure. */
  fetcher: (signal: AbortSignal) => Promise<T>
  /**
   * Determines if the fetched data should be considered "empty".
   * Defaults to `Array.isArray(data) && data.length === 0` or `data == null`.
   */
  isEmpty?: (data: T) => boolean
  /**
   * Dependencies that trigger a fresh load when they change.
   * Behaves identically to `useEffect` dep array — include all reactive values
   * used inside `fetcher`.
   */
  deps?: readonly unknown[]
  /** Don't start fetching until this is true (e.g. wait for user to be loaded). */
  enabled?: boolean
  /** Minimum milliseconds to show the loading skeleton (avoids flash). Default 0. */
  minLoadingMs?: number
  /** Milliseconds between automatic background polls. 0 = disabled. */
  pollIntervalMs?: number
  /** Number of automatic retries on failure (default 0 = no auto-retry). */
  maxRetries?: number
  /** If true, re-fetch automatically when the browser comes back online. */
  retryOnReconnect?: boolean
}

/** Returned tuple: [state, manualRefetch] */
export type UseAsyncDataReturn<T> = [AsyncState<T>, () => void]

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAsyncData<T>(
  options: UseAsyncDataOptions<T>,
): UseAsyncDataReturn<T> {
  const {
    fetcher,
    isEmpty: isEmptyFn,
    deps = [],
    enabled = true,
    minLoadingMs = 0,
    pollIntervalMs = 0,
    maxRetries = 0,
    retryOnReconnect = true,
  } = options

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: false,
    isRefreshing: false,
    error: null,
    errorType: null,
    status: "idle",
    isEmpty: false,
  })

  // Tracks how many times we've retried after a failure
  const retriesRef = useRef(0)
  // Used to cancel in-flight requests on dep change or unmount
  const abortRef = useRef<AbortController | null>(null)
  // Monotonically increasing fetch generation — stale responses are dropped
  const genRef = useRef(0)

  const computeIsEmpty = useCallback(
    (data: T): boolean => {
      if (isEmptyFn) return isEmptyFn(data)
      if (Array.isArray(data)) return data.length === 0
      return data == null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEmptyFn],
  )

  const execute = useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
      if (!enabled) return

      // Cancel any in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const gen = ++genRef.current

      const startTime = Date.now()

      setState((prev) => {
        if (background) {
          return { ...prev, isRefreshing: true }
        }
        return {
          ...prev,
          isLoading: prev.data == null,
          isRefreshing: prev.data != null,
          error: null,
          errorType: null,
          status: "loading",
        }
      })

      try {
        const result = await fetcher(controller.signal)

        if (gen !== genRef.current) return // stale — discard

        const elapsed = Date.now() - startTime
        if (!background && minLoadingMs > elapsed) {
          await new Promise((r) => setTimeout(r, minLoadingMs - elapsed))
        }

        retriesRef.current = 0 // reset retry counter on success

        setState({
          data: result,
          isLoading: false,
          isRefreshing: false,
          error: null,
          errorType: null,
          status: "success",
          isEmpty: computeIsEmpty(result),
        })
      } catch (err: unknown) {
        if (gen !== genRef.current) return // stale

        // AbortError is expected on component unmount / dep change — don't show an error
        if ((err as any)?.name === "AbortError") return

        const message = getErrorMessage(err)
        const errType =
          err instanceof RequestError ? err.type : ("unknown" as const)

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          error: message,
          errorType: errType,
          status: "error",
        }))

        // Auto-retry with exponential back-off
        if (retriesRef.current < maxRetries) {
          const delay = Math.min(1000 * 2 ** retriesRef.current, 16000)
          retriesRef.current++
          setTimeout(() => execute({ background: false }), delay)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, fetcher, computeIsEmpty, minLoadingMs, maxRetries, ...deps],
  )

  // Initial load and dep-change load
  useEffect(() => {
    if (!enabled) return
    execute()
    return () => {
      abortRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  // Background polling
  useEffect(() => {
    if (!pollIntervalMs || !enabled) return
    const id = setInterval(() => execute({ background: true }), pollIntervalMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollIntervalMs, enabled, ...deps])

  // Re-fetch on network reconnection
  useEffect(() => {
    if (!retryOnReconnect) return
    const handler = () => {
      if (enabled) execute({ background: state.data != null })
    }
    window.addEventListener("online", handler)
    return () => window.removeEventListener("online", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryOnReconnect, enabled, state.data != null])

  const manualRefetch = useCallback(() => execute(), [execute])

  return [state, manualRefetch]
}
