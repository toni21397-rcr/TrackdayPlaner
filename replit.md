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

**Phase 2.2 - Error Handling (Pending):**
- Expand error handling across all routes with recovery patterns
- Implement proper error responses with user-friendly messages

**Phase 2.3 - Structured Logging (Pending):**
- Implement observability across all services
- Add structured logs for debugging and monitoring

### Phase 3: Retention & Monitoring (Pending)
**Phase 3.1 - Data Retention:**
- Automated archival for old trackday/marketplace data

**Phase 3.2 - Advanced Monitoring:**
- Health checks and metrics collection

**Phase 3.3 - Queue-Based Retry:**
- Retry system for failed operations