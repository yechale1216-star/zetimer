const CACHE_NAME = "attendance-tracker-v2"
const STATIC_CACHE = "static-v2"
const DYNAMIC_CACHE = "dynamic-v2"
const IMAGE_CACHE = "images-v2"

const STATIC_ASSETS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png", "/offline.html"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        return self.skipWaiting()
      }),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== IMAGE_CACHE) {
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        return self.clients.claim()
      }),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith("http")) {
    return
  }

  // Skip Next.js internal chunks to prevent caching stale assets
  if (url.pathname.includes("/_next/") || url.pathname.includes("/turbopack-")) {
    event.respondWith(fetch(request))
    return
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(() => {
          // Return cached version or offline page
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match("/offline.html")
          })
        }),
    )
    return
  }

  // Handle image requests
  if (request.destination === "image") {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((response) => {
          // Cache images for offline use
          const responseClone = response.clone()
          caches.open(IMAGE_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
      }),
    )
    return
  }

  // Handle all other requests (CSS, fonts, etc.) - but NOT JS chunks
  // Skip caching script files to prevent stale module issues
  if (request.destination === "script") {
    event.respondWith(fetch(request))
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update in background
        fetch(request)
          .then((response) => {
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, response)
            })
          })
          .catch(() => {})
        return cachedResponse
      }

      // Fetch from network and cache
      return fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Return offline page for failed requests
          return caches.match("/offline.html")
        })
    }),
  )
})

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
      }),
    )
  }
})
