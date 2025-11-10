# Trackday Planner

## Overview
Trackday Planner is a full-stack web application designed for motorsport enthusiasts to plan, track, and analyze their yearly track days. It provides tools for managing events, expenses, budgets, vehicles, maintenance, routes, weather, and lap times. The application aims to organize track day calendars, monitor spending, calculate travel costs, track vehicle maintenance, and analyze performance. Recent enhancements include a Maintenance Planning System, an Interactive Track Info Panel, a Marketplace, and an enhanced Trackday Calendar. Scalability and performance have been improved through database indexing, pagination, a centralized API client, weather cache improvements, and rate limiting.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18+ with TypeScript, functional components, and hooks.
- **Routing:** Wouter.
- **State Management:** TanStack Query for server state, React Hook Form with Zod for form state.
- **UI:** Radix UI primitives with shadcn/ui styling ("new-york" style, neutral base, CVA for variants, CSS variables for theming, light/dark mode).
- **Styling:** TailwindCSS (custom config), inspired by Linear/Notion, Material Design principles, custom HSL color system, Inter/IBM Plex Sans fonts, 2-24 spacing primitives, 12-column responsive grid.
- **Build Tool:** Vite.

### Backend
- **Runtime:** Node.js with Express.js.
- **Language:** TypeScript with ES modules.
- **API Design:** RESTful API (`/api/` prefix).
- **Security:** Comprehensive authorization, user ownership checks, `isAuthenticated` middleware.
- **Core Services:** TriggerProcessor (maintenance task generation), NotificationCoordinator (email notifications).

### Data Storage
- **Database:** PostgreSQL via Neon serverless driver.
- **ORM:** Drizzle ORM with Zod schema integration.
- **Key Data Models:** `users`, `sessions`, `organizers`, `tracks`, `trackdays`, `cost_items`, `vehicles`, `maintenance_logs`, `trackday_schedule_blocks`, `track_sessions`, `laps`, `settings`, `weather_cache`, `marketplace_listings`.

### Authentication & Authorization
- **Authentication System:** Replit Auth (OpenID Connect: Google, GitHub, email/password).
- **Session Management:** PostgreSQL-backed sessions (`connect-pg-simple`), 7-day TTL, secure cookies.

### System Design Choices
- **Monorepo Structure:** `/client`, `/server`, `/shared` for type safety.
- **Type Safety:** Zod schemas for runtime validation and TypeScript types; `drizzle-zod` for database schema validation.
- **API Response Handling:** `apiRequest()` wrapper for error handling and toast notifications.
- **Cost Tracking:** Costs stored in cents; auto-generated travel costs flagged.
- **Performance:** Weather caching, React Query, skeleton loaders, database indexing, pagination, response compression, HTTP cache headers, LRU cache.
- **Responsive Design:** Mobile-first, collapsible sidebar, breakpoint-aware grid, sticky header.
- **Maintenance Planning System:** Task lifecycle state machine, email service with adapter pattern, trigger processing for various cadences.
- **Marketplace:** Classifieds-style, no payment processing, 60-day listing expiry, public read access, authenticated creation/management.
- **Error Handling:** Centralized system with custom error classes, standardized error response format, structured JSON logging.
- **Structured Logging:** Centralized logger utility with JSON output, log levels, component tagging, specialized methods for HTTP telemetry and business events.
- **Query Optimization:** Utilities for batch inserts/updates and generic TTL-based query caching.
- **User Onboarding:** Driver.js-based interactive tours for key features.
- **Trackday Calendar:** Supports `startDate` + `endDate` for multi-day events, month/year views, integration with maintenance tasks, and dynamic empty state messages.
- **Single Source of Truth (SSOT):** Trackday duration is computed on-the-fly from `startDate` and `endDate` using `calculateDurationDays()` utility (`shared/utils.ts`). The `durationDays` field is not persisted in the database but is added to all API responses via the `addDurationDays()` helper in the storage layer. This eliminates data duplication and ensures dates are the canonical source of truth. Uses `parseISO()` from `date-fns` to avoid timezone drift.

## External Dependencies

### Mapping & Routing
- Google Maps Directions API.
- OpenRouteService API.

### Weather Forecasting
- OpenWeather API.

### Charts & Visualization
- Recharts.
- Leaflet-based map visualization.

### UI Icons
- Lucide React.

### Date Handling
- `date-fns`.

### Email Service
- Configurable email provider (e.g., Resend/Postmark/SendGrid).

### Authentication Provider
- Replit Auth (OpenID Connect compatible for Google, GitHub).

### User Onboarding
- Driver.js.