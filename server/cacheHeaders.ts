import type { RequestHandler } from "express";

export const setCacheHeaders: RequestHandler = (req, res, next) => {
  const path = req.path;

  if (path.startsWith('/api/')) {
    if (path.includes('/summary/') || path.includes('/analytics')) {
      res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    } else if (path.includes('/organizers') || path.includes('/tracks')) {
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    } else if (path.includes('/weather')) {
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
    } else if (req.method === 'GET') {
      res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    } else {
      res.set('Cache-Control', 'no-store');
    }
  }

  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');

  next();
};
