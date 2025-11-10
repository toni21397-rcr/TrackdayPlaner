# Trackday Planner - Design Guidelines

## Design Approach

**Selected Framework:** Design System Approach inspired by modern productivity tools (Linear, Notion) combined with Material Design principles for data-rich interfaces.

**Rationale:** This is a utility-focused application with information-dense dashboards, complex data entry forms, and visualization needs. The design must prioritize clarity, efficiency, and data comprehension while maintaining visual appeal for motorsport enthusiasts.

---

## Typography System

### Font Selection
- **Primary:** Inter or IBM Plex Sans via Google Fonts CDN
- **Monospace:** JetBrains Mono for numerical data (lap times, costs, distances)

### Hierarchy
- **Page Headers:** 2xl/3xl font size, font-semibold
- **Section Titles:** xl/2xl font size, font-semibold  
- **Card Headers:** lg font size, font-medium
- **Body Text:** base font size, font-normal
- **Labels/Meta:** sm font size, font-medium, uppercase tracking-wide for status badges
- **Data/Numbers:** Use monospace font for lap times, costs, distances - font-medium to font-semibold
- **Helper Text:** sm font size, font-normal with reduced opacity

---

## Layout System

### Spacing Primitives
Core Tailwind units: **2, 3, 4, 6, 8, 12, 16, 24**
- Component padding: p-4 to p-6
- Card spacing: p-6 on desktop, p-4 on mobile
- Section gaps: gap-6 to gap-8
- Page margins: px-4 on mobile, px-6 to px-8 on desktop
- Vertical rhythm: space-y-6 to space-y-8

### Grid Structure
- **Dashboard:** 12-column grid with responsive breakpoints
- **KPI Cards:** grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- **Main Content:** max-w-7xl mx-auto with px-4 to px-8
- **Detail Pages:** Two-column layout on desktop (8/4 split for main content/sidebar)
- **Forms:** Single column, max-w-2xl for optimal readability

### Container Strategy
- Full-width sections with inner max-w-7xl containers
- Cards use rounded-lg borders with subtle shadows
- Sticky navigation header with backdrop blur
- Sidebar navigation on desktop (w-64), collapsible hamburger on mobile

---

## Component Library

### Navigation
- **Top Bar:** Sticky header with logo, main navigation links, theme toggle, and user menu
- **Sidebar (Desktop):** Fixed left sidebar (w-64) with icon + label navigation items, collapsible sections
- **Mobile:** Hamburger menu with slide-in drawer
- **Breadcrumbs:** Show on detail pages for context

### Dashboard Components

**KPI Cards:**
- Prominent numerical display (3xl monospace font)
- Label above (sm uppercase)
- Supporting metadata below (sm font)
- Icon in top-right corner (Heroicons via CDN)
- Trend indicators with up/down arrows

**Budget Progress Bar:**
- Horizontal bar showing Projected/Spent/Remaining
- Segmented sections with labels
- Percentage labels inline
- Height: h-8 to h-12

**Charts:**
- Monthly spending: Vertical bar chart using Chart.js
- Container: aspect-video or fixed height h-64 to h-80
- Grid lines for readability
- Data labels on hover

**Upcoming Trackdays Widget:**
- List format with date badge on left
- Track name, participation badge, cost preview
- Click to navigate to detail

### Trackday List & Filters

**Filter Bar:**
- Horizontal layout on desktop, collapsible on mobile
- Dropdowns for year, participation status, payment status
- Search input with icon (w-64 to w-80)
- "Add Trackday" button (primary action, right-aligned)

**List Cards:**
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Each card shows: date badge, track name, vehicle, participation badge, cost summary
- Hover state with subtle elevation increase
- Status badges with rounded-full pills

### Trackday Detail Page

**Layout Structure:**
1. **Header Section:** Track name, date, participation status, quick actions (edit, delete)
2. **Info Grid:** 2-3 columns showing vehicle, duration, notes
3. **Tabbed Interface:** Costs, Route, Weather, Timeline, Sessions/Laps
4. **Sticky Action Bar:** Bottom-right floating button for adding items

**Cost Items Table:**
- Columns: Type, Amount, Status, Due Date, Actions
- Status badges inline
- Sortable headers
- Row hover states
- Inline edit capability
- Footer row showing totals (font-semibold)

**Route Card:**
- Map preview (aspect-video, h-64)
- Route details below: distance, duration, fuel cost, toll cost
- "Recalculate" button if data changes

**Weather Widget:**
- Horizontal layout showing 3-day forecast
- Icons from Heroicons (sun, cloud-rain, wind)
- Temperature, precipitation chance, wind speed
- Refresh button with timestamp

**Timeline View:**
- Vertical timeline with time markers on left
- Blocks showing registration, sessions, breaks
- Each block: rounded rectangle with start/end time, title, notes
- Color-coded by type (registration, session, break, etc.)

**Laps Table:**
- Session selector dropdown
- Columns: Lap #, Time (monospace), Sectors, Valid checkbox
- Best lap highlighted with subtle background
- Average lap time in footer
- CSV import/export buttons above table
- "Add Lap" button inline

### Forms

**Input Fields:**
- Labels above inputs (font-medium, sm)
- Input height: h-10 to h-12
- Rounded borders: rounded-md
- Focus rings with offset
- Helper text below in sm font
- Error states with icon and message

**Date/Time Pickers:**
- Native HTML5 inputs styled consistently
- Icon prefixes (Heroicons calendar, clock)

**Dropdowns/Selects:**
- Consistent height with text inputs
- Chevron icon indicating dropdown
- Custom styling for options

**Buttons:**
- Primary: font-medium, px-4, py-2, rounded-md
- Secondary: outlined variant
- Icon buttons: square aspect, p-2
- Floating action button: fixed bottom-right, rounded-full, w-14 h-14, shadow-lg

### Data Visualization

**Map Component:**
- Full-width container with aspect-video or h-96
- Controls overlay in top-right corner
- Markers for tracks with popup labels
- Route polylines between home and tracks
- Legend in bottom-left

**Tables:**
- Header row with font-medium, border-b
- Zebra striping for readability (odd row subtle background)
- Padding: py-3 px-4
- Right-align numerical columns
- Sticky header on scroll for long tables

### Badges & Status Indicators
- **Participation Status:** rounded-full pills with px-3 py-1, sm font
- **Payment Status:** similar styling, distinct from participation
- **Trend Indicators:** Small icons with text (↑/↓)
- **Vehicle Type:** Icon + label inline

### Empty States
- Centered layout with max-w-sm
- Icon (Heroicons, size-16)
- Heading (xl font-semibold)
- Description (base font with reduced opacity)
- Primary action button

---

## Interaction Patterns

### Navigation Flow
- Smooth transitions between pages
- Active state clearly indicated in navigation
- Persistent sidebar selection on desktop

### Inline Editing
- Click to edit with instant feedback
- Auto-save with toast notification
- Undo option in toast (5-second duration)

### Data Entry
- Auto-focus first field in forms
- Tab navigation optimized
- Keyboard shortcuts for common actions (e.g., Cmd+K for quick add)

### Feedback & Validation
- Real-time validation on blur
- Success/error toasts positioned top-right
- Loading states with skeleton screens for dashboard cards
- Optimistic UI updates

### Responsive Behavior
- Hamburger menu on mobile
- Stacked layouts for forms and cards
- Horizontal scroll for wide tables with sticky first column
- Bottom sheet modals on mobile vs. centered modals on desktop

---

## Color System

### Semantic Color Palette

The application uses a semantic color system with HSL values for light/dark mode compatibility:

**Core Colors:**
- **Primary:** Brand color for main actions and highlights (blue-based)
- **Destructive:** Error states and negative actions (red-based)
- **Success:** Completion, positive trends, and successful states (green: 142 76% 36%)
- **Warning:** Attention needed, pending actions (orange: 25 95% 53%)
- **Info:** Informational states, registered status (blue: 221 83% 53%)

**UI Colors:**
- **Background:** Main page background
- **Card:** Elevated surface background
- **Muted:** Secondary backgrounds and disabled states
- **Border:** Dividers and outlines

**Text Hierarchy:**
- **Foreground:** Primary text
- **Muted Foreground:** Secondary text (60% opacity)

### Color Usage Guidelines

**Status Badges:**
- Success: Completed tasks, attended events, paid invoices
- Warning: Due tasks, pending invoices, attention needed
- Info: Registered status, informational states, snoozed items
- Destructive: Cancelled events, overdue tasks, refunded payments
- Secondary: Planned events, future tasks

**KPI Cards:**
- Trend indicators use success (green) for positive, destructive (red) for negative
- Icon badges use primary color with 10% opacity background
- Subtle gradient background (from-card to-card/50) for depth

**Design Principles:**
- Color never sole indicator (always pair with icons or text for accessibility)
- Semantic colors adapt automatically to light/dark themes
- Use sparingly for maximum impact
- Maintain WCAG AA contrast ratios in both themes

---

## Accessibility

- Consistent focus indicators throughout (ring-2 with offset)
- ARIA labels for icon-only buttons
- Semantic HTML (nav, main, section, article)
- Form labels properly associated
- Keyboard navigation fully supported
- Alt text for map markers and status icons
- Color not sole indicator of status (use icons + text)

---

## Images

**No large hero image required.** This is a utility application focused on data and functionality.

**Image Usage:**
- Track images: Small thumbnail preview in track selector (aspect-square, w-16 h-16, rounded-md)
- Vehicle images: Optional thumbnail in vehicle list (aspect-square, w-12 h-12, rounded)
- Map integration: Full-width interactive map component using OpenRouteService/Mapbox
- Empty state illustrations: Simple SVG icons from Heroicons, not photographs

---

## Page-Specific Guidelines

### Dashboard (/)
- Header with welcome message and date
- KPI cards grid: 4 columns on desktop, 2 on tablet, 1 on mobile
- Budget progress bar: full-width section
- Monthly chart: centered, max-w-4xl
- Upcoming trackdays: sidebar widget on desktop, full-width on mobile

### Trackday List (/trackdays)
- Filter bar at top
- Grid of cards below
- Pagination or infinite scroll
- Floating "Add" button

### Trackday Detail (/trackdays/:id)
- Breadcrumb navigation
- Page header with actions
- Tabbed content area
- Each tab shows relevant component (costs table, route card, weather, timeline, laps)

### Tracks (/tracks)
- List with map preview per item
- "Add Track" opens modal with map picker
- Map shows pin placement interface
- Form fields: name, country, coordinates (auto-filled from map click)

### Vehicles (/vehicles)
- Simple CRUD list
- Maintenance log as expandable section per vehicle
- "Add Maintenance" inline form

### Map Overview (/map)
- Full-screen map with all tracks and routes
- Legend panel (collapsible)
- Filter by year/status

### Settings (/settings)
- Single-column form layout
- Sections: Currency, Home Location, Fuel Pricing, Budget, API Keys
- Map picker for home location
- Save button sticky at bottom

---

## Theme System

Support light and dark modes with toggle in header. Ensure all components have appropriate contrast in both modes without specifying colors.