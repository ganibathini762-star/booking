import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { apiSuccess, apiError } from "../utils/response.js";
import { generateQrBuffer } from "../utils/qrcode.js";
import { db } from "../config/db.js";
import { requireOrganizer } from "../middleware/roleGuard.js";
import { tickets as ticketsTable, bookings as bookingsTable } from "../db/schema/index.js";
import { generateTicketPdf, type TicketPdfData } from "../services/ticket.service.js";
import { AppBindings } from "../types/index.js";

const ticketsRouter = new Hono<AppBindings>();

// ── QR code PNG for a ticket code (public) ──
ticketsRouter.get("/:code/qr", async (c) => {
  const { code } = c.req.param();

  const ticket = await db.query.tickets.findFirst({
    where: eq(ticketsTable.ticketCode, code),
    with: {
      bookingItem: {
        with: {
          booking: true,
        },
      },
    },
  });

  if (!ticket) return apiError(c, "NOT_FOUND", "Ticket not found", 404);

  const qrData = ticket.qrUrl ?? code;
  const buf = await generateQrBuffer(qrData);

  return c.body(new Uint8Array(buf), 200, {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=3600",
  });
});

// ── Get ticket details (authenticated) ──
ticketsRouter.get("/:code", authMiddleware, async (c) => {
  const user = c.get("user");
  const { code } = c.req.param();

  const ticket = await db.query.tickets.findFirst({
    where: eq(ticketsTable.ticketCode, code),
    with: {
      bookingItem: {
        with: {
          booking: true,
          tier: true,
          seat: true,
        },
      },
    },
  });

  if (!ticket || !ticket.bookingItem?.booking || ticket.bookingItem.booking.userId !== user.id) {
    return apiError(c, "NOT_FOUND", "Ticket not found", 404);
  }

  const { bookingItem } = ticket;
  const booking = bookingItem.booking;
  
  // Re-fetch with full relations if needed, or rely on worker generation for PDF
  // For details, we'll just return what we have
  return apiSuccess(c, {
    ticketCode: ticket.ticketCode,
    status: ticket.status,
    qrUrl: ticket.qrUrl,
    pdfUrl: ticket.pdfUrl,
    scannedAt: ticket.scannedAt,
    tierName: bookingItem.tier?.name,
    seatInfo: bookingItem.seat ? `${bookingItem.seat.row}-${bookingItem.seat.seatNumber}` : null,
  });
});

// ── Download ticket PDF ──
ticketsRouter.get("/:code/download", authMiddleware, async (c) => {
  const user = c.get("user");
  const { code } = c.req.param();

  const ticket = await db.query.tickets.findFirst({
    where: eq(ticketsTable.ticketCode, code),
    with: {
      bookingItem: {
        with: {
          booking: {
            with: {
              show: {
                with: {
                  event: {
                    with: {
                      venue: true,
                    },
                  },
                },
              },
            },
          },
          tier: true,
          seat: true,
        },
      },
    },
  });

  if (!ticket || !ticket.bookingItem?.booking || ticket.bookingItem.booking.userId !== user.id) {
    return apiError(c, "NOT_FOUND", "Ticket not found", 404);
  }

  if (ticket.pdfUrl) {
    return apiSuccess(c, { pdfUrl: ticket.pdfUrl });
  }

  try {
    const booking = ticket.bookingItem.booking;
    const show = (booking as any).show;
    const event = show?.event;
    const venue = event?.venue;
    const tier = ticket.bookingItem.tier;

    if (!show || !event || !venue || !tier) {
       return apiError(c, "DATA_ERROR", "Incomplete ticket data", 500);
    }

    const pdfData: TicketPdfData = {
      ticketCode: ticket.ticketCode,
      eventTitle: event.title,
      eventDate: show.showDate,
      eventTime: show.showTime,
      venueName: venue.name,
      venueAddress: [venue.address, venue.city].filter(Boolean).join(", "),
      seatInfo: ticket.bookingItem.seat ? `Row ${ticket.bookingItem.seat.row}, Seat ${ticket.bookingItem.seat.seatNumber}` : undefined,
      tierName: tier.name,
      price: tier.price,
      bookingRef: booking.bookingRef,
      userName: (booking as any).user?.name || "Guest",
    };

    const pdfBuffer = await generateTicketPdf(pdfData);

    // Serve directly
    return c.body(new Uint8Array(pdfBuffer), 200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ticket-${ticket.ticketCode}.pdf"`,
    });
  } catch (err) {
    console.error("PDF download error:", err);
    return apiError(c, "SERVER_ERROR", "Failed to generate PDF", 500);
  }
});
// ── Scan ticket (organizer or admin) ──
ticketsRouter.post("/:code/scan", authMiddleware, requireOrganizer, async (c) => {
  const user = c.get("user");
  const { code } = c.req.param();

  const ticket = await db.query.tickets.findFirst({
    where: eq(ticketsTable.ticketCode, code),
    with: {
      bookingItem: {
        with: {
          booking: {
            with: {
              show: {
                with: {
                  event: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!ticket) return apiError(c, "NOT_FOUND", "Ticket not found", 404);
  if (ticket.status === "used") return apiError(c, "ALREADY_SCANNED", `Ticket already scanned at ${ticket.scannedAt}`, 400);
  if (ticket.status === "cancelled") return apiError(c, "CANCELLED", "Ticket is cancelled", 400);

  const event = (ticket.bookingItem?.booking as any)?.show?.event;
  if (!event) return apiError(c, "DATA_ERROR", "Incomplete ticket data", 500);

  // Check if user is organizer of this event or admin
  if (user.role !== "admin" && event.organizerId !== user.id) {
    return apiError(c, "FORBIDDEN", "You are not the organizer of this event", 403);
  }

  // Mark as scanned
  const [updated] = await db.update(ticketsTable)
    .set({
      status: "used",
      scannedAt: new Date(),
      scannedBy: user.id,
    })
    .where(eq(ticketsTable.id, ticket.id))
    .returning();

  return apiSuccess(c, updated, "Ticket scanned successfully");
});

export default ticketsRouter;
