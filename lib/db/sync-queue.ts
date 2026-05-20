"use client"

interface QueuedOperation {
  id: string
  type: "email" | "sms" | "data"
  data: any
  timestamp: number
  retries: number
}

const QUEUE_KEY = "sync_queue"
const MAX_RETRIES = 3

export class SyncQueue {
  private static instance: SyncQueue
  private queue: QueuedOperation[] = []
  private processing = false

  private constructor() {
    this.loadQueue()
  }

  static getInstance(): SyncQueue {
    if (!SyncQueue.instance) {
      SyncQueue.instance = new SyncQueue()
    }
    return SyncQueue.instance
  }

  private loadQueue() {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(QUEUE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
      }
    } catch (error) {
      console.error("Failed to load sync queue:", error)
    }
  }

  private saveQueue() {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue))
    } catch (error) {
      console.error("Failed to save sync queue:", error)
    }
  }

  add(type: QueuedOperation["type"], data: any): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const operation: QueuedOperation = {
      id,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    }
    this.queue.push(operation)
    this.saveQueue()
    return id
  }

  async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return
    if (!navigator.onLine) return

    this.processing = true

    const operation = this.queue[0]

    try {
      // Process based on type
      if (operation.type === "email" || operation.type === "sms") {
        // Attempt to send notification
        const response = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(operation.data),
        })

        if (!response.ok) throw new Error("Failed to send notification")
      }

      // Remove successful operation
      this.queue.shift()
      this.saveQueue()
    } catch (error) {
      console.error("Failed to process operation:", error)
      operation.retries++

      if (operation.retries >= MAX_RETRIES) {
        // Remove failed operation after max retries
        this.queue.shift()
      }

      this.saveQueue()
    } finally {
      this.processing = false

      // Process next item if available
      if (this.queue.length > 0) {
        setTimeout(() => this.process(), 1000)
      }
    }
  }

  getQueueLength(): number {
    return this.queue.length
  }

  clear(): void {
    this.queue = []
    this.saveQueue()
  }
}

export const syncQueue = typeof window !== "undefined" ? SyncQueue.getInstance() : null
