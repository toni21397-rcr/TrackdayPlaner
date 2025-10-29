# Trackday Planner

## Overview

Trackday Planner is a full-stack web application designed to help users plan, track, and analyze their yearly track days. The application manages events, costs, budgets, vehicles, maintenance, routes, weather forecasts, and lap times. It provides comprehensive dashboards with KPI cards, budget tracking, monthly spending charts, and detailed event management.

**Core Purpose:** Enable motorsport enthusiasts to organize their track day calendar, monitor expenses against budgets, calculate travel costs with route planning, track vehicle maintenance, and analyze performance through lap time data.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React 18+ with TypeScript, using functional components and hooks throughout.

**Routing:** Wouter - A lightweight client-side routing solution providing navigation between dashboard, trackdays, tracks, vehicles, map, and settings pages.

**State Management:** 
- TanStack Query (React Query) for server state management with automatic caching, background refetching disabled (staleTime: Infinity)
- React Hook Form with Zod validation for form state
- No global client state library - component-level state with useState/useContext

**UI Component Library:** Radix UI primitives with shadcn/ui styling system
- Design system: "new-york" style with neutral base color
- All components follow a consistent pattern with CVA (class-variance-authority) for variants
- CSS variables for theming with light/dark mode support

**Styling:**
- TailwindCSS with custom configuration
- Design inspired by Linear/Notion with Material Design principles for data-rich interfaces
- Custom color system using HSL values with CSS variables
- Typography: Inter/IBM Plex Sans for UI, JetBrains Mono for numerical data
- Spacing primitives: 2, 3, 4, 6, 8, 12, 16, 24
- Responsive grid: 12-column with breakpoints at md (768px) and lg (1024px)

**Build Tool:** Vite with React plugin, custom path aliases (@/, @shared/, @assets/)

### Backend Architecture

**Runtime:** Node.js with Express.js framework

**Language:** TypeScript with ES modules (type: "module")

**API Design:** RESTful API with conventional HTTP methods
- GET for retrieving resources
- POST for creating resources and triggering actions (route calculation, weather refresh)
- PATCH for partial updates
- DELETE for removing resources

**Middleware Stack:**
- express.json() with request body verification (raw body capture)
- express.urlencoded() for form data
- Custom logging middleware tracking request duration and JSON responses
- Vite middleware in development mode with HMR

**Route Organization:** Centralized route registration in `server/routes.ts` with all endpoints prefixed with `/api/`

### Data Storage

**Database:** PostgreSQL via Neon serverless driver (@neondatabase/serverless)

**ORM:** Drizzle ORM with Zod schema integration
- Schema definition in `shared/schema.ts` for type sharing between client/server
- Migrations managed via drizzle-kit in `./migrations` directory
- Schema-first approach with createInsertSchema() generating Zod validators

**Data Models:**
- **users** - User authentication profiles (id, email, firstName, lastName, profileImageUrl, timestamps)
- **sessions** - Express session storage (sid, sess, expire)
- **tracks** - Race track locations with GPS coordinates
- **trackdays** - Scheduled events with participation status (planned/registered/attended/cancelled) and route geometry
- **cost_items** - Line items with payment tracking (planned/invoiced/paid/refunded) and travel cost auto-generation
- **vehicles** - User's vehicles with fuel consumption data
- **maintenance_logs** - Service records tied to vehicles
- **trackday_schedule_blocks** - Daily timeline blocks (registration, session, break, lunch)
- **track_sessions** - Named sessions with lap data aggregation
- **laps** - Individual lap times with sector splits and validity flags
- **settings** - Singleton configuration (currency, home location, fuel prices, API keys, annual budget)
- **weather_cache** - Cached weather forecasts with 6-hour TTL

**Storage Interface:** Abstract IStorage interface in `server/storage.ts` defining all CRUD operations, enabling future database swapping without changing route handlers

### Authentication & Authorization

**Authentication System:** Replit Auth with OpenID Connect (supports Google, GitHub, and email/password)

**Session Management:** 
- PostgreSQL-backed sessions using connect-pg-simple
- 7-day session TTL with automatic refresh
- Secure cookies in production, non-secure in development
- Sessions table auto-created on first use

**Database Schema:**
- **users** - User profiles with id (sub claim), email, firstName, lastName, profileImageUrl, timestamps
- **sessions** - Express session storage (sid, sess JSON, expire timestamp)

**Server Implementation:**
- `server/replitAuth.ts` - OAuth setup, login/logout/callback routes, session configuration
- `isAuthenticated` middleware - Protects routes, refreshes expired tokens automatically
- Dynamic callback URLs - Adapts to HTTP (development) and HTTPS (production) with port preservation
- Strategy caching - Separate strategies per protocol+host combination

**Client Implementation:**
- `useAuth()` hook - Checks authentication status, returns user profile
- `isUnauthorizedError()` utility - Detects 401 errors for auth flow
- `authUtils.ts` - Helper functions for authentication logic

**API Endpoints:**
- `GET /api/login` - Initiates OAuth flow with Replit Auth
- `GET /api/callback` - OAuth callback, creates/updates user, establishes session
- `GET /api/logout` - Destroys session, redirects to Replit logout
- `GET /api/auth/user` - Returns authenticated user profile (protected)

**Environment Variables:**
- `REPL_ID` - Replit application ID (auto-provided in Replit environment)
- `SESSION_SECRET` - Secret key for session encryption
- `DATABASE_URL` - PostgreSQL connection string
- `ISSUER_URL` - Optional OpenID Connect issuer override (defaults to Replit Auth)

**Future Collaboration Features:**
- Trackday sharing and invite links
- Permission system (owner/editor/viewer roles)
- Activity tracking and collaboration feed
- Multi-user access control

### External Dependencies

**Mapping & Routing:**
- OpenRouteService API (configurable via OPENROUTE_SERVICE_KEY in settings)
- Fallback to mock data when API key unavailable
- Calculates distance, duration, fuel costs, and toll estimates
- Results stored on trackday record and auto-generated as cost items (isTravelAuto=true)

**Weather Forecasting:**
- OpenWeather API (configurable via OPEN_WEATHER_API_KEY in settings)
- 6-hour cache to minimize API calls
- Fallback to mock data when unavailable
- Weather data tied to trackday dates and track GPS coordinates

**Charts & Visualization:**
- Recharts library for monthly spending bar charts
- Custom KPI cards for dashboard metrics
- No map visualization currently implemented (placeholder in map page)

**UI Icons:** Lucide React - Consistent icon library used throughout the application

**Date Handling:** date-fns for formatting and date operations

### Build & Deployment

**Development:**
- Concurrent dev servers: Vite frontend on one port, Express API on another
- tsx for running TypeScript server code without compilation
- Hot module replacement via Vite
- Runtime error overlay via @replit/vite-plugin-runtime-error-modal

**Production:**
- Frontend: Vite builds to `dist/public` with optimized bundles
- Backend: esbuild bundles server code to `dist/index.js` as ESM module
- Static files served from compiled frontend directory
- Database migrations via `npm run db:push`

**Environment Variables:**
- DATABASE_URL (required) - PostgreSQL connection string
- NODE_ENV - development/production mode switching
- Optional: REPL_ID for Replit-specific plugins

### Key Architectural Decisions

**Monorepo Structure:**
- `/client` - Frontend React application
- `/server` - Express backend
- `/shared` - Shared TypeScript types and Zod schemas
- Enables type safety across API boundaries

**Type Safety Strategy:**
- Zod schemas define runtime validation and TypeScript types
- drizzle-zod bridges database schema to validation
- Shared schema ensures client/server type consistency

**API Response Handling:**
- Custom apiRequest() wrapper with automatic error throwing for non-OK responses
- Query client configured to NOT return null on 401 (throw instead)
- Toast notifications for user feedback on mutations

**Cost Tracking Design:**
- Costs stored in cents to avoid floating-point arithmetic issues
- Auto-generated travel costs flagged with isTravelAuto=true
- Payment status workflow: planned → invoiced → paid (or refunded)
- Supports multiple cost types: entry, travel, hotel, tires, fuel, tolls, food, other

**Performance Optimization:**
- Weather caching reduces external API calls
- React Query prevents redundant fetches with infinite stale time
- Minimal re-renders through proper query key structure
- Skeleton loaders for progressive rendering during data fetch

**Responsive Design:**
- Mobile-first approach with collapsible sidebar
- Breakpoint-aware grid layouts (1 col mobile, 2-4 cols desktop)
- Touch-friendly button sizes and spacing
- Sticky header with backdrop blur on scroll