# Trackday Planner

## Overview
Trackday Planner is a full-stack web application designed for motorsport enthusiasts to comprehensively plan, track, and analyze their yearly track days. It offers tools for managing events, expenses, budgets, vehicles, maintenance, routes, weather, and lap times. The application's core purpose is to organize track day calendars, monitor spending, calculate travel costs, track vehicle maintenance, and analyze performance.

The project has recently completed significant features including a robust Maintenance Planning System (backend, frontend, security, analytics, task generation), an Interactive Track Info Panel, and a Marketplace for buying/selling motorsport-related items. Scalability and performance have been enhanced through database indexing, pagination, a centralized API client with robust error handling, weather cache improvements, and rate limiting.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18+ with TypeScript, functional components, and hooks.
- **Routing:** Wouter for client-side navigation.
- **State Management:** TanStack Query for server state, React Hook Form with Zod for form state.
- **UI:** Radix UI primitives with shadcn/ui styling ("new-york" style, neutral base color, CVA for variants, CSS variables for theming, light/dark mode).
- **Styling:** TailwindCSS (custom config), inspired by Linear/Notion, Material Design principles, custom HSL color system, Inter/IBM Plex Sans fonts, 2-24 spacing primitives, 12-column responsive grid.
- **Build Tool:** Vite with React plugin, custom path aliases.

### Backend
- **Runtime:** Node.js with Express.js.
- **Language:** TypeScript with ES modules.
- **API Design:** RESTful API (GET, POST, PATCH, DELETE), prefixed with `/api/`.
- **Middleware:** `express.json()`, `express.urlencoded()`, custom logging.
- **Security:** Comprehensive authorization on all maintenance planning routes, user ownership checks, and `isAuthenticated` middleware.
- **Core Services:** TriggerProcessor (for maintenance task generation), NotificationCoordinator (for email notifications).

### Data Storage
- **Database:** PostgreSQL via Neon serverless driver.
- **ORM:** Drizzle ORM with Zod schema integration (schema-first, shared via `shared/schema.ts`, migrations).
- **Key Data Models:** `users`, `sessions`, `organizers`, `tracks`, `trackdays`, `cost_items`, `vehicles`, `maintenance_logs`, `trackday_schedule_blocks`, `track_sessions`, `laps`, `settings`, `weather_cache`, `marketplace_listings`.
- **Storage Interface:** Abstract `IStorage` interface for CRUD operations.

### Authentication & Authorization
- **Authentication System:** Replit Auth (OpenID Connect: Google, GitHub, email/password).
- **Session Management:** PostgreSQL-backed sessions (`connect-pg-simple`), 7-day TTL, secure cookies.
- **Implementation:** `server/replitAuth.ts` for OAuth setup, login/logout/callback routes.
- **API Endpoints:** `/api/login`, `/api/callback`, `/api/logout`, `/api/auth/user`.

### System Design Choices
- **Monorepo Structure:** `/client`, `/server`, `/shared` for type safety.
- **Type Safety:** Zod schemas for runtime validation and TypeScript types; `drizzle-zod` for database schema validation.
- **API Response Handling:** `apiRequest()` wrapper for error handling and toast notifications.
- **Cost Tracking:** Costs stored in cents; auto-generated travel costs flagged.
- **Performance:** Weather caching, React Query, skeleton loaders, database indexing, pagination.
- **Responsive Design:** Mobile-first, collapsible sidebar, breakpoint-aware grid, sticky header.
- **Maintenance Planning System:** Implements a task lifecycle state machine, email service with adapter pattern, and trigger processing for various cadences (trackday, time_interval, odometer, engine_hours).
- **Marketplace:** Classifieds-style with no payment processing, 60-day listing expiry, public read access, authenticated creation/management.

## External Dependencies

### Mapping & Routing
- **Primary:** Google Maps Directions API.
- **Secondary:** OpenRouteService API.
- **Fallback:** Haversine distance calculation.

### Weather Forecasting
- OpenWeather API.

### Charts & Visualization
- **Charts:** Recharts for data visualization.
- **Mapping:** Leaflet-based map visualization (`MapView` component).

### UI Icons
- Lucide React for iconography.

### Date Handling
- `date-fns` for formatting and operations.

### Email Service
- Configurable email provider (e.g., Resend/Postmark/SendGrid) for notifications.

### Authentication Provider
- Replit Auth (OpenID Connect compatible for Google, GitHub).

### User Onboarding
- **Tutorial System:** Driver.js-based interactive tours for key features.

## User Onboarding & Tutorial System

### Architecture
- **Framework:** Driver.js (lightweight, framework-agnostic tour library)
- **Provider:** TutorialProvider context at top level (client/src/components/tutorial-provider.tsx)
- **Configuration:** Centralized tour definitions in client/src/lib/tutorials.ts
- **Storage:** localStorage with key `trackday-tutorials.completed` for tracking completed tours
- **Triggering:** Manual via Tutorial buttons on pages (HelpCircle icon, outline variant, small size)

### Available Tours
1. **Booking Tour** (id: 'booking')
   - 4 steps covering organizer discovery, trackday viewing, and booking workflow
   - Triggered by button on /booking page (data-testid="button-booking-tutorial")

2. **Maintenance Plans Tour** (id: 'maintenance-plans')
   - 5 steps explaining plan creation, assignment, and automated task generation
   - Triggered by button on /maintenance-plans page (data-testid="button-maintenance-tutorial")

3. **Maintenance Tasks Tour** (id: 'maintenance-tasks', planned)
   - 5 steps covering task generation, filtering, completion, and snoozing
   - Implementation pending

### Driver.js Integration
- **Theme:** Custom CSS in client/src/index.css with class `.trackday-tutorial-popover`
- **Config:** showProgress=true, navigation buttons enabled, overlay with animations
- **UI Elements:** Progress indicators ("1 of 4"), navigation ("Next →", "← Back", "Done!"), close button ("×")
- **Behavior:** Spotlight effect on highlighted elements, semi-transparent overlay, localStorage persistence

### Design Compliance
- No emoji usage (strict adherence to design guidelines)
- Matches Trackday Planner HSL color system, spacing, and typography
- Responsive and accessible with keyboard navigation support

### Implementation Notes
- Tours can be replayed by clicking Tutorial button again
- Gracefully handles missing elements (dynamic content not yet loaded)
- Non-blocking: users can close tours at any time
- MVP scope: Manual triggers only, no auto-play on first visit

## Recent Scalability Improvements

### Phase 1: Database & API Infrastructure (Completed)
**Phase 1.1 - Database Indexing:**
- Added 20+ indexes on frequently-queried columns (foreign keys, status fields, userId filters)
- Significantly reduced query times for trackdays, cost items, vehicles, maintenance tasks, and marketplace listings

**Phase 1.2 - Pagination Infrastructure:**
- Implemented limit/offset pagination on all major list endpoints
- Default 50 items per page, max 100 to prevent memory issues
- Returns total count for client-side pagination UI

**Phase 1.3 - Centralized API Client:**
- Created `server/apiClient.ts` with exponential backoff retry logic (3 retries, 1s-4s delays)
- Implemented circuit breaker pattern (5 failures threshold, 60s recovery)
- Standardized error handling with AbortSignal support for timeout management
- Used for weather API, routing API calls

**Phase 1.4 - Weather Cache Improvements:**
- Added TTL to weather cache entries (6-hour freshness window)
- Automatic cleanup of stale entries (>30 days old, runs every 24h)
- Graceful degradation: serves stale data when API fails, mock data only when cache empty

**Phase 1.5 - Rate Limiting:**
- Global rate limiter: 100 req/15min per IP
- Auth rate limiter: 10 req/15min for login/logout/callback
- Marketplace rate limiter: 20 req/15min for public endpoints
- Weather rate limiter: 30 req/15min for weather queries
- Returns 429 status with Retry-After headers, structured logging

### Phase 2: Caching & Performance (In Progress)
**Phase 2.1 - Analytics Caching (Completed):**
- Implemented per-user in-memory cache for expensive analytics queries
- Cache Types:
  - `maintenanceAnalytics`: Aggregate statistics (total tasks, completion rate, priority breakdown)
  - `enrichedTasks`: Full task list with vehicle/plan/checklist details
- TTL: 5 minutes (balances freshness vs. performance)
- Structured logging: JSON format with cache hits/misses/invalidations
- Invalidation: Immediate on all maintenance/vehicle/plan mutations
- Periodic cleanup: 15-minute interval removes expired entries
- Performance: Reduces analytics endpoint from O(vehicles × tasks) to O(1) on cache hit

**Phase 2.2 - Error Handling (Completed):**
- Created centralized error handling system (`server/errorHandler.ts`)
- Custom error classes: AppError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, ExternalServiceError, DatabaseError
- Standardized error response format with requestId, code, message, timestamp
- Request ID middleware for error correlation across logs and responses
- Structured JSON logging (WARN for 4xx, ERROR with stack for 5xx)
- `asyncHandler` wrapper eliminates try-catch boilerplate
- Security: Sanitized user-friendly error messages, internal details only logged server-side
- PostgreSQL constraint errors (23xxx) automatically translated to user-friendly messages
- Zod validation errors formatted with field-level details
- 404 handler properly integrated with error middleware
- Pattern demonstrated across 5 sample routes (organizers, auth)

**Phase 2.3 - Structured Logging (Completed):**
- Created centralized logger utility (`server/logger.ts`) with JSON output
- Log levels: debug, info, warn, error with environment-aware filtering
- Component tagging system for all logs (http, errorHandler, analyticsCache, weatherCache, maintenance, etc.)
- Specialized methods: `http()` for HTTP telemetry, `business()` for business events
- Migrated all production code paths to structured logging:
  - HTTP request/response logging with requestId, userId, method, path, statusCode, durationMs
  - Error handler with stack traces, dbError details, correlation tracking
  - Analytics cache with hits/misses/invalidations
  - Weather cache with cleanup operations
  - Maintenance services (triggerProcessor, taskAutoComplete, objectStorage)
  - Seed scripts and business event logging
- Framework logging (vite.ts) and mock providers (emailService.ts) intentionally use console for visibility
- All logs emit structured JSON with timestamp, level, message, component, and contextual metadata
- Production-ready observability foundation for monitoring and debugging

### Phase 3: Retention & Monitoring (Pending)
**Phase 3.1 - Data Retention:**
- Automated archival for old trackday/marketplace data

**Phase 3.2 - Advanced Monitoring:**
- Health checks and metrics collection

**Phase 3.3 - Queue-Based Retry:**
- Retry system for failed operations