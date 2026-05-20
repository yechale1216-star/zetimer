import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Create rate limiter instance (requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)
const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
})

export const createRateLimiter = (keyPrefix: string, requests: number, window: string) => {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window as any),
    analytics: true,
    prefix: keyPrefix,
  })
}

// Specific rate limiters
export const apiRateLimiter = createRateLimiter("api", 100, "60 s") // 100 requests per minute
export const authRateLimiter = createRateLimiter("auth", 5, "15 m") // 5 attempts per 15 minutes
