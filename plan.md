# 🎟️ TicketFlow — Full-Stack Booking App Plan
### BookMyShow + Distric-Style Platform

---

## 📌 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Schema Design](#4-database-schema-design)
5. [Complete API Reference](#5-complete-api-reference)
6. [Frontend Architecture (React + TanStack)](#6-frontend-architecture-react--tanstack)
7. [Backend Architecture (Hono + Drizzle + Zod)](#7-backend-architecture-hono--drizzle--zod)
8. [Feature Plan by Perspective](#8-feature-plan-by-perspective)
9. [Mobile Responsive Plan](#9-mobile-responsive-plan)
10. [Free Deployment Strategy](#10-free-deployment-strategy)
11. [Development Roadmap](#11-development-roadmap)

---

## 1. Project Overview

**TicketFlow** is a full-stack event and entertainment booking platform inspired by BookMyShow (India) and District (Ireland). It enables users to discover, browse, and book tickets for movies, concerts, sports, theatre, and live events — with dedicated portals for organizers and a powerful admin panel.

### Core Pillars
- **Discovery** — Search, filter, and browse all events
- **Booking** — Seat selection, payment, ticket generation
- **Management** — Organizer dashboard to manage events and capacity
- **Administration** — God-mode admin panel to control the entire platform

---

## 2. Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 19 (Vite) |
| Routing | TanStack Router v1 |
| Data Fetching | TanStack Query v5 |
| Tables | TanStack Table v8 |
| Forms | TanStack Form |
| Virtual Lists | TanStack Virtual |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| State (Global) | Zustand |
| Icons | Lucide React |
| Date Handling | date-fns |
| Charts | Recharts |
| PDF/Ticket | @react-pdf/renderer |
| Maps | React Leaflet |
| Payments UI | Razorpay JS SDK |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 22 LTS |
| Framework | Hono v4 |
| ORM | Drizzle ORM |
| Validation | Zod v3 |
| Auth | Jose (JWT) + bcrypt |
| Email | Nodemailer / Resend |
| File Upload | AWS S3 / Cloudflare R2 |
| Payments | Razorpay Node SDK |
| QR Code | qrcode |
| PDF | PDFKit |
| Queues | BullMQ + Redis |
| WebSockets | Hono WebSocket |
| Rate Limiting | Hono Rate Limiter |
| Logging | Pino |

### Database
| Layer | Technology |
|---|---|
| Primary DB | PostgreSQL (Neon — free tier) |
| Cache | Redis (Upstash — free tier) |
| Search | Meilisearch (Self-hosted / Meilisearch Cloud free) |
| File Storage | Cloudflare R2 (free tier 10GB) |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  User Portal │  │  Organizer   │  │   Admin Panel    │  │
│  │  (React)     │  │  Dashboard   │  │   (React)        │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼────────────┘
          │                 │                   │
          └─────────────────┼───────────────────┘
                            │  HTTPS / WS
┌───────────────────────────▼─────────────────────────────────┐
│                     API GATEWAY LAYER                       │
│                   Hono.js on Node.js 22                     │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Auth Guard │ │ Rate Limit │ │ Zod Val. │ │   CORS    │  │
│  └────────────┘ └────────────┘ └──────────┘ └───────────┘  │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  /auth   │ │ /events  │ │/bookings │ │   /admin     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼──────┐
   │ PostgreSQL  │  │    Redis    │  │  R2/S3     │
   │   (Neon)   │  │  (Upstash)  │  │  Storage   │
   └─────────────┘  └─────────────┘  └────────────┘
          │
   ┌──────▼──────┐  ┌─────────────┐
   │ Meilisearch │  │   BullMQ    │
   │  (Search)   │  │  (Queues)   │
   └─────────────┘  └─────────────┘
```

---

## 4. Database Schema Design

### Core Entities

#### users
```
id (uuid, PK)
name (varchar)
email (varchar, unique)
phone (varchar)
password_hash (varchar)
role (enum: user | organizer | admin)
avatar_url (varchar)
is_verified (boolean)
email_verified_at (timestamp)
created_at, updated_at
```

#### categories
```
id (uuid, PK)
name (varchar)           -- Movies, Concerts, Sports, Theatre, Comedy
slug (varchar, unique)
icon_url (varchar)
is_active (boolean)
```

#### venues
```
id (uuid, PK)
name (varchar)
address (text)
city (varchar)
state (varchar)
country (varchar)
latitude (decimal)
longitude (decimal)
capacity (integer)
amenities (jsonb)        -- parking, food, wheelchair
images (jsonb)           -- array of image URLs
organizer_id (uuid, FK → users)
is_approved (boolean)
created_at, updated_at
```

#### venue_sections
```
id (uuid, PK)
venue_id (uuid, FK → venues)
name (varchar)           -- Gold, Silver, Platinum, Balcony
total_seats (integer)
layout_json (jsonb)      -- seat map configuration
```

#### events
```
id (uuid, PK)
title (varchar)
slug (varchar, unique)
description (text)
category_id (uuid, FK → categories)
organizer_id (uuid, FK → users)
venue_id (uuid, FK → venues)
start_datetime (timestamp)
end_datetime (timestamp)
language (varchar)
age_rating (varchar)     -- U, UA, A
status (enum: draft | published | cancelled | completed)
banner_url (varchar)
trailer_url (varchar)
tags (text[])
is_featured (boolean)
meta_json (jsonb)        -- extra movie/event-specific data
created_at, updated_at
```

#### event_shows
```
id (uuid, PK)
event_id (uuid, FK → events)
show_date (date)
show_time (time)
status (enum: active | cancelled | housefull | soldout)
```

#### ticket_tiers
```
id (uuid, PK)
show_id (uuid, FK → event_shows)
section_id (uuid, FK → venue_sections)
name (varchar)           -- GA, VIP, VVIP, Early Bird
price (decimal)
total_quantity (integer)
available_quantity (integer)
sale_start_at (timestamp)
sale_end_at (timestamp)
max_per_booking (integer)
```

#### seats
```
id (uuid, PK)
section_id (uuid, FK → venue_sections)
row (varchar)            -- A, B, C
seat_number (varchar)    -- 1, 2, 3
seat_type (enum: regular | premium | disabled | blocked)
x_position (float)
y_position (float)
```

#### seat_locks (Redis preferred but also DB-backed)
```
id (uuid, PK)
seat_id (uuid, FK → seats)
show_id (uuid, FK → event_shows)
user_id (uuid, FK → users)
locked_at (timestamp)
expires_at (timestamp)   -- 10 min lock window
```

#### bookings
```
id (uuid, PK)
booking_ref (varchar, unique)   -- BMS-2025-XXXXXXX
user_id (uuid, FK → users)
show_id (uuid, FK → event_shows)
status (enum: pending | confirmed | cancelled | refunded)
total_amount (decimal)
convenience_fee (decimal)
tax_amount (decimal)
final_amount (decimal)
payment_status (enum: pending | paid | failed | refunded)
payment_method (varchar)
razorpay_order_id (varchar)
razorpay_payment_id (varchar)
booked_at (timestamp)
cancelled_at (timestamp)
created_at, updated_at
```

#### booking_items
```
id (uuid, PK)
booking_id (uuid, FK → bookings)
tier_id (uuid, FK → ticket_tiers)
seat_id (uuid, FK → seats, nullable for GA)
quantity (integer)
unit_price (decimal)
total_price (decimal)
```

#### tickets
```
id (uuid, PK)
booking_item_id (uuid, FK → booking_items)
ticket_code (varchar, unique)  -- QR code value
seat_id (uuid, FK)
qr_url (varchar)
pdf_url (varchar)
status (enum: valid | used | cancelled | expired)
scanned_at (timestamp)
scanned_by (uuid, FK → users)
```

#### reviews
```
id (uuid, PK)
user_id (uuid, FK → users)
event_id (uuid, FK → events)
rating (int)             -- 1–5
content (text)
is_verified (boolean)    -- only verified buyers
created_at
```

#### promotions / coupons
```
id (uuid, PK)
code (varchar, unique)
type (enum: flat | percent | bogo)
value (decimal)
min_order_amount (decimal)
max_uses (integer)
used_count (integer)
valid_from (timestamp)
valid_until (timestamp)
event_id (uuid, nullable) -- event-specific or global
organizer_id (uuid, nullable)
```

#### notifications
```
id (uuid, PK)
user_id (uuid, FK → users)
type (enum: email | push | sms)
title (varchar)
body (text)
is_read (boolean)
sent_at (timestamp)
```

#### audit_logs (Admin)
```
id (uuid, PK)
actor_id (uuid, FK → users)
action (varchar)
entity_type (varchar)
entity_id (uuid)
changes_json (jsonb)
ip_address (varchar)
created_at
```

---

## 5. Complete API Reference

> Base URL: `/api/v1`  
> Authentication: Bearer JWT in Authorization header  
> Roles: `PUBLIC` | `USER` | `ORGANIZER` | `ADMIN`

---

### 🔐 Auth APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | PUBLIC | Register new user |
| POST | `/auth/login` | PUBLIC | Login with email/password |
| POST | `/auth/logout` | USER | Invalidate refresh token |
| POST | `/auth/refresh` | PUBLIC | Refresh access token |
| POST | `/auth/forgot-password` | PUBLIC | Send password reset email |
| POST | `/auth/reset-password` | PUBLIC | Reset password with token |
| POST | `/auth/verify-email` | PUBLIC | Verify email via OTP |
| POST | `/auth/resend-otp` | PUBLIC | Resend OTP |
| POST | `/auth/google` | PUBLIC | OAuth2 Google login |
| GET | `/auth/me` | USER | Get current user profile |
| PUT | `/auth/me` | USER | Update current user profile |
| PUT | `/auth/me/password` | USER | Change password |
| POST | `/auth/me/avatar` | USER | Upload avatar |

---

### 🗂️ Category APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/categories` | PUBLIC | List all active categories |
| GET | `/categories/:slug` | PUBLIC | Get category by slug |
| POST | `/categories` | ADMIN | Create category |
| PUT | `/categories/:id` | ADMIN | Update category |
| DELETE | `/categories/:id` | ADMIN | Delete category |

---

### 🏟️ Venue APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/venues` | PUBLIC | List all approved venues |
| GET | `/venues/:id` | PUBLIC | Get venue detail |
| GET | `/venues/:id/sections` | PUBLIC | Get venue sections |
| GET | `/venues/:id/seat-map/:sectionId` | PUBLIC | Get seat map layout |
| POST | `/venues` | ORGANIZER | Create new venue |
| PUT | `/venues/:id` | ORGANIZER | Update venue |
| DELETE | `/venues/:id` | ORGANIZER/ADMIN | Delete venue |
| POST | `/venues/:id/images` | ORGANIZER | Upload venue images |
| POST | `/venues/:id/sections` | ORGANIZER | Add venue section |
| PUT | `/venues/:id/sections/:sId` | ORGANIZER | Update section |
| DELETE | `/venues/:id/sections/:sId` | ORGANIZER | Delete section |
| POST | `/venues/:id/approve` | ADMIN | Approve venue |
| POST | `/venues/:id/reject` | ADMIN | Reject venue |
| GET | `/venues/pending` | ADMIN | List pending venue approvals |

---

### 🎭 Events APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/events` | PUBLIC | List/search all events (paginated) |
| GET | `/events/featured` | PUBLIC | Get featured events |
| GET | `/events/trending` | PUBLIC | Get trending events |
| GET | `/events/upcoming` | PUBLIC | Get upcoming events |
| GET | `/events/search` | PUBLIC | Full-text search (Meilisearch) |
| GET | `/events/filter` | PUBLIC | Filter by city, category, date, price |
| GET | `/events/:slug` | PUBLIC | Get event detail |
| GET | `/events/:slug/shows` | PUBLIC | Get available shows for an event |
| GET | `/events/:slug/reviews` | PUBLIC | Get event reviews |
| POST | `/events/:id/reviews` | USER | Post a review |
| PUT | `/events/:id/reviews/:rid` | USER | Update own review |
| DELETE | `/events/:id/reviews/:rid` | USER | Delete own review |
| GET | `/events/my` | ORGANIZER | Get organizer's own events |
| POST | `/events` | ORGANIZER | Create event |
| PUT | `/events/:id` | ORGANIZER | Update event |
| DELETE | `/events/:id` | ORGANIZER/ADMIN | Delete event |
| POST | `/events/:id/publish` | ORGANIZER | Publish event |
| POST | `/events/:id/cancel` | ORGANIZER/ADMIN | Cancel event |
| POST | `/events/:id/banner` | ORGANIZER | Upload banner image |
| POST | `/events/:id/shows` | ORGANIZER | Add show to event |
| PUT | `/events/:id/shows/:showId` | ORGANIZER | Update show |
| DELETE | `/events/:id/shows/:showId` | ORGANIZER | Delete show |
| POST | `/events/:id/shows/:showId/tiers` | ORGANIZER | Add ticket tier to show |
| PUT | `/events/:id/shows/:showId/tiers/:tid` | ORGANIZER | Update ticket tier |
| DELETE | `/events/:id/shows/:showId/tiers/:tid` | ORGANIZER | Delete ticket tier |
| GET | `/events/:id/analytics` | ORGANIZER | Event revenue & booking analytics |
| POST | `/events/:id/feature` | ADMIN | Toggle featured status |
| GET | `/events/pending` | ADMIN | All events pending review |
| POST | `/events/:id/approve` | ADMIN | Approve event |
| POST | `/events/:id/reject` | ADMIN | Reject event |

---

### 💺 Seat Availability APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/shows/:showId/seats` | PUBLIC | Get all seats with availability status |
| POST | `/shows/:showId/seats/lock` | USER | Lock seats temporarily (10 min) |
| DELETE | `/shows/:showId/seats/unlock` | USER | Manually unlock locked seats |
| GET | `/shows/:showId/availability` | PUBLIC | Quick tier availability check |
| WS | `/ws/shows/:showId/seats` | PUBLIC | Real-time seat status WebSocket |

---

### 🎫 Booking APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/bookings/initiate` | USER | Start booking (create order) |
| POST | `/bookings/confirm` | USER | Confirm after payment success |
| GET | `/bookings` | USER | Get user's booking history |
| GET | `/bookings/:ref` | USER | Get booking detail by ref |
| POST | `/bookings/:ref/cancel` | USER | Cancel booking |
| GET | `/bookings/:ref/tickets` | USER | Get all tickets for a booking |
| GET | `/bookings/:ref/download` | USER | Download PDF ticket |
| POST | `/bookings/apply-coupon` | USER | Validate and apply coupon |
| GET | `/organizer/bookings` | ORGANIZER | View all bookings for organizer's events |
| GET | `/organizer/bookings/export` | ORGANIZER | Export bookings CSV |
| GET | `/admin/bookings` | ADMIN | View all bookings platform-wide |
| POST | `/admin/bookings/:id/refund` | ADMIN | Force refund |

---

### 💳 Payment APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/payments/create-order` | USER | Create Razorpay order |
| POST | `/payments/verify` | USER | Verify payment signature |
| POST | `/payments/webhook` | PUBLIC | Razorpay webhook handler |
| GET | `/payments/history` | USER | User payment history |
| GET | `/payments/:id` | USER | Payment detail |
| POST | `/payments/:id/refund` | ADMIN | Initiate refund |
| GET | `/admin/payments` | ADMIN | All transactions |
| GET | `/admin/payments/stats` | ADMIN | Revenue statistics |

---

### 🎟️ Ticket APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/tickets/:code` | USER | Get ticket by code |
| GET | `/tickets/:code/qr` | USER | Get QR code image |
| POST | `/tickets/:code/scan` | ORGANIZER | Scan/validate ticket at entry |
| GET | `/organizer/tickets/scan-log` | ORGANIZER | Entry scan log |

---

### 🏷️ Coupon APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/coupons` | ADMIN | List all coupons |
| POST | `/coupons` | ADMIN/ORGANIZER | Create coupon |
| PUT | `/coupons/:id` | ADMIN/ORGANIZER | Update coupon |
| DELETE | `/coupons/:id` | ADMIN/ORGANIZER | Delete coupon |
| POST | `/coupons/validate` | USER | Validate coupon code |
| GET | `/coupons/my` | ORGANIZER | Organizer's own coupons |

---

### 🔔 Notification APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | USER | Get user notifications |
| PUT | `/notifications/:id/read` | USER | Mark as read |
| PUT | `/notifications/read-all` | USER | Mark all as read |
| DELETE | `/notifications/:id` | USER | Delete notification |
| GET | `/notifications/preferences` | USER | Get notification settings |
| PUT | `/notifications/preferences` | USER | Update notification settings |
| POST | `/admin/notifications/broadcast` | ADMIN | Broadcast to all users |

---

### 📍 Location APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/locations/cities` | PUBLIC | List all available cities |
| GET | `/locations/detect` | PUBLIC | Detect city by IP |
| GET | `/events/by-city/:city` | PUBLIC | Events by city slug |

---

### 🧑‍💼 Organizer APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/organizer/dashboard` | ORGANIZER | Dashboard stats |
| GET | `/organizer/events` | ORGANIZER | All organizer events |
| GET | `/organizer/revenue` | ORGANIZER | Revenue report |
| GET | `/organizer/revenue/export` | ORGANIZER | Export revenue CSV |
| GET | `/organizer/attendees` | ORGANIZER | Attendee list |
| GET | `/organizer/events/:id/check-in` | ORGANIZER | Live check-in stats |
| POST | `/organizer/register` | PUBLIC | Apply to become organizer |

---

### 🛡️ Admin APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/admin/dashboard` | ADMIN | Platform-wide KPIs |
| GET | `/admin/users` | ADMIN | List all users (paginated) |
| GET | `/admin/users/:id` | ADMIN | Get user detail |
| PUT | `/admin/users/:id` | ADMIN | Edit user |
| DELETE | `/admin/users/:id` | ADMIN | Delete/ban user |
| POST | `/admin/users/:id/ban` | ADMIN | Ban user |
| POST | `/admin/users/:id/unban` | ADMIN | Unban user |
| POST | `/admin/users/:id/make-organizer` | ADMIN | Promote to organizer |
| GET | `/admin/events` | ADMIN | All events |
| GET | `/admin/venues` | ADMIN | All venues |
| GET | `/admin/categories` | ADMIN | Manage categories |
| GET | `/admin/coupons` | ADMIN | All coupons |
| GET | `/admin/analytics/revenue` | ADMIN | Revenue analytics |
| GET | `/admin/analytics/users` | ADMIN | User growth analytics |
| GET | `/admin/analytics/events` | ADMIN | Event performance analytics |
| GET | `/admin/analytics/cities` | ADMIN | City-wise analytics |
| GET | `/admin/audit-logs` | ADMIN | Platform audit trail |
| PUT | `/admin/settings` | ADMIN | Platform settings |
| POST | `/admin/maintenance` | ADMIN | Toggle maintenance mode |

---

### 🔎 Search API

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/search?q=` | PUBLIC | Global search (events, venues) |
| GET | `/search/suggestions?q=` | PUBLIC | Autocomplete suggestions |

---

## 6. Frontend Architecture (React + TanStack)

### Project Structure

```
src/
├── app/                        # TanStack Router route tree
│   ├── __root.tsx              # Root layout (Nav, Footer)
│   ├── index.tsx               # Home page
│   ├── events/
│   │   ├── index.tsx           # Events listing
│   │   ├── $slug.tsx           # Event detail
│   │   └── $slug.shows.tsx     # Show selection
│   ├── booking/
│   │   ├── seats.tsx           # Seat selection
│   │   ├── summary.tsx         # Order summary
│   │   ├── payment.tsx         # Payment page
│   │   └── confirmation.tsx    # Success page
│   ├── tickets/
│   │   └── $code.tsx           # Ticket detail + QR
│   ├── profile/
│   │   ├── index.tsx           # Profile overview
│   │   ├── bookings.tsx        # Booking history
│   │   └── settings.tsx        # Account settings
│   ├── auth/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── organizer/              # Organizer Portal
│   │   ├── dashboard.tsx
│   │   ├── events/
│   │   │   ├── index.tsx
│   │   │   ├── create.tsx
│   │   │   └── $id.edit.tsx
│   │   ├── venues/
│   │   ├── bookings/
│   │   ├── revenue/
│   │   └── check-in.tsx
│   └── admin/                  # Admin Panel
│       ├── dashboard.tsx
│       ├── users/
│       ├── events/
│       ├── venues/
│       ├── bookings/
│       ├── payments/
│       ├── coupons/
│       ├── analytics/
│       └── settings.tsx
│
├── components/
│   ├── ui/                     # shadcn/ui base components
│   ├── common/                 # Shared components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── CitySelector.tsx
│   │   ├── SearchBar.tsx
│   │   └── LoadingSpinner.tsx
│   ├── events/
│   │   ├── EventCard.tsx
│   │   ├── EventGrid.tsx
│   │   ├── EventHero.tsx
│   │   ├── ShowSelector.tsx
│   │   └── ReviewCard.tsx
│   ├── booking/
│   │   ├── SeatMap.tsx
│   │   ├── SeatLegend.tsx
│   │   ├── BookingSummary.tsx
│   │   ├── CountdownTimer.tsx  # 10-min lock timer
│   │   └── TicketCard.tsx
│   ├── payment/
│   │   ├── RazorpayButton.tsx
│   │   └── CouponInput.tsx
│   └── admin/
│       ├── DataTable.tsx       # TanStack Table
│       ├── StatCard.tsx
│       ├── RevenueChart.tsx
│       └── AuditLog.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useEvents.ts
│   ├── useBooking.ts
│   ├── useSeatLock.ts          # WebSocket seat lock
│   ├── usePayment.ts
│   └── useGeolocation.ts
│
├── stores/
│   ├── authStore.ts            # Zustand auth state
│   ├── bookingStore.ts         # Active booking state
│   └── cityStore.ts            # Selected city
│
├── lib/
│   ├── api.ts                  # Axios/fetch client
│   ├── queryClient.ts          # TanStack Query config
│   └── utils.ts
│
└── types/
    ├── event.ts
    ├── booking.ts
    ├── user.ts
    └── api.ts
```

### TanStack Integration Plan

#### TanStack Router
- File-based routing with type-safe params
- Nested layouts for organizer and admin portals
- Auth guards via `beforeLoad` hooks
- Search params for filters and pagination

#### TanStack Query
- All API calls wrapped in `useQuery` / `useMutation`
- Optimistic updates for seat locking
- Background refetch for seat availability
- Infinite query for event listing pages

#### TanStack Table
- Used in admin panel for users, bookings, events
- Server-side pagination, sorting, filtering
- Column visibility toggle
- Bulk actions with row selection

#### TanStack Form
- Event creation form (multi-step wizard)
- Booking forms with Zod validation schemas
- Profile update forms

#### TanStack Virtual
- Virtualized event listing grid
- Long booking history lists

---

## 7. Backend Architecture (Hono + Drizzle + Zod)

### Project Structure

```
src/
├── index.ts                    # Entry point
├── app.ts                      # Hono app bootstrap
│
├── config/
│   ├── env.ts                  # Zod-validated env vars
│   ├── db.ts                   # Drizzle + Neon connection
│   ├── redis.ts                # Upstash Redis client
│   ├── storage.ts              # R2/S3 client
│   ├── razorpay.ts             # Payment client
│   ├── meilisearch.ts          # Search client
│   └── queue.ts                # BullMQ setup
│
├── db/
│   ├── schema/                 # All Drizzle schema files
│   │   ├── users.ts
│   │   ├── events.ts
│   │   ├── venues.ts
│   │   ├── bookings.ts
│   │   ├── tickets.ts
│   │   ├── payments.ts
│   │   └── ...
│   ├── migrations/             # Auto-generated Drizzle migrations
│   └── seed.ts                 # Seed data
│
├── routes/
│   ├── auth.ts
│   ├── events.ts
│   ├── venues.ts
│   ├── shows.ts
│   ├── bookings.ts
│   ├── payments.ts
│   ├── tickets.ts
│   ├── coupons.ts
│   ├── search.ts
│   ├── notifications.ts
│   ├── locations.ts
│   ├── organizer.ts
│   └── admin.ts
│
├── middleware/
│   ├── auth.ts                 # JWT verification middleware
│   ├── roleGuard.ts            # Role-based access control
│   ├── rateLimiter.ts          # Per-route rate limiting
│   ├── logger.ts               # Pino request logger
│   ├── errorHandler.ts         # Global error handler
│   └── validate.ts             # Zod body/query validation
│
├── services/
│   ├── auth.service.ts
│   ├── event.service.ts
│   ├── booking.service.ts
│   ├── payment.service.ts
│   ├── ticket.service.ts
│   ├── seat.service.ts
│   ├── email.service.ts
│   ├── search.service.ts
│   └── coupon.service.ts
│
├── workers/                    # BullMQ job processors
│   ├── emailWorker.ts          # Send booking confirmation emails
│   ├── ticketWorker.ts         # Generate PDF tickets
│   ├── seatUnlockWorker.ts     # Auto-unlock expired seat locks
│   └── notificationWorker.ts   # Push notifications
│
├── websocket/
│   └── seatAvailability.ts     # Real-time seat updates
│
├── schemas/                    # Zod validation schemas
│   ├── auth.schema.ts
│   ├── event.schema.ts
│   ├── booking.schema.ts
│   └── ...
│
└── utils/
    ├── response.ts             # Standardized API response helper
    ├── paginate.ts             # Pagination utility
    ├── token.ts                # JWT helpers
    ├── qrcode.ts               # QR generation
    └── pdf.ts                  # Ticket PDF generation
```

### Standard API Response Format

```json
// Success
{
  "success": true,
  "data": { ... },
  "message": "Event fetched successfully",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 350,
    "totalPages": 18
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "SEAT_ALREADY_LOCKED",
    "message": "Selected seat is no longer available",
    "details": []
  }
}
```

### Booking Flow (Critical Path)

```
1. User selects show → GET /shows/:id/availability
2. User selects seats → POST /shows/:id/seats/lock
   → Redis stores seat lock for 10 min
   → WebSocket broadcasts seat status change
3. User sees order summary → GET /bookings/initiate
4. User applies coupon → POST /coupons/validate
5. POST /payments/create-order → Razorpay order ID
6. Frontend opens Razorpay checkout
7. Payment success → POST /payments/verify (signature check)
8. POST /bookings/confirm → Status: confirmed
9. Background Queue:
   → Generate PDF tickets (ticketWorker)
   → Send confirmation email (emailWorker)
   → Update Meilisearch index
   → Release seat lock in Redis
```

### Seat Locking Strategy

```
- Lock stored in Redis with TTL (600 seconds)
- Key: seat:lock:{showId}:{seatId}
- Value: { userId, lockedAt }
- BullMQ job queued to auto-unlock on expiry
- WebSocket event fires on every lock/unlock
- DB updated only on booking confirmation
```

---

## 8. Feature Plan by Perspective

---

### 👤 User Perspective

#### Onboarding
- Register with email/phone + OTP verification
- Google OAuth login
- City selection on first login (auto-detect by IP)
- Profile setup with avatar

#### Discovery
- Home feed: Featured events, trending, by category
- Category browsing (Movies, Concerts, Sports, Theatre, Comedy, Kids)
- City-based event filtering
- Full-text search with autocomplete
- Advanced filters: date range, price range, language, venue
- Event detail page with photos, trailer, cast/crew info
- Reviews and ratings from verified buyers

#### Booking Flow
- Show date/time selector
- Ticket tier selection (GA / Seated)
- Interactive seat map with real-time availability
- 10-minute seat hold with countdown timer
- Order summary with price breakdown
- Coupon code application
- Razorpay payment (UPI, card, netbanking, wallet)
- Booking confirmation page

#### Post Booking
- E-ticket with QR code (in-app + PDF download)
- Booking history
- Cancellation with refund tracking
- Email notifications for booking, cancellation, reminders
- Day-before event reminder notification
- Write a review after event

#### Account
- Profile management
- Notification preferences
- Saved/wishlist events
- Payment history

---

### 🧑‍💼 Organizer Perspective

#### Onboarding
- Apply for organizer account (admin approval)
- Complete profile with KYC documents
- Bank account details for payouts

#### Venue Management
- Create and manage venues
- Add sections (General, VIP, Balcony, etc.)
- Upload floor plan / seat map layout
- Set venue capacity and amenities

#### Event Management
- Create events (title, description, category, banner, trailer)
- Schedule multiple shows (date/time)
- Define ticket tiers per show (price, quantity, sale window)
- Publish / unpublish events
- Cancel events with bulk refund trigger

#### Promotions
- Create discount coupons (flat, percent, BOGO)
- Set coupon validity and usage limits
- Event-specific or platform-wide coupons

#### Check-In
- QR scanner for ticket validation at entry
- Live check-in dashboard (scanned / remaining)
- Scan history log

#### Analytics & Revenue
- Revenue dashboard: total earnings, pending payouts
- Per-event analytics: bookings, revenue, cancellations
- Tier-wise sales breakdown
- Attendee list export (CSV)
- Revenue export for accounting

---

### 🛡️ Admin Perspective (God Mode)

#### Dashboard KPIs
- Total revenue, today's revenue, monthly GMV
- Total users, new signups today
- Active events, upcoming shows
- Total bookings, cancellation rate
- City-wise heat map of activity

#### User Management
- View, search, filter all users
- View user booking history
- Ban / unban users
- Promote users to organizer role
- Manually verify email

#### Event & Venue Management
- Review and approve/reject new events
- Review and approve/reject new venues
- Feature/unfeature events on homepage
- Force-cancel any event
- Edit any event details

#### Booking & Payment Management
- View all bookings with full detail
- Force-confirm pending bookings
- Initiate manual refunds
- View all Razorpay transactions
- Revenue breakdown by organizer

#### Coupon Management
- Create global platform coupons
- View all organizer coupons
- Disable any coupon

#### Content Management
- Manage homepage banners/carousels
- Manage categories
- Manage city list

#### System & Analytics
- Platform-wide revenue analytics (daily/monthly/yearly)
- User growth charts
- Event category performance
- City-wise revenue
- Full audit log (who did what, when, from which IP)

#### Configuration
- Platform settings (fee percentage, tax rate)
- Toggle maintenance mode
- Manage allowed cities
- Email/notification templates

---

## 9. Mobile Responsive Plan

> TicketFlow is a **mobile-first** platform. The majority of BookMyShow/Distric traffic comes from phones. Every screen, component, and interaction is designed for small screens first and then scaled up to tablet and desktop.

---

### 9.1 Core Mobile-First Strategy

#### Tailwind Breakpoint System

All components are built mobile-first using Tailwind's progressive breakpoints:

| Breakpoint | Prefix | Min Width | Target Device |
|------------|--------|-----------|---------------|
| Default | *(none)* | 0px | Mobile (≤ 480px) |
| Small | `sm:` | 640px | Large mobile / small tablet |
| Medium | `md:` | 768px | Tablet portrait |
| Large | `lg:` | 1024px | Tablet landscape / small laptop |
| Extra Large | `xl:` | 1280px | Desktop |
| 2XL | `2xl:` | 1536px | Wide desktop |

**Rule:** Always write base (mobile) styles first, then layer `md:` and `lg:` overrides. Never write desktop-first and override downward.

```tsx
// ✅ Correct — mobile-first
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

// ❌ Wrong — desktop-first with overrides
<div className="grid grid-cols-4 gap-4 lg:grid-cols-3 sm:grid-cols-2 grid-cols-1">
```

---

### 9.2 Responsive Navigation

#### Mobile (< 768px)
- **Top bar:** Logo left + Hamburger icon right
- **Hamburger menu:** Full-screen slide-in drawer (shadcn `Sheet` component)
  - City selector at top
  - Category links
  - Search bar
  - Login / Profile link
- **Bottom navigation bar (fixed):** 5-icon tab bar always visible
  - Home | Search | My Tickets | Notifications | Profile
- Hide desktop nav links entirely

#### Tablet (768px–1024px)
- Top bar with horizontal nav links (condensed)
- Bottom tab bar hidden
- City selector in top bar as a dropdown

#### Desktop (> 1024px)
- Full horizontal navbar: Logo | Categories | Search | City | Login/Avatar
- Mega dropdown for categories
- Bottom tab bar removed

```
Mobile:                          Desktop:
┌─────────────────────────┐     ┌──────────────────────────────────────┐
│ 🎟️ TicketFlow    ☰     │     │ 🎟️ TicketFlow  Movies  Sports  ...  │
└─────────────────────────┘     │           🔍 Search     Mumbai ▼  👤 │
                                └──────────────────────────────────────┘

Bottom Tab Bar (mobile only):
┌──────────────────────────────┐
│  🏠   🔍   🎫   🔔   👤     │
│ Home Search Tickets Notifs Me│
└──────────────────────────────┘
```

---

### 9.3 Page-by-Page Responsive Plan

---

#### 🏠 Home Page

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Hero banner | Full-width, 200px tall, swipeable carousel | 300px tall | 450px tall with gradient overlay |
| Category pills | Horizontal scroll strip, no wrap | 2-row grid | Single row, all visible |
| Event cards | 1 column, full width | 2 columns | 3–4 columns |
| Featured section | Horizontal scroll with snap | 2 columns grid | 3 columns grid |
| "Recommended for you" | 1 column | 2 columns | 4 columns |
| Footer | Collapsed accordion | Full | Full multi-column |

**Mobile specifics:**
- Category pills use `overflow-x-auto` with `-ms-overflow-style: none` to hide scrollbar
- Hero carousel uses `touch-action: pan-y` for swipe gesture
- Lazy load images below fold with `loading="lazy"`

---

#### 🔍 Search & Filter Page

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Search input | Full width, sticky top | Full width | Fixed sidebar with filters |
| Filters | Bottom sheet drawer (tap "Filter" button) | Side panel | Left sticky sidebar |
| Results | 1 column list | 2 column grid | 3 column grid |
| Sort control | Dropdown at top right | Same | Inline with results header |
| Pagination | Infinite scroll | Infinite scroll | Pagination buttons |

**Mobile filter flow:**
```
Tap "Filter" button 
  → Bottom sheet slides up (shadcn Sheet from bottom)
    → Category, Date, Price Range, Language, Rating
  → Apply button sticks to bottom of sheet
  → Sheet closes, results re-filter
```

---

#### 🎭 Event Detail Page

| Element | Mobile | Desktop |
|---------|--------|---------|
| Banner image | Full-width, aspect-ratio 16:9, no sidebar | Left 60% wide with info panel right |
| Title + meta | Below image, stacked | In right info panel |
| "Book Now" CTA | Fixed sticky bar at bottom | Floating card in right panel |
| Show date selector | Horizontal scrollable date pills | Inline date grid |
| Tabs (About / Cast / Reviews) | Swipeable horizontal tabs | Horizontal tab bar |
| Review cards | Single column | 2-column masonry |
| Venue map | Full-width Leaflet map, collapsible | Inline in page |
| Similar events | Horizontal scroll strip | Grid |

**Sticky Book Now (mobile):**
```
┌─────────────────────────────────┐   ← scrollable content above
│                                 │
│  [event content scrolls here]   │
│                                 │
└─────────────────────────────────┘
┌─────────────────────────────────┐   ← fixed to bottom, z-50
│  ₹499 onwards   [Book Now →]   │
└─────────────────────────────────┘
```

---

#### 🗓️ Show Selection Page

| Element | Mobile | Desktop |
|---------|--------|---------|
| Date selector | Horizontal pill scroll, full width | Inline calendar |
| Show time tiles | 2-column grid of time buttons | 4-column grid |
| Venue + language badge | Below each show tile | Inline in show tile |
| Selected show indicator | Bold border highlight + checkmark | Same |

---

#### 💺 Seat Map Page

This is the most complex mobile screen. BookMyShow's approach is the reference.

| Element | Mobile | Desktop |
|---------|--------|---------|
| Seat map canvas | Pinch-to-zoom + pan gesture, scrollable container | Fixed large canvas, no zoom needed |
| Section tabs | Horizontal tab strip (Gold / Silver / Platinum) | Left sidebar section list |
| Selected seats summary | Sticky bottom bar: "2 seats — ₹998 → Proceed" | Right panel always visible |
| Seat legend | Collapsible above map or in modal | Always visible below map |
| Zoom controls | Pinch gesture + +/- buttons | Not needed |
| Proceed button | Full-width in sticky bottom bar | Right panel button |

**Seat map touch implementation:**
- Use `react-zoom-pan-pinch` library for touch-friendly pan and zoom
- Canvas rendered via SVG with responsive `viewBox`
- Seat size: 20×20px minimum tap target (Apple HIG: 44×44pt; Google: 48×48dp)
- Color coding: Available (green), Locked by others (grey), Selected (blue), Booked (red), Disabled (striped)
- Vibration feedback on seat select: `navigator.vibrate(50)`

```
Mobile seat map layout:
┌─────────────────────────────────┐
│  [Gold] [Silver] [Platinum]     │  ← section tabs
├─────────────────────────────────┤
│          🎬 SCREEN              │
│   [A1][A2][A3]  [A4][A5][A6]   │
│   [B1][B2][B3]  [B4][B5][B6]   │  ← pinch-zoom canvas
│   [C1][C2][C3]  [C4][C5][C6]   │
│        (scroll & zoom)          │
├─────────────────────────────────┤
│ ● Avail  ○ Taken  ■ Selected   │  ← legend
├─────────────────────────────────┤
│  A3, A4 selected  ₹998  [Go →] │  ← sticky bar
└─────────────────────────────────┘
```

---

#### 📋 Booking Summary Page

| Element | Mobile | Desktop |
|---------|--------|---------|
| Event info card | Compact: banner thumbnail + title + date | Wide card with large banner |
| Seat/ticket list | Stacked item rows | Table layout |
| Price breakdown | Accordion (tap to expand) | Always expanded |
| Coupon input | Full-width input + Apply button | Same |
| Timer | Sticky top banner "Session expires in 08:43" | Same |
| Pay Now button | Full-width sticky bottom | Right panel large button |

---

#### 💳 Payment Page

- Razorpay checkout opens as a **modal** on desktop, **full-screen** on mobile
- After payment, redirect to confirmation page
- Show loading spinner during payment verification

---

#### ✅ Booking Confirmation Page

| Element | Mobile | Desktop |
|---------|--------|---------|
| Success animation | Full-screen Lottie confetti | Centered with event info right |
| Booking ref | Large bold code, tap to copy | Same |
| QR code | Full-width centered | Medium size in card |
| Action buttons | Stacked full-width: Download PDF, Add to Wallet, Share | Row of buttons |
| View all bookings | Text link at bottom | Button in panel |

---

#### 🎫 My Tickets / Booking History

| Element | Mobile | Desktop |
|---------|--------|---------|
| Ticket cards | Full-width card list, stacked | 2–3 column grid |
| Filter tabs | "Upcoming / Past / Cancelled" horizontal scroll | Tab bar |
| Search bookings | Collapsible search input | Always-visible input |
| QR on ticket card | Tap card → opens full-screen QR modal | Inline small QR |

---

#### 🧑‍💼 Organizer Dashboard

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Sidebar nav | Hidden — top hamburger menu | Collapsible icon-only sidebar | Full expanded sidebar |
| Stat cards | 2×2 grid | 4-column row | 4–6 column row |
| Charts | Full-width, scrollable | Full-width | Side-by-side |
| Data tables | Horizontal scroll, priority columns only visible | More columns | All columns |
| Event list | Card list view | Table | Table with actions |

---

#### 🛡️ Admin Panel

| Element | Mobile | Desktop |
|---------|--------|---------|
| Sidebar | Collapsible drawer | Fixed left sidebar 240px |
| Data tables | Horizontal scroll + column pinning | Full table |
| Charts | Stacked single column | Side-by-side grid |
| Filters | Modal overlay | Inline filter row |
| Bulk actions | Long-press to select + action sheet | Checkbox column + toolbar |

> **Note:** Admin panel can be desktop-only priority in Phase 1. Mobile support for admin can be added later since admin users typically use desktops.

---

### 9.4 Responsive Component Patterns

#### Responsive Card Grid
```tsx
// EventGrid.tsx
<div className="
  grid gap-4
  grid-cols-1           // mobile: 1 column
  sm:grid-cols-2        // 640px: 2 columns
  lg:grid-cols-3        // 1024px: 3 columns
  xl:grid-cols-4        // 1280px: 4 columns
">
  {events.map(event => <EventCard key={event.id} {...event} />)}
</div>
```

#### Responsive Typography Scale
```tsx
// Heading scales
<h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold">
<h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
<p className="text-sm sm:text-base lg:text-lg">
```

#### Mobile Bottom Sheet (for filters, seat legend, coupon)
```tsx
// Uses shadcn Sheet with side="bottom"
<Sheet>
  <SheetTrigger asChild>
    <Button className="md:hidden">Filters</Button>
  </SheetTrigger>
  <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
    <FilterPanel />
  </SheetContent>
</Sheet>
```

#### Responsive Data Table (Admin)
```tsx
// Hide low-priority columns on mobile
const columns = [
  { id: "name",   enableHiding: false },          // always visible
  { id: "email",  meta: { hideOnMobile: true } },  // hidden on mobile
  { id: "status", enableHiding: false },           // always visible
  { id: "amount", meta: { hideOnMobile: true } },
  { id: "actions",enableHiding: false },
]

// In column visibility logic:
const isMobile = useMediaQuery("(max-width: 768px)")
const columnVisibility = isMobile
  ? { email: false, amount: false }
  : {}
```

#### Conditional Rendering by Breakpoint
```tsx
// useMediaQuery custom hook
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    const listener = () => setMatches(media.matches)
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [query])
  return matches
}

// Usage
const isMobile = useMediaQuery("(max-width: 768px)")
return isMobile ? <MobileNav /> : <DesktopNav />
```

---

### 9.5 Touch & Gesture UX

| Interaction | Implementation |
|-------------|----------------|
| Swipe carousel (hero, category strips) | `embla-carousel-react` with touch support |
| Pinch-to-zoom seat map | `react-zoom-pan-pinch` |
| Pull-to-refresh (booking history) | Custom hook with touch events |
| Swipe to dismiss notification | Framer Motion drag gesture |
| Long press for bulk select (admin) | `useRef` + `setTimeout` on `touchstart` |
| Haptic feedback on seat select | `navigator.vibrate(50)` |
| Swipe tabs (event detail) | `embla-carousel-react` with snap |

---

### 9.6 Mobile Performance Plan

| Concern | Strategy |
|---------|----------|
| Image loading | `loading="lazy"` + WebP format from R2/Cloudflare CDN |
| Image sizing | `srcSet` with 3 sizes: 400w, 800w, 1200w |
| Bundle size | Route-based code splitting via TanStack Router lazy routes |
| Font loading | `font-display: swap`, preload critical fonts |
| JS hydration | Vite bundle analysis; keep initial bundle < 200KB |
| Offline support | Service Worker for ticket QR caching (PWA) |
| Low-bandwidth | Skeleton loaders on all list/card components |
| Scroll performance | TanStack Virtual for long event lists |
| Animation | `prefers-reduced-motion` check for all CSS animations |

---

### 9.7 PWA (Progressive Web App) Plan

Convert the user-facing portal into an installable PWA so users can add it to their home screen like a native app — no App Store needed.

| Feature | Implementation |
|---------|----------------|
| Install prompt | `beforeinstallprompt` event + custom install banner |
| App manifest | `manifest.json` with icons, theme color, `display: standalone` |
| Offline page | Service Worker caches the shell + `/my-tickets` route |
| Ticket QR offline | Cache ticket QR images in SW cache after download |
| Push notifications | Web Push API + VAPID keys (via backend `/notifications/subscribe`) |
| Splash screen | Defined in `manifest.json` |
| Theme color | Matches brand color in status bar on Android |

**manifest.json example:**
```json
{
  "name": "TicketFlow",
  "short_name": "TicketFlow",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

### 9.8 Accessibility on Mobile

| Concern | Implementation |
|---------|----------------|
| Tap target size | Minimum 44×44px on all buttons and interactive elements |
| Focus management | Trap focus inside modals and bottom sheets |
| Screen reader | Semantic HTML: `<nav>`, `<main>`, `<section>`, `aria-label` |
| Color contrast | WCAG AA minimum (4.5:1 for text) |
| Seat map accessibility | `aria-label="Seat A3 — Available — ₹499"` on each seat |
| Form labels | Every input has a visible `<label>` or `aria-label` |
| Error messages | `aria-live="polite"` regions for form errors |
| Dark mode | Tailwind `dark:` classes + `prefers-color-scheme` media query |

---

### 9.9 Responsive Testing Checklist

#### Devices to test on
- iPhone SE (375px) — smallest supported
- iPhone 14 Pro (393px) — most common iOS
- Samsung Galaxy S23 (360px) — most common Android
- iPad Mini (768px) — tablet portrait
- iPad Pro 12.9" (1024px) — tablet landscape
- MacBook 13" (1280px) — small laptop
- Full HD (1920px) — desktop

#### Testing tools
- Chrome DevTools device emulator (during development)
- BrowserStack / LambdaTest for real device testing
- Lighthouse mobile audit (target score > 90)
- axe DevTools for accessibility

#### Key checks per page
- [ ] No horizontal overflow / scroll at any breakpoint
- [ ] All tap targets ≥ 44px
- [ ] Bottom navigation does not overlap content
- [ ] Sticky elements do not cover main content
- [ ] Modals and drawers scroll internally, not the page
- [ ] Seat map is usable with pinch-to-zoom
- [ ] Forms are usable with mobile keyboard visible
- [ ] No text is truncated unintentionally on small screens

---

## 10. Free Deployment Strategy

### Frontend — Vercel (Free Tier)
- Deploy React/Vite app to Vercel
- Automatic CI/CD from GitHub
- Custom domain support
- Preview deployments per PR
- Free: 100GB bandwidth/month, unlimited static sites

### Backend — Render (Free Tier)
- Deploy Hono Node.js server to Render
- Free: 750 hours/month (enough for 1 service)
- Auto-deploy from GitHub
- Environment variables support
- **Note:** Free tier sleeps after 15 min inactivity
- **Alternative:** Railway (500 hours free) or Fly.io (256MB free VM)

### Database — Neon PostgreSQL (Free Tier)
- Serverless PostgreSQL, free tier: 0.5 GB storage
- Branching support for dev/staging
- Auto-suspend when idle (cost saving)
- Drizzle ORM connects directly via connection pooling

### Cache — Upstash Redis (Free Tier)
- Free: 10,000 commands/day, 256MB storage
- Used for: seat locks, session cache, rate limiting
- HTTP-based Redis (works from Render/Vercel edge)

### File Storage — Cloudflare R2 (Free Tier)
- Free: 10 GB storage, 1M Class A operations/month
- Store: ticket PDFs, event banners, QR codes, venue images
- S3-compatible API (works with AWS SDK)

### Search — Meilisearch Cloud (Free Tier)
- Free: 100K documents, 10K searches/month
- Instant search for events, venues
- **Alternative:** Use PostgreSQL full-text search for free with `pg_trgm`

### Email — Resend (Free Tier)
- Free: 3,000 emails/month, 100/day limit
- Used for: booking confirmation, OTP, reminders
- **Alternative:** Brevo (formerly Sendinblue) — 300 free emails/day

### Queues — Upstash QStash (Free Tier)
- Free: 500 messages/day for background jobs
- **Alternative:** Use pg-boss (queue in PostgreSQL) to avoid Redis cost

### Payments — Razorpay (No monthly fee)
- Only pay transaction fee (2% per transaction)
- Test mode available for development

### Summary Table

| Service | Provider | Free Limit |
|---------|----------|------------|
| Frontend | Vercel | Unlimited |
| Backend | Render | 750 hrs/mo |
| PostgreSQL | Neon | 0.5 GB |
| Redis | Upstash | 256 MB |
| Storage | Cloudflare R2 | 10 GB |
| Search | Meilisearch Cloud | 100K docs |
| Email | Resend | 3K/mo |
| Payments | Razorpay | 2% txn fee |

### Environment Setup

```
Development:   Local Node + Local PostgreSQL + Docker Redis
Staging:       Neon branch + Render preview + Vercel preview
Production:    Neon main + Render + Vercel + Upstash + R2
```

---

## 11. Development Roadmap

### Phase 1 — Foundation (Weeks 1–2)
- [ ] Project scaffolding (monorepo or separate repos)
- [ ] DB schema design + Drizzle migrations
- [ ] Auth system (register, login, JWT, refresh tokens)
- [ ] Hono server setup with middleware stack
- [ ] TanStack Router + Query setup
- [ ] Basic UI components (shadcn/ui)
- [ ] CI/CD pipeline setup (GitHub Actions)

### Phase 2 — Core Catalog (Weeks 3–4)
- [ ] Category, City, Venue APIs + UI
- [ ] Event CRUD APIs + organizer event creation form
- [ ] Show and Ticket Tier management
- [ ] Event detail page with shows selector
- [ ] Basic search (PostgreSQL full-text)

### Phase 3 — Booking Engine (Weeks 5–6)
- [ ] Seat map rendering + interactive selection
- [ ] Redis seat locking + WebSocket real-time updates
- [ ] Countdown timer component
- [ ] Booking initiation and summary page
- [ ] Razorpay payment integration
- [ ] Booking confirmation + e-ticket generation

### Phase 4 — Tickets & Notifications (Week 7)
- [ ] QR code generation
- [ ] PDF ticket generation (PDFKit or @react-pdf/renderer)
- [ ] Email notifications (booking, cancellation, reminder)
- [ ] BullMQ worker setup for background jobs

### Phase 5 — Organizer Portal (Week 8)
- [ ] Organizer dashboard (stats, revenue)
- [ ] Venue management UI
- [ ] Event analytics
- [ ] Check-in QR scanner
- [ ] Coupon management

### Phase 6 — Admin Panel (Week 9)
- [ ] Admin dashboard with KPIs
- [ ] User management with TanStack Table
- [ ] Event/Venue approval flows
- [ ] Booking and payment management
- [ ] Audit logs
- [ ] Platform settings

### Phase 7 — Polish & Deploy (Week 10)
- [ ] Meilisearch integration for fast search
- [ ] Cloudflare R2 file uploads
- [ ] Mobile responsive UI audit
- [ ] Performance optimization (query caching, lazy loading)
- [ ] Full production deployment
- [ ] Load testing and bug fixes

---

## Appendix: Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Auth strategy | JWT + Refresh Token | Stateless, works with free infra |
| Seat locking | Redis TTL + WebSocket | Low latency, real-time UX |
| File storage | Cloudflare R2 | Cheapest free tier S3-compatible |
| Search | Meilisearch / pg_trgm | Fast, typo-tolerant search |
| PDF generation | PDFKit (server) | QR + ticket layout control |
| Background jobs | BullMQ + Upstash | Reliable, free tier enough |
| DB driver | Drizzle ORM | Lightweight, type-safe, fast |
| API validation | Zod end-to-end | Shared types, runtime safety |
| Monorepo | Turborepo (optional) | Share Zod schemas between FE/BE |

---

*Document Version: 1.1 | Created for TicketFlow Booking Platform*

start implementation usinig the .env file the data used for the code purpouse