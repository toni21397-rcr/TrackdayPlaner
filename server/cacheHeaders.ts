import type { RequestHandler } from "express";

export const setCacheHeaders: RequestHandler = (req, res, next) => {
  const path = req.path;

  if (path.startsWith('/api/')) {
    if (path.includes('/weather')) {
      res.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
    } else if (req.method === 'GET') {
      res.set('Cache-Control', 'private, no-cache, must-revalidate');
      res.set('Vary', 'Cookie');
    } else {
      res.set('Cache-Control', 'no-store');
    }
  }

  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');

  next();
};
