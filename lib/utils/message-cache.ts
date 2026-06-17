"use client"

/**
 * Telegram-style offline message cache using IndexedDB.
 * 
 * Messages are persisted per-conversation in IndexedDB so they survive
 * page reloads, browser restarts, and offline periods.
 * 
 * Conversations list is also cached for instant sidebar rendering.
 */

const DB_NAME = "zetimer_messages"
const DB_VERSION = 1
const MESSAGES_STORE = "messages"        // key: conversationId, value: { conversationId, messages[], updatedAt }
const CONVERSATIONS_STORE = "conversations" // key: 'sidebar', value: { id, items[], updatedAt }

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        db.createObjectStore(MESSAGES_STORE, { keyPath: "conversationId" })
      }

      if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
        db.createObjectStore(CONVERSATIONS_STORE, { keyPath: "id" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      console.error("[MessageCache] Failed to open IndexedDB:", request.error)
      dbPromise = null
      reject(request.error)
    }
  })

  return dbPromise
}

// ─── Messages ───────────────────────────────────────────────────────────────

/**
 * Save messages for a conversation to IndexedDB.
 * Called after fetching from server or receiving new messages via socket.
 */
export async function cacheMessages(conversationId: string, messages: any[]): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(MESSAGES_STORE, "readwrite")
    const store = tx.objectStore(MESSAGES_STORE)

    store.put({
      conversationId,
      messages,
      updatedAt: Date.now(),
    })

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn("[MessageCache] Failed to cache messages:", err)
  }
}

/**
 * Load cached messages for a conversation from IndexedDB.
 * Returns null if no cache exists.
 */
export async function getCachedMessages(conversationId: string): Promise<any[] | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(MESSAGES_STORE, "readonly")
    const store = tx.objectStore(MESSAGES_STORE)

    return new Promise((resolve, reject) => {
      const request = store.get(conversationId)
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.messages : null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn("[MessageCache] Failed to read cached messages:", err)
    return null
  }
}

/**
 * Append a single message to an existing conversation cache.
 * Used for real-time socket messages so we don't re-write the whole array.
 */
export async function appendCachedMessage(conversationId: string, message: any): Promise<void> {
  try {
    const existing = await getCachedMessages(conversationId)
    if (!existing) {
      // No cache yet — start one
      await cacheMessages(conversationId, [message])
      return
    }

    // Deduplicate by id
    if (existing.some((m: any) => m.id === message.id)) return

    await cacheMessages(conversationId, [...existing, message])
  } catch (err) {
    console.warn("[MessageCache] Failed to append cached message:", err)
  }
}

/**
 * Update a single message in the cache (for edits, deletes, reactions, read status).
 */
export async function updateCachedMessage(
  conversationId: string,
  messageId: string,
  updater: (msg: any) => any
): Promise<void> {
  try {
    const existing = await getCachedMessages(conversationId)
    if (!existing) return

    const updated = existing.map((m: any) => (m.id === messageId ? updater(m) : m))
    await cacheMessages(conversationId, updated)
  } catch (err) {
    console.warn("[MessageCache] Failed to update cached message:", err)
  }
}

// ─── Conversations (Sidebar) ────────────────────────────────────────────────

/**
 * Cache the conversations/sidebar list for offline access.
 */
export async function cacheConversations(items: any[]): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(CONVERSATIONS_STORE, "readwrite")
    const store = tx.objectStore(CONVERSATIONS_STORE)

    store.put({
      id: "sidebar",
      items,
      updatedAt: Date.now(),
    })

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn("[MessageCache] Failed to cache conversations:", err)
  }
}

/**
 * Load cached conversations list from IndexedDB.
 * Returns null if no cache exists.
 */
export async function getCachedConversations(): Promise<any[] | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(CONVERSATIONS_STORE, "readonly")
    const store = tx.objectStore(CONVERSATIONS_STORE)

    return new Promise((resolve, reject) => {
      const request = store.get("sidebar")
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.items : null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn("[MessageCache] Failed to read cached conversations:", err)
    return null
  }
}

/**
 * Clear all cached data (e.g. on logout).
 */
export async function clearMessageCache(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction([MESSAGES_STORE, CONVERSATIONS_STORE], "readwrite")
    tx.objectStore(MESSAGES_STORE).clear()
    tx.objectStore(CONVERSATIONS_STORE).clear()

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })

    console.log("[MessageCache] Cache cleared")
  } catch (err) {
    console.warn("[MessageCache] Failed to clear cache:", err)
  }
}
