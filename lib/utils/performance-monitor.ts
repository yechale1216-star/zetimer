"use client"

/**
 * performance-monitor.ts
 * ──────────────────────
 * Lightweight client-side performance monitor for tracking:
 * - App startup time
 * - Screen load time
 * - API response times
 * - Cache hit / miss rates
 * - Slow operation warnings exceeding thresholds (default: 500ms)
 */

export interface Metric {
  name: string
  durationMs: number
  timestamp: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: Metric[] = []
  private cacheHits = 0
  private cacheMisses = 0
  private marks: Map<string, number> = new Map()
  private appStartTime: number = typeof window !== "undefined" ? performance.now() : 0

  constructor() {
    if (typeof window !== "undefined") {
      this.mark("app_init")
    }
  }

  /** Mark the start of an operation */
  mark(name: string) {
    if (typeof window === "undefined") return
    this.marks.set(name, performance.now())
  }

  /** End the mark and measure elapsed time */
  measure(name: string, metadata?: Record<string, any>): number {
    if (typeof window === "undefined") return 0
    const startTime = this.marks.get(name)
    const now = performance.now()
    const durationMs = startTime ? Math.round(now - startTime) : 0
    this.marks.delete(name)

    const metric: Metric = {
      name,
      durationMs,
      timestamp: Date.now(),
      metadata,
    }
    this.metrics.push(metric)

    // Keep metrics array bounded
    if (this.metrics.length > 500) {
      this.metrics.shift()
    }

    if (durationMs > 500 && process.env.NODE_ENV !== "production") {
      console.warn(
        `⚡ [PerfMonitor][SLOW OPERATION] ${name} took ${durationMs}ms`,
        metadata || ""
      )
    } else if (process.env.NODE_ENV !== "production") {
      console.log(`⚡ [PerfMonitor] ${name}: ${durationMs}ms`, metadata || "")
    }

    return durationMs
  }

  /** Record a completed API request timing */
  recordApiCall(url: string, durationMs: number, status: number) {
    this.metrics.push({
      name: `api:${url}`,
      durationMs,
      timestamp: Date.now(),
      metadata: { status },
    })

    if (durationMs > 800) {
      console.warn(`🐢 [PerfMonitor][SLOW API] ${url} took ${durationMs}ms (status ${status})`)
    }
  }

  /** Record cache hit or miss */
  recordCacheAccess(hit: boolean, key: string) {
    if (hit) {
      this.cacheHits++
    } else {
      this.cacheMisses++
    }
  }

  /** Get current cache hit rate statistics */
  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses
    const hitRate = total > 0 ? ((this.cacheHits / total) * 100).toFixed(1) + "%" : "0%"
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      total,
      hitRate,
    }
  }

  /** Measure time from initial script load to current moment */
  getAppStartupTime(): number {
    if (typeof window === "undefined") return 0
    return Math.round(performance.now() - this.appStartTime)
  }

  /** Return recent performance metrics */
  getRecentMetrics(count = 50): Metric[] {
    return this.metrics.slice(-count)
  }
}

export const perfMonitor = new PerformanceMonitor()
