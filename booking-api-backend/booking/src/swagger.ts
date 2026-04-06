export function buildSwaggerDocument(apiBaseUrl: string, frontendUrl: string) {
  return {
    openapi: "3.0.0",
    info: {
      title: "TicketFlow API",
      version: "1.0.0",
      description: `Complete REST API for TicketFlow — event ticketing platform.\n\n**Frontend:** ${frontendUrl}\n\n**Auth:** Use \`POST /auth/login\` to get a Bearer token, then click **Authorize** above.`,
      contact: { name: "TicketFlow Support" },
    },
    servers: [
      { url: `${apiBaseUrl}/api/v1`, description: "API Server" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        ApiSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
            message: { type: "string" },
          },
        },
        ApiError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer" },
            limit: { type: "integer" },
            total: { type: "integer" },
            totalPages: { type: "integer" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "System", description: "Health check and API info" },
      { name: "Auth", description: "Authentication — register, login, tokens, profile" },
      { name: "Events", description: "Event listing, details, shows, ticket tiers" },
      { name: "Venues", description: "Venue management and sections" },
      { name: "Categories", description: "Event categories" },
      { name: "Shows & Seats", description: "Seat maps and seat locking" },
      { name: "Bookings", description: "Booking flow — lock → order → payment → confirm" },
      { name: "Payments", description: "Payment gateway — mock confirm and webhook" },
      { name: "Tickets", description: "Ticket QR codes, PDFs, scanning" },
      { name: "Coupons", description: "Discount coupon management" },
      { name: "Search", description: "Full-text search and autocomplete" },
      { name: "Locations", description: "Cities and location-based events" },
      { name: "Uploads", description: "File uploads — images, banners, avatars" },
      { name: "Reviews", description: "Event reviews" },
      { name: "Notifications", description: "In-app notifications" },
      { name: "Organizer", description: "Organizer dashboard — events, revenue, attendees" },
      { name: "Admin", description: "Admin panel — users, events, venues, analytics" },
    ],
    paths: {
      // ── System ─────────────────────────────────────────────────────────────
      "/health": {
        get: {
          tags: ["System"], summary: "Health check", security: [],
          responses: {
            "200": { description: "All services healthy" },
            "503": { description: "One or more services down" },
          },
        },
      },

      // ── Auth ───────────────────────────────────────────────────────────────
      "/auth/register": {
        post: {
          tags: ["Auth"], summary: "Register new user", security: [],
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["name", "email", "password"],
            properties: {
              name: { type: "string", minLength: 2, example: "John Doe" },
              email: { type: "string", format: "email", example: "john@example.com" },
              password: { type: "string", minLength: 6, example: "password123" },
            },
          }}}},
          responses: { "201": { description: "Registration successful" }, "409": { description: "Email already in use" } },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"], summary: "Login", security: [],
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["email", "password"],
            properties: {
              email: { type: "string", format: "email", example: "john@example.com" },
              password: { type: "string", example: "password123" },
            },
          }}}},
          responses: { "200": { description: "Login successful — returns accessToken + refreshToken" }, "401": { description: "Invalid credentials" } },
        },
      },
      "/auth/logout": {
        post: { tags: ["Auth"], summary: "Logout (revoke token)", responses: { "200": { description: "Logged out" } } },
      },
      "/auth/refresh": {
        post: {
          tags: ["Auth"], summary: "Refresh access token", security: [],
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["refreshToken"],
            properties: { refreshToken: { type: "string" } },
          }}}},
          responses: { "200": { description: "New access + refresh tokens" }, "401": { description: "Invalid or expired refresh token" } },
        },
      },
      "/auth/forgot-password": {
        post: {
          tags: ["Auth"], summary: "Request password reset email", security: [],
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["email"],
            properties: { email: { type: "string", format: "email" } },
          }}}},
          responses: { "200": { description: "Reset email sent" } },
        },
      },
      "/auth/reset-password": {
        post: {
          tags: ["Auth"], summary: "Reset password with token", security: [],
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["token", "password"],
            properties: { token: { type: "string" }, password: { type: "string", minLength: 6 } },
          }}}},
          responses: { "200": { description: "Password updated" }, "400": { description: "Invalid or expired token" } },
        },
      },
      "/auth/verify-email": {
        post: {
          tags: ["Auth"], summary: "Verify email with OTP", security: [],
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["email", "otp"],
            properties: { email: { type: "string", format: "email" }, otp: { type: "string" } },
          }}}},
          responses: { "200": { description: "Email verified" }, "400": { description: "Invalid OTP" } },
        },
      },
      "/auth/resend-otp": {
        post: {
          tags: ["Auth"], summary: "Resend verification OTP", security: [],
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["email"],
            properties: { email: { type: "string", format: "email" } },
          }}}},
          responses: { "200": { description: "OTP sent" } },
        },
      },
      "/auth/me": {
        get: { tags: ["Auth"], summary: "Get my profile", responses: { "200": { description: "User profile" }, "401": { description: "Unauthorized" } } },
        put: {
          tags: ["Auth"], summary: "Update my profile (name, phone)",
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object",
            properties: { name: { type: "string" }, phoneNumber: { type: "string" } },
          }}}},
          responses: { "200": { description: "Profile updated" } },
        },
      },
      "/auth/me/password": {
        put: {
          tags: ["Auth"], summary: "Change password",
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["oldPassword", "newPassword"],
            properties: { oldPassword: { type: "string" }, newPassword: { type: "string", minLength: 6 } },
          }}}},
          responses: { "200": { description: "Password changed" }, "400": { description: "Wrong old password" } },
        },
      },

      // ── Categories ─────────────────────────────────────────────────────────
      "/categories": {
        get: { tags: ["Categories"], summary: "List active categories", security: [], responses: { "200": { description: "Category list" } } },
        post: {
          tags: ["Categories"], summary: "Create category (Admin)",
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["name"],
            properties: { name: { type: "string" }, description: { type: "string" }, imageUrl: { type: "string" } },
          }}}},
          responses: { "201": { description: "Category created" } },
        },
      },
      "/categories/all": {
        get: { tags: ["Categories"], summary: "List all categories including inactive (Admin)", responses: { "200": { description: "All categories" } } },
      },
      "/categories/{slug}": {
        get: {
          tags: ["Categories"], summary: "Get category by slug", security: [],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Category details" }, "404": { description: "Not found" } },
        },
      },
      "/categories/{id}": {
        put: {
          tags: ["Categories"], summary: "Update category (Admin)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, imageUrl: { type: "string" }, isActive: { type: "boolean" } } } } } },
          responses: { "200": { description: "Updated" } },
        },
        delete: {
          tags: ["Categories"], summary: "Delete category (Admin)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Deleted" } },
        },
      },

      // ── Events ─────────────────────────────────────────────────────────────
      "/events": {
        get: {
          tags: ["Events"], summary: "List events (public, paginated)", security: [],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
            { name: "category", in: "query", schema: { type: "string" }, description: "Category slug" },
            { name: "city", in: "query", schema: { type: "string" } },
            { name: "q", in: "query", schema: { type: "string" }, description: "Search query" },
          ],
          responses: { "200": { description: "Paginated event list" } },
        },
        post: {
          tags: ["Events"], summary: "Create event (Organizer)",
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["title"],
            properties: {
              title: { type: "string", example: "Rock Concert 2024" },
              description: { type: "string" },
              categoryId: { type: "string", format: "uuid" },
              venueId: { type: "string", format: "uuid" },
              language: { type: "string", example: "English" },
              ageRating: { type: "string", enum: ["U", "UA", "A"] },
              tags: { type: "array", items: { type: "string" } },
            },
          }}}},
          responses: { "201": { description: "Event created as draft" } },
        },
      },
      "/events/featured": {
        get: { tags: ["Events"], summary: "Get featured events", security: [], responses: { "200": { description: "Featured events" } } },
      },
      "/events/trending": {
        get: { tags: ["Events"], summary: "Get trending events", security: [], responses: { "200": { description: "Trending events" } } },
      },
      "/events/upcoming": {
        get: { tags: ["Events"], summary: "Get upcoming events", security: [], responses: { "200": { description: "Upcoming events" } } },
      },
      "/events/my": {
        get: { tags: ["Events"], summary: "Get my events (Organizer)", responses: { "200": { description: "Organizer's events" } } },
      },
      "/events/pending": {
        get: { tags: ["Events"], summary: "Get pending/draft events (Admin)", responses: { "200": { description: "Pending events" } } },
      },
      "/events/{slug}": {
        get: {
          tags: ["Events"], summary: "Get event by slug", security: [],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" }, example: "rock-concert-2024" }],
          responses: { "200": { description: "Event details" }, "404": { description: "Not found" } },
        },
      },
      "/events/{id}": {
        put: {
          tags: ["Events"], summary: "Update event (Organizer)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } } } } } },
          responses: { "200": { description: "Event updated" } },
        },
        delete: {
          tags: ["Events"], summary: "Delete event (Organizer)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Event deleted" } },
        },
      },
      "/events/{id}/publish": {
        post: {
          tags: ["Events"], summary: "Publish event (Organizer)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Event published" } },
        },
      },
      "/events/{id}/cancel": {
        post: {
          tags: ["Events"], summary: "Cancel event (Organizer)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Event cancelled" } },
        },
      },
      "/events/{id}/feature": {
        post: {
          tags: ["Events"], summary: "Toggle featured flag (Admin)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["featured"], properties: { featured: { type: "boolean" } } } } } },
          responses: { "200": { description: "Featured status toggled" } },
        },
      },
      "/events/{id}/reject": {
        post: {
          tags: ["Events"], summary: "Reject event (Admin)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Event rejected" } },
        },
      },
      "/events/{slug}/shows": {
        get: {
          tags: ["Events"], summary: "Get shows for an event", security: [],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "List of shows" } },
        },
      },
      "/events/{id}/shows": {
        post: {
          tags: ["Events"], summary: "Add show to event (Organizer)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["showDate", "showTime"],
            properties: {
              showDate: { type: "string", example: "2024-12-31" },
              showTime: { type: "string", example: "19:00:00" },
            },
          }}}},
          responses: { "201": { description: "Show created" } },
        },
      },
      "/events/{id}/shows/{showId}": {
        put: {
          tags: ["Events"], summary: "Update show (Organizer)",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "showId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { showDate: { type: "string" }, showTime: { type: "string" } } } } } },
          responses: { "200": { description: "Show updated" } },
        },
        delete: {
          tags: ["Events"], summary: "Delete show (Organizer)",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "showId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Show deleted" } },
        },
      },
      "/events/{id}/shows/{showId}/tiers": {
        post: {
          tags: ["Events"], summary: "Add ticket tier to show (Organizer)",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "showId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["name", "price", "totalQuantity"],
            properties: {
              name: { type: "string", example: "General" },
              price: { type: "number", example: 499 },
              totalQuantity: { type: "integer", example: 200 },
              maxPerBooking: { type: "integer", example: 6 },
              sectionId: { type: "string", format: "uuid" },
            },
          }}}},
          responses: { "201": { description: "Tier created" } },
        },
      },
      "/events/{id}/shows/{showId}/tiers/{tierId}": {
        put: {
          tags: ["Events"], summary: "Update ticket tier (Organizer)",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "showId", in: "path", required: true, schema: { type: "string" } },
            { name: "tierId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, price: { type: "number" } } } } } },
          responses: { "200": { description: "Tier updated" } },
        },
        delete: {
          tags: ["Events"], summary: "Delete ticket tier (Organizer)",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "showId", in: "path", required: true, schema: { type: "string" } },
            { name: "tierId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Tier deleted" } },
        },
      },

      // ── Venues ─────────────────────────────────────────────────────────────
      "/venues": {
        get: {
          tags: ["Venues"], summary: "List venues (public)", security: [],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "city", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Venue list" } },
        },
        post: {
          tags: ["Venues"], summary: "Create venue (Organizer — pending approval)",
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["name", "address", "city", "state", "capacity"],
            properties: {
              name: { type: "string", example: "Grand Auditorium" },
              address: { type: "string", example: "123 Main Street" },
              city: { type: "string", example: "Mumbai" },
              state: { type: "string", example: "Maharashtra" },
              capacity: { type: "integer", example: 1000 },
            },
          }}}},
          responses: { "201": { description: "Venue created (pending approval)" } },
        },
      },
      "/venues/pending": {
        get: { tags: ["Venues"], summary: "List pending venue approvals (Admin)", responses: { "200": { description: "Pending venues" } } },
      },
      "/venues/{id}": {
        get: {
          tags: ["Venues"], summary: "Get venue details", security: [],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Venue details" }, "404": { description: "Not found" } },
        },
        put: {
          tags: ["Venues"], summary: "Update venue (Organizer)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, address: { type: "string" }, capacity: { type: "integer" } } } } } },
          responses: { "200": { description: "Venue updated" } },
        },
        delete: {
          tags: ["Venues"], summary: "Delete venue (Organizer)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Venue deleted" } },
        },
      },
      "/venues/{id}/approve": {
        post: {
          tags: ["Venues"], summary: "Approve venue (Admin)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Venue approved" } },
        },
      },
      "/venues/{id}/reject": {
        post: {
          tags: ["Venues"], summary: "Reject venue (Admin)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Venue rejected and deleted" } },
        },
      },
      "/venues/{id}/sections": {
        get: {
          tags: ["Venues"], summary: "Get venue sections", security: [],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Sections list" } },
        },
        post: {
          tags: ["Venues"], summary: "Add section to venue (Organizer)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["name", "totalSeats"],
            properties: { name: { type: "string", example: "Ground Floor" }, totalSeats: { type: "integer", example: 200 } },
          }}}},
          responses: { "201": { description: "Section added" } },
        },
      },
      "/venues/{id}/sections/{sId}": {
        put: {
          tags: ["Venues"], summary: "Update venue section (Organizer)",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "sId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, totalSeats: { type: "integer" } } } } } },
          responses: { "200": { description: "Section updated" } },
        },
        delete: {
          tags: ["Venues"], summary: "Delete venue section (Organizer)",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "sId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Section deleted" } },
        },
      },

      // ── Shows & Seats ──────────────────────────────────────────────────────
      "/shows/{showId}/seats": {
        get: {
          tags: ["Shows & Seats"], summary: "Get seat map with availability", security: [],
          parameters: [{ name: "showId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Seat map by section" } },
        },
      },
      "/shows/{showId}/availability": {
        get: {
          tags: ["Shows & Seats"], summary: "Get availability summary per section", security: [],
          parameters: [{ name: "showId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Availability summary" } },
        },
      },
      "/shows/{showId}/seats/lock": {
        post: {
          tags: ["Shows & Seats"], summary: "Lock seats for 10 minutes",
          parameters: [{ name: "showId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["userId", "seatIds"],
            properties: { userId: { type: "string" }, seatIds: { type: "array", items: { type: "string" } } },
          }}}},
          responses: { "200": { description: "Seats locked" }, "409": { description: "Seat already locked" } },
        },
      },
      "/shows/{showId}/seats/unlock": {
        delete: {
          tags: ["Shows & Seats"], summary: "Unlock seats",
          parameters: [{ name: "showId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Seats unlocked" } },
        },
      },

      // ── Bookings ───────────────────────────────────────────────────────────
      "/bookings/shows/{showId}/availability": {
        get: {
          tags: ["Bookings"], summary: "Get show tier availability", security: [],
          parameters: [{ name: "showId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Show availability with tiers" } },
        },
      },
      "/bookings/lock": {
        post: {
          tags: ["Bookings"], summary: "Lock tier quantities (advisory, 10 min)",
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["showId", "items"],
            properties: {
              showId: { type: "string", format: "uuid" },
              items: { type: "array", items: { type: "object", properties: { tierId: { type: "string", format: "uuid" }, quantity: { type: "integer", minimum: 1 } }, required: ["tierId", "quantity"] } },
            },
          }}}},
          responses: { "200": { description: "Lock acquired — returns lockId and expiresAt" }, "409": { description: "Insufficient seats" } },
        },
      },
      "/bookings/validate-coupon": {
        post: {
          tags: ["Bookings"], summary: "Validate coupon code",
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["code", "amount"],
            properties: { code: { type: "string", example: "SAVE10" }, amount: { type: "number", example: 1000 } },
          }}}},
          responses: { "200": { description: "Coupon validation result" } },
        },
      },
      "/bookings/create-order": {
        post: {
          tags: ["Bookings"], summary: "Create order + pending booking",
          description: "Returns `mock_order_xxx` when MOCK_PAYMENT=true, real Razorpay order ID otherwise.",
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["showId", "lockId", "items"],
            properties: {
              showId: { type: "string", format: "uuid" },
              lockId: { type: "string" },
              items: { type: "array", items: { type: "object", properties: { tierId: { type: "string", format: "uuid" }, quantity: { type: "integer" } }, required: ["tierId", "quantity"] } },
              couponCode: { type: "string", example: "SAVE10" },
            },
          }}}},
          responses: { "201": { description: "Order created — returns bookingId, orderId, amount" }, "409": { description: "Lock expired or insufficient seats" } },
        },
      },
      "/bookings/verify-payment": {
        post: {
          tags: ["Bookings"], summary: "Verify payment and confirm booking",
          description: "In mock mode, signature is not required.",
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["bookingId", "razorpayOrderId", "razorpayPaymentId"],
            properties: {
              bookingId: { type: "string", format: "uuid" },
              razorpayOrderId: { type: "string" },
              razorpayPaymentId: { type: "string" },
              razorpaySignature: { type: "string", description: "Optional in mock mode" },
            },
          }}}},
          responses: { "200": { description: "Booking confirmed" }, "400": { description: "Payment verification failed" } },
        },
      },
      "/bookings/my": {
        get: {
          tags: ["Bookings"], summary: "List my bookings",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          ],
          responses: { "200": { description: "My bookings list with pagination" } },
        },
      },
      "/bookings/{id}": {
        get: {
          tags: ["Bookings"], summary: "Get booking detail",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Booking details with tickets" }, "404": { description: "Not found" } },
        },
      },
      "/bookings/{id}/cancel": {
        post: {
          tags: ["Bookings"], summary: "Cancel booking",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Booking cancelled" }, "409": { description: "Cannot cancel" } },
        },
      },
      "/bookings/{id}/tickets": {
        get: {
          tags: ["Bookings"], summary: "Get all tickets for a booking",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Tickets list with QR and PDF URLs" } },
        },
      },
      "/bookings/admin/show/{showId}": {
        get: {
          tags: ["Bookings"], summary: "Admin: all bookings for a show",
          parameters: [{ name: "showId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Show bookings" } },
        },
      },

      // ── Payments ───────────────────────────────────────────────────────────
      "/payments/mock-confirm": {
        post: {
          tags: ["Payments"], summary: "Mock confirm booking (dev only — MOCK_PAYMENT=true)", security: [],
          description: "Instantly confirms a pending booking without real payment. Disabled when MOCK_PAYMENT=false.",
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["bookingId"],
            properties: { bookingId: { type: "string", format: "uuid" } },
          }}}},
          responses: { "200": { description: "Booking confirmed" }, "403": { description: "Mock payments disabled" }, "404": { description: "Booking not found" } },
        },
      },
      "/payments/webhook": {
        post: {
          tags: ["Payments"], summary: "Razorpay webhook (production only)", security: [],
          description: "Handles payment.captured, payment.failed, refund.processed events from Razorpay.",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: { "200": { description: "Webhook received" }, "401": { description: "Invalid signature" } },
        },
      },

      // ── Tickets ────────────────────────────────────────────────────────────
      "/tickets/{code}/qr": {
        get: {
          tags: ["Tickets"], summary: "Get ticket QR code as PNG image", security: [],
          parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" }, example: "TKT-ABC123-XY" }],
          responses: { "200": { description: "QR code PNG", content: { "image/png": { schema: { type: "string", format: "binary" } } } } },
        },
      },
      "/tickets/{code}": {
        get: {
          tags: ["Tickets"], summary: "Get ticket details",
          parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Ticket info with status, QR URL, PDF URL" }, "404": { description: "Not found" } },
        },
      },
      "/tickets/{code}/download": {
        get: {
          tags: ["Tickets"], summary: "Download ticket as PDF",
          parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "PDF file", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } } },
        },
      },
      "/tickets/{code}/scan": {
        post: {
          tags: ["Tickets"], summary: "Scan / check-in ticket (Organizer)",
          parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Ticket scanned successfully" }, "400": { description: "Already scanned or cancelled" } },
        },
      },

      // ── Coupons ────────────────────────────────────────────────────────────
      "/coupons": {
        get: { tags: ["Coupons"], summary: "List coupons (Admin: all, Organizer: own)", responses: { "200": { description: "Coupon list" } } },
        post: {
          tags: ["Coupons"], summary: "Create coupon (Organizer/Admin)",
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["code", "type", "value"],
            properties: {
              code: { type: "string", example: "SAVE10" },
              type: { type: "string", enum: ["flat", "percent", "bogo"] },
              value: { type: "number", example: 10 },
              minOrderAmount: { type: "number" },
              maxUses: { type: "integer" },
              validFrom: { type: "string", format: "date-time" },
              validUntil: { type: "string", format: "date-time" },
            },
          }}}},
          responses: { "201": { description: "Coupon created" } },
        },
      },
      "/coupons/my": {
        get: { tags: ["Coupons"], summary: "List my coupons (Organizer)", responses: { "200": { description: "Organizer's coupons" } } },
      },
      "/coupons/{id}": {
        put: {
          tags: ["Coupons"], summary: "Update coupon",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { isActive: { type: "boolean" }, maxUses: { type: "integer" } } } } } },
          responses: { "200": { description: "Coupon updated" } },
        },
        delete: {
          tags: ["Coupons"], summary: "Delete coupon",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Coupon deleted" } },
        },
      },

      // ── Search ─────────────────────────────────────────────────────────────
      "/search": {
        get: {
          tags: ["Search"], summary: "Search events and venues", security: [],
          parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" }, example: "rock concert" }],
          responses: { "200": { description: "Search results" } },
        },
      },
      "/search/suggestions": {
        get: {
          tags: ["Search"], summary: "Autocomplete suggestions", security: [],
          parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" }, example: "rock" }],
          responses: { "200": { description: "Suggestion list" } },
        },
      },

      // ── Locations ──────────────────────────────────────────────────────────
      "/locations/cities": {
        get: { tags: ["Locations"], summary: "List supported cities", security: [], responses: { "200": { description: "City list" } } },
      },
      "/locations/detect": {
        get: { tags: ["Locations"], summary: "Detect city from IP", security: [], responses: { "200": { description: "Detected city" } } },
      },
      "/locations/events/by-city/{city}": {
        get: {
          tags: ["Locations"], summary: "Events by city", security: [],
          parameters: [
            { name: "city", in: "path", required: true, schema: { type: "string" }, example: "Mumbai" },
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": { description: "Events in city" } },
        },
      },

      // ── Uploads ────────────────────────────────────────────────────────────
      "/uploads/venue/{venueId}/images": {
        post: {
          tags: ["Uploads"], summary: "Upload venue image (Organizer)",
          parameters: [{ name: "venueId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", properties: { image: { type: "string", format: "binary" } }, required: ["image"] } } } },
          responses: { "201": { description: "Image uploaded — returns public URL" } },
        },
      },
      "/uploads/events/{eventId}/banner": {
        post: {
          tags: ["Uploads"], summary: "Upload event banner (Organizer/Admin)",
          parameters: [{ name: "eventId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", properties: { banner: { type: "string", format: "binary" } }, required: ["banner"] } } } },
          responses: { "201": { description: "Banner uploaded — returns public URL" } },
        },
      },
      "/uploads/avatar": {
        post: {
          tags: ["Uploads"], summary: "Upload user avatar",
          requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", properties: { avatar: { type: "string", format: "binary" } }, required: ["avatar"] } } } },
          responses: { "201": { description: "Avatar uploaded — returns public URL" } },
        },
      },

      // ── Reviews ────────────────────────────────────────────────────────────
      "/reviews": {
        post: {
          tags: ["Reviews"], summary: "Submit event review (requires confirmed booking)",
          requestBody: { required: true, content: { "application/json": { schema: {
            type: "object", required: ["eventId", "rating"],
            properties: {
              eventId: { type: "string", format: "uuid" },
              rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
              content: { type: "string", example: "Amazing show!" },
            },
          }}}},
          responses: { "201": { description: "Review submitted" }, "403": { description: "No confirmed booking for this event" } },
        },
      },
      "/reviews/event/{eventId}": {
        get: {
          tags: ["Reviews"], summary: "List reviews for event", security: [],
          parameters: [{ name: "eventId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Reviews list" } },
        },
      },
      "/reviews/{id}": {
        put: {
          tags: ["Reviews"], summary: "Update own review",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { rating: { type: "integer" }, content: { type: "string" } } } } } },
          responses: { "200": { description: "Review updated" } },
        },
        delete: {
          tags: ["Reviews"], summary: "Delete own review",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Review deleted" } },
        },
      },

      // ── Notifications ──────────────────────────────────────────────────────
      "/notifications/my": {
        get: { tags: ["Notifications"], summary: "Get my notifications", responses: { "200": { description: "Notifications list" } } },
      },
      "/notifications/read-all": {
        patch: { tags: ["Notifications"], summary: "Mark all notifications as read", responses: { "200": { description: "All marked read" } } },
      },
      "/notifications/{id}/read": {
        patch: {
          tags: ["Notifications"], summary: "Mark notification as read",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Marked as read" } },
        },
      },
      "/notifications/{id}": {
        delete: {
          tags: ["Notifications"], summary: "Delete notification",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Notification deleted" } },
        },
      },

      // ── Organizer ──────────────────────────────────────────────────────────
      "/organizer/register": {
        post: { tags: ["Organizer"], summary: "Register as organizer", responses: { "200": { description: "Organizer status granted" } } },
      },
      "/organizer/dashboard": {
        get: { tags: ["Organizer"], summary: "Organizer dashboard stats", responses: { "200": { description: "Stats: events, bookings, revenue" } } },
      },
      "/organizer/events": {
        get: { tags: ["Organizer"], summary: "List my events", responses: { "200": { description: "Events list" } } },
      },
      "/organizer/revenue": {
        get: {
          tags: ["Organizer"], summary: "Revenue report",
          parameters: [{ name: "period", in: "query", schema: { type: "string", enum: ["7d", "30d", "90d", "1y"] } }],
          responses: { "200": { description: "Revenue analytics" } },
        },
      },
      "/organizer/attendees": {
        get: {
          tags: ["Organizer"], summary: "Attendee list",
          parameters: [{ name: "eventId", in: "query", schema: { type: "string" } }],
          responses: { "200": { description: "Attendees with booking info" } },
        },
      },
      "/organizer/events/{eventId}/check-in": {
        get: {
          tags: ["Organizer"], summary: "Check-in stats for event shows",
          parameters: [{ name: "eventId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Check-in stats per show" } },
        },
      },

      // ── Admin ──────────────────────────────────────────────────────────────
      "/admin/stats": {
        get: { tags: ["Admin"], summary: "Platform overview stats", responses: { "200": { description: "Total users, events, revenue, bookings" } } },
      },
      "/admin/users": {
        get: {
          tags: ["Admin"], summary: "List all users",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "q", in: "query", schema: { type: "string" }, description: "Search by name or email" },
          ],
          responses: { "200": { description: "Users list" } },
        },
      },
      "/admin/users/{id}": {
        get: {
          tags: ["Admin"], summary: "Get user details",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "User detail" } },
        },
        patch: {
          tags: ["Admin"], summary: "Update user",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, role: { type: "string", enum: ["user", "organizer", "admin"] } } } } } },
          responses: { "200": { description: "User updated" } },
        },
        delete: {
          tags: ["Admin"], summary: "Delete user",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "User deleted" } },
        },
      },
      "/admin/users/{id}/ban": {
        post: {
          tags: ["Admin"], summary: "Ban user",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "User banned" } },
        },
      },
      "/admin/users/{id}/unban": {
        post: {
          tags: ["Admin"], summary: "Unban user",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "User unbanned" } },
        },
      },
      "/admin/events": {
        get: {
          tags: ["Admin"], summary: "List all events",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "status", in: "query", schema: { type: "string", enum: ["draft", "published", "cancelled", "completed"] } },
          ],
          responses: { "200": { description: "Events list" } },
        },
      },
      "/admin/events/{id}/approve": {
        post: {
          tags: ["Admin"], summary: "Approve and publish event",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Event approved" } },
        },
      },
      "/admin/events/{id}/feature": {
        post: {
          tags: ["Admin"], summary: "Toggle event featured",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["featured"], properties: { featured: { type: "boolean" } } } } } },
          responses: { "200": { description: "Featured status toggled" } },
        },
      },
      "/admin/events/{id}/cancel": {
        post: {
          tags: ["Admin"], summary: "Cancel event",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Event cancelled" } },
        },
      },
      "/admin/venues": {
        get: { tags: ["Admin"], summary: "List all venues", responses: { "200": { description: "Venues list" } } },
      },
      "/admin/venues/{id}/approve": {
        post: {
          tags: ["Admin"], summary: "Approve venue",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Venue approved" } },
        },
      },
      "/admin/venues/{id}/reject": {
        post: {
          tags: ["Admin"], summary: "Reject venue",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Venue rejected" } },
        },
      },
      "/admin/analytics/revenue": {
        get: { tags: ["Admin"], summary: "Revenue analytics", responses: { "200": { description: "Revenue by period" } } },
      },
      "/admin/analytics/users": {
        get: { tags: ["Admin"], summary: "User growth analytics", responses: { "200": { description: "User registrations over time" } } },
      },
      "/admin/analytics/events": {
        get: { tags: ["Admin"], summary: "Event analytics", responses: { "200": { description: "Events by status, category, city" } } },
      },
      "/admin/analytics/cities": {
        get: { tags: ["Admin"], summary: "City-wise analytics", responses: { "200": { description: "Revenue and bookings per city" } } },
      },
      "/admin/audit-logs": {
        get: {
          tags: ["Admin"], summary: "Audit log viewer",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "userId", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Audit logs" } },
        },
      },
      "/admin/settings": {
        get: { tags: ["Admin"], summary: "Get platform settings", responses: { "200": { description: "Settings" } } },
        put: {
          tags: ["Admin"], summary: "Update platform settings",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: { "200": { description: "Settings updated" } },
        },
      },
      "/admin/maintenance": {
        post: {
          tags: ["Admin"], summary: "Toggle maintenance mode",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["enabled"], properties: { enabled: { type: "boolean" } } } } } },
          responses: { "200": { description: "Maintenance mode toggled" } },
        },
      },
      "/admin/coupons": {
        get: { tags: ["Admin"], summary: "List all coupons", responses: { "200": { description: "All coupons" } } },
      },
    },
  };
}

// Static export for backwards compatibility
export const swaggerDocument = buildSwaggerDocument(
  "http://localhost:3001",
  "http://localhost:5173"
);
