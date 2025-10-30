# Trackday Planner

## Overview
Trackday Planner is a full-stack web application for motorsport enthusiasts to plan, track, and analyze their yearly track days. It provides comprehensive tools for managing events, expenses, budgets, vehicles, maintenance, routes, weather, and lap times. The application aims to organize track day calendars, monitor spending, calculate travel costs, track vehicle maintenance, and analyze performance.

## Maintenance Planning System (In Development - October 2025)

**Status:** Backend infrastructure ~85% complete. Core scheduling, notifications, and security hardening fully implemented and production-ready.

**Completed Backend Infrastructure:**
- ✅ Database schema for 8 tables with proper foreign keys, indexes, and userId ownership
- ✅ Storage interface with complete CRUD operations
- ✅ Email service with adapter pattern, HMAC-signed action links, mock fallback
- ✅ Task lifecycle state machine (pending/due/snoozed/completed/dismissed)
- ✅ Auto-completion matching logic for maintenance logs
- ✅ **SECURED** API routes with comprehensive authorization on all endpoints
- ✅ **TriggerProcessor service**: Processes all 4 trigger types (trackday, time_interval, odometer, engine_hours) with correct cadence logic
- ✅ **NotificationCoordinator service**: Sends HMAC-signed email notifications with complete/snooze/dismiss action links
- ✅ Email action handler route with proper authorization
- ✅ Manual trigger processing and notification sending API endpoints
- ✅ Frontend page for maintenance plans management with sidebar navigation

**Security & Critical Fixes (October 30, 2025):**
- ✅ Authorization checks on ALL maintenance planning routes (plans, checklists, vehicle plans, tasks, lifecycle actions)
- ✅ Added vehicles.userId foreign key with cascade delete
- ✅ Filtered list endpoints now filter by ownership even without query filters
- ✅ Fixed schema issues (planId property names, occurredAt in task events)
- ✅ Trackday trigger cadence logic correctly counts only past/completed trackdays with proper edge case handling

**Authorization Pattern:** All routes follow: Load resource → Traverse ownership chain (task → vehiclePlan → vehicle → userId OR plan → ownerUserId) → Verify with canModifyResource() → Return 403 if unauthorized.

**Remaining Work:**
- 🔨 Add cadenceConfig validation to enforce consistency with cadenceType
- 🔨 Implement cron job scheduling for automated trigger processing
- 🔨 Configure production email provider (Resend/Postmark/SendGrid)
- 🔨 Create packing list generation/export
- 🔨 Add analytics endpoints
- 🔨 Complete frontend (vehicle plans assignment, task board, in-app nudges, notification preferences, analytics)
- 🔨 End-to-end testing

**Production Readiness:** Core API routes, scheduling service, and notification system are secure and production-ready. Remaining work focuses on cron automation, packing lists, analytics, and frontend components.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18+ with TypeScript, functional components, and hooks.
- **Routing:** Wouter for client-side navigation.
- **State Management:** TanStack Query for server state (caching enabled, background refetching disabled), React Hook Form with Zod for form state.
- **UI:** Radix UI primitives with shadcn/ui styling ("new-york" style, neutral base color, CVA for variants, CSS variables for theming, light/dark mode).
- **Styling:** TailwindCSS (custom config), inspired by Linear/Notion, Material Design principles, custom HSL color system, Inter/IBM Plex Sans fonts, 2-24 spacing primitives, 12-column responsive grid (md 768px, lg 1024px).
- **Build Tool:** Vite with React plugin, custom path aliases.

### Backend
- **Runtime:** Node.js with Express.js.
- **Language:** TypeScript with ES modules.
- **API Design:** RESTful API (GET, POST, PATCH, DELETE).
- **Middleware:** `express.json()`, `express.urlencoded()`, custom logging, Vite middleware for HMR in development.
- **Route Organization:** Centralized in `server/routes.ts`, prefixed with `/api/`.

### Data Storage
- **Database:** PostgreSQL via Neon serverless driver.
- **ORM:** Drizzle ORM with Zod schema integration (schema-first, shared via `shared/schema.ts`, migrations with drizzle-kit).
- **Key Data Models:** `users`, `sessions`, `organizers`, `tracks`, `trackdays`, `cost_items`, `vehicles`, `maintenance_logs`, `trackday_schedule_blocks`, `track_sessions`, `laps`, `settings`, `weather_cache`.
- **Storage Interface:** Abstract `IStorage` interface for CRUD operations.

### Authentication & Authorization
- **Authentication System:** Replit Auth (OpenID Connect: Google, GitHub, email/password).
- **Session Management:** PostgreSQL-backed sessions (`connect-pg-simple`), 7-day TTL, secure cookies.
- **Implementation:** `server/replitAuth.ts` for OAuth setup, login/logout/callback routes. `isAuthenticated` middleware for route protection.
- **Client:** `useAuth()` hook, `isUnauthorizedError()` utility.
- **API Endpoints:** `/api/login`, `/api/callback`, `/api/logout`, `/api/auth/user`.
- **Environment Variables:** `REPL_ID`, `SESSION_SECRET`, `DATABASE_URL`, `ISSUER_URL`.

### System Design Choices
- **Monorepo Structure:** `/client`, `/server`, `/shared` for type safety.
- **Type Safety:** Zod schemas for runtime validation and TypeScript types; `drizzle-zod` for database schema validation.
- **API Response Handling:** `apiRequest()` wrapper for error handling, toast notifications for mutations.
- **Cost Tracking:** Costs stored in cents; auto-generated travel costs flagged.
- **Performance:** Weather caching, React Query, skeleton loaders.
- **Responsive Design:** Mobile-first, collapsible sidebar, breakpoint-aware grid, sticky header.

## External Dependencies

### Mapping & Routing
- **Primary:** Google Maps Directions API (configurable via `GOOGLE_MAPS_API_KEY`).
- **Secondary:** OpenRouteService API (configurable via `OPENROUTE_SERVICE_KEY`).
- **Fallback:** Haversine distance calculation.
- **Features:** Distance, duration, fuel costs, toll estimates, Google Maps polyline decoding, mobile navigation integration (QR code generation, copy link, direct navigation).

### Trackday Booking
- **Functionality:** Dedicated `/booking` page listing tracks and organizer websites.
- **Booking Detail Page:** Split-screen layout with iframe for organizer website and quick-create form for trackdays (auto-populates track info, creates trackday with cost item).

### Organizer Management
- **Functionality:** `/organizers` page for CRUD operations on organizers (name, website, contact info).
- **Integration:** Organizers can be associated with tracks; manual override for track details.

### Weather Forecasting
- OpenWeather API (configurable via `OPEN_WEATHER_API_KEY`).
- 6-hour cache, mock data fallback.
- Weather data linked to trackday dates and GPS coordinates.

### Charts & Visualization
- **Charts:** Recharts for monthly spending bar charts.
- **Mapping:** Leaflet-based map visualization (`MapView` component) for route geometry.

### UI Icons
- Lucide React for consistent iconography.

### Date Handling
- `date-fns` for formatting and operations.