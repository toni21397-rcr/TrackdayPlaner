import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startPeriodicCleanup } from "./weatherCacheMaintenance";
import { startAnalyticsCacheCleanup } from "./analyticsCache";
import { globalRateLimiter } from "./rateLimiting";
import { errorHandler, notFoundHandler } from "./errorHandler";
import { logger } from "./logger";
import { randomBytes } from "crypto";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use((req: any, _res, next) => {
  req.requestId = randomBytes(16).toString('hex');
  next();
});

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use(globalRateLimiter);

app.use((req: any, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    
    if (req.path.startsWith("/api")) {
      const metadata: Record<string, any> = {
        requestId: req.requestId,
        userId: req.user?.claims?.sub,
        contentLength: res.get('content-length'),
        userAgent: req.get('user-agent'),
      };

      if (req.query && Object.keys(req.query).length > 0) {
        metadata.queryParams = Object.keys(req.query).length;
      }

      logger.http(req.method, req.path, res.statusCode, durationMs, metadata);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Handle 404s for API routes only (before Vite catch-all)
  app.use('/api', notFoundHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Error handler must be last
  app.use(errorHandler);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    startPeriodicCleanup();
    startAnalyticsCacheCleanup();
  });
})();
