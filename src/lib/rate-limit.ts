/**
 * A simple in-memory rate limiter.
 * Note: In a production environment with multiple server instances, 
 * you should use a distributed store like Redis (e.g., Upstash).
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export interface RateLimitOptions {
  limit: number;      // Maximum number of requests
  windowMs: number;  // Time window in milliseconds
}

/**
 * Checks if a request should be rate limited.
 * @param identifier A unique identifier for the user (e.g., IP address or user ID)
 * @param options Rate limit configuration
 * @returns Object containing whether the request is allowed and remaining attempts
 */
export function rateLimit(identifier: string, options: RateLimitOptions) {
  const now = Date.now();
  const record = store[identifier];

  if (!record || now > record.resetTime) {
    // New record or expired window
    store[identifier] = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    return {
      success: true,
      remaining: options.limit - 1,
      reset: store[identifier].resetTime,
    };
  }

  if (record.count >= options.limit) {
    // Limit exceeded
    return {
      success: false,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  // Increment count
  record.count += 1;
  return {
    success: true,
    remaining: options.limit - record.count,
    reset: record.resetTime,
  };
}

/**
 * Utility to get client IP from headers (Next.js specific)
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return 'unknown';
}
