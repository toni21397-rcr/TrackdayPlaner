import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { Request, Response } from "express";

interface RateLimitExceededInfo {
  endpoint: string;
  ip: string;
  retryAfter: number;
  remaining: number;
}

const logRateLimitExceeded = (info: RateLimitExceededInfo) => {
  const log = {
    event: "rateLimitExceeded",
    endpoint: info.endpoint,
    ip: info.ip,
    retryAfterSeconds: info.retryAfter,
    remaining: info.remaining,
  };
  console.log(JSON.stringify(log));
};

const standardHandler = (req: Request, res: Response) => {
  const rateLimit = (req as any).rateLimit;
  const resetTime = rateLimit?.resetTime || new Date(Date.now() + 60000);
  const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
  
  logRateLimitExceeded({
    endpoint: req.path,
    ip: req.ip ?? "unknown",
    retryAfter,
    remaining: rateLimit?.remaining ?? 0,
  });

  res.set("Retry-After", String(retryAfter));
  res.status(429).json({
    error: "Too many requests",
    retryAfter,
    message: "You have exceeded the rate limit. Please try again later.",
  });
};

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler,
  skip: (req) => {
    // Skip rate limiting for:
    // 1. Auth endpoints (to prevent login issues)
    // 2. All non-API routes (frontend assets, Vite HMR, etc.)
    const authPaths = ["/api/health", "/api/auth/user", "/api/login", "/api/callback", "/api/logout"];
    return authPaths.includes(req.path) || !req.path.startsWith('/api/');
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler,
});

export const weatherRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler,
});

export const externalApiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler,
});
