import { TRPCError } from "@trpc/server";
import { getRateLimit, createOrUpdateRateLimit, resetRateLimit } from "./db";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  signup: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 per hour
  login: { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 per 15 minutes
  forgot_password: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour
  reset_password: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 per hour
};

/**
 * Check if a request should be rate limited
 * @param identifier - IP address or user ID
 * @param endpoint - Endpoint name (signup, login, etc.)
 * @returns true if rate limit exceeded, false otherwise
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string
): Promise<boolean> {
  const config = RATE_LIMIT_CONFIGS[endpoint];
  if (!config) {
    // No rate limit configured for this endpoint
    return false;
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  const existingLimit = await getRateLimit(identifier, endpoint);

  if (!existingLimit) {
    // First request, create new rate limit entry
    await createOrUpdateRateLimit(identifier, endpoint, now);
    return false;
  }

  // Check if we're still in the same window
  const limitWindowStart = new Date(existingLimit.windowStart);
  const isInSameWindow = limitWindowStart.getTime() > windowStart.getTime();

  if (isInSameWindow) {
    // Still in the same window, check if limit exceeded
    if (existingLimit.requestCount >= config.maxRequests) {
      return true; // Rate limit exceeded
    }
    // Increment counter
    await createOrUpdateRateLimit(identifier, endpoint, limitWindowStart);
    return false;
  } else {
    // New window, reset counter
    await resetRateLimit(identifier, endpoint, now);
    return false;
  }
}

/**
 * Middleware to enforce rate limiting on tRPC procedures
 */
export async function enforceRateLimit(
  identifier: string,
  endpoint: string
): Promise<void> {
  const isLimited = await checkRateLimit(identifier, endpoint);
  
  if (isLimited) {
    const config = RATE_LIMIT_CONFIGS[endpoint];
    const minutesRemaining = Math.ceil(config.windowMs / 60000);
    
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many requests. Please try again in ${minutesRemaining} minutes.`,
    });
  }
}

/**
 * Get client IP address from request
 */
export function getClientIp(req: any): string {
  // Check various headers for the real IP
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return typeof forwarded === "string" ? forwarded.split(",")[0].trim() : forwarded[0];
  }
  
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return typeof realIp === "string" ? realIp : realIp[0];
  }
  
  return req.ip || req.connection?.remoteAddress || "unknown";
}
