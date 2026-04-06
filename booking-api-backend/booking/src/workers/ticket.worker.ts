import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { env } from "../config/env.js";
import { logger } from "../middleware/logger.js";
import { bookings, tickets } from "../db/schema/index.js";
import { emailQueue, type TicketJobData } from "../config/queue.js";
import { generateTicketPdf, type TicketPdfData } from "../services/ticket.service.js";
import { uploadToSupabase, STORAGE_PATHS } from "../config/storage.js";

// NOTE: BullMQ uses ioredis, which requires a redis:// or rediss:// URL.
// REDIS_URL must be in standard Redis protocol format (not Upstash REST HTTPS).
const redisConnection = { url: env.REDIS_URL };

function makeTicketCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TKT-${ts}-${rand}`;
}

export const ticketWorker = new Worker<TicketJobData>(
  "ticket",
  async (job) => {
    const { bookingId } = job.data;

    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      with: {
        user: true,
        items: {
          with: {
            tier: true,
          },
        },
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
    });

    if (!booking) {
      logger.warn(`[ticket-worker] Booking ${bookingId} not found, skipping`);
      return;
    }

    const show = booking.show;
    const event = show?.event;
    const venue = event?.venue;
    const user = booking.user;

    const allTicketCodes: string[] = [];

    // Generate ticket for each quantity in booking items
    for (const item of booking.items) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketCode = makeTicketCode();
        allTicketCodes.push(ticketCode);

        // Build seat info string if seatId exists
        const seatInfo = item.seatId
          ? `Section ${item.seatId.slice(-4).toUpperCase()}` // simplified
          : undefined;

        // Prepare ticket data for PDF generation
        const ticketData: TicketPdfData = {
          ticketCode,
          eventTitle: event?.title ?? "Event",
          eventDate: show?.showDate ?? "",
          eventTime: show?.showTime ?? "",
          venueName: venue?.name ?? "",
          venueAddress: [venue?.address, venue?.city, venue?.state].filter(Boolean).join(", "),
          seatInfo,
          tierName: item.tier?.name ?? "General",
          price: item.tier?.price ?? "0",
          bookingRef: booking.bookingRef,
          userName: user?.name ?? "Guest",
        };

        // Generate PDF
        const pdfBuffer = await generateTicketPdf(ticketData);

        // Upload to Supabase Storage
        const pdfPath = `${STORAGE_PATHS.ticketPdfs}/${ticketCode}.pdf`;
        const pdfUrl = await uploadToSupabase(pdfPath, pdfBuffer, "application/pdf");
        const qrUrl = `${env.FRONTEND_URL}/tickets/${ticketCode}`;

        // Insert ticket record
        await db.insert(tickets).values({
          bookingItemId: item.id,
          ticketCode,
          qrUrl,
          pdfUrl,
          status: "valid",
        });
      }
    }

    logger.info(`[ticket-worker] Generated ${allTicketCodes.length} ticket(s) for booking ${bookingId}`);

    // Enqueue confirmation email
    if (user?.email) {
      const html = buildConfirmationEmail({
        userName: user.name,
        bookingRef: booking.bookingRef,
        eventTitle: event?.title ?? "Your Event",
        showDate: show?.showDate ?? "",
        showTime: show?.showTime ?? "",
        venueName: venue?.name ?? "",
        venueCity: venue?.city ?? "",
        ticketCodes: allTicketCodes,
        finalAmount: parseFloat(booking.finalAmount),
        frontendUrl: env.FRONTEND_URL,
      });

      await emailQueue.add(
        "booking-confirmation",
        {
          to: user.email,
          subject: `Booking Confirmed — ${event?.title ?? booking.bookingRef}`,
          html,
        },
        { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
      );
    }
  },
  { connection: redisConnection, concurrency: 5 }
);

ticketWorker.on("completed", (job) => {
  logger.info(`[ticket-worker] Job ${job.id} completed`);
});

ticketWorker.on("failed", (job, err) => {
  logger.error(`[ticket-worker] Job ${job?.id} failed: ${err.message}`);
});

// ── Email HTML builder ────────────────────────────────────────────────────────

type ConfirmationEmailData = {
  userName: string;
  bookingRef: string;
  eventTitle: string;
  showDate: string;
  showTime: string;
  venueName: string;
  venueCity: string;
  ticketCodes: string[];
  finalAmount: number;
  frontendUrl: string;
};

function buildConfirmationEmail(d: ConfirmationEmailData): string {
  const ticketList = d.ticketCodes
    .map((code) => `<li style="font-family:monospace;font-size:15px;margin:6px 0;color:#111827">${code}</li>`)
    .join("");

  const dateStr = d.showDate
    ? new Date(d.showDate).toLocaleDateString("en-IN", { dateStyle: "long" })
    : "";
  const timeStr = d.showTime?.slice(0, 5) ?? "";
  const venue = [d.venueName, d.venueCity].filter(Boolean).join(", ");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:32px 16px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

    <div style="background:#7c3aed;padding:36px 28px;text-align:center">
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700">Booking Confirmed!</h1>
      <p style="margin:10px 0 0;color:#ede9fe;font-size:15px">Your tickets are ready</p>
    </div>

    <div style="padding:28px">
      <p style="margin:0 0 6px;color:#6b7280;font-size:14px">Hi ${d.userName},</p>
      <p style="margin:0 0 24px;color:#111827;font-size:15px">
        Your booking for <strong>${d.eventTitle}</strong> is confirmed.
      </p>

      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:18px;margin-bottom:24px;text-align:center">
        <p style="margin:0 0 6px;font-size:12px;color:#7c3aed;text-transform:uppercase;letter-spacing:.08em;font-weight:600">Booking Reference</p>
        <p style="margin:0;font-size:22px;font-weight:800;font-family:monospace;color:#5b21b6;letter-spacing:.05em">${d.bookingRef}</p>
      </div>

      ${dateStr || venue ? `
      <div style="margin-bottom:24px;border-left:3px solid #7c3aed;padding-left:14px">
        ${dateStr ? `<p style="margin:0 0 4px;color:#374151;font-size:14px"><strong>Date:</strong> ${dateStr}${timeStr ? " · " + timeStr : ""}</p>` : ""}
        ${venue ? `<p style="margin:0;color:#374151;font-size:14px"><strong>Venue:</strong> ${venue}</p>` : ""}
      </div>` : ""}

      <div style="margin-bottom:24px">
        <p style="margin:0 0 10px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;font-weight:600">
          Your Ticket Code${d.ticketCodes.length > 1 ? "s" : ""}
        </p>
        <ul style="margin:0;padding:0;list-style:none;background:#f9fafb;border-radius:6px;padding:12px 16px">
          ${ticketList}
        </ul>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e5e7eb;padding-top:16px;margin-bottom:24px">
        <span style="color:#6b7280;font-size:14px">Total Paid</span>
        <strong style="color:#111827;font-size:18px">₹${d.finalAmount.toFixed(2)}</strong>
      </div>

      <a href="${d.frontendUrl}/profile/bookings"
         style="display:block;background:#7c3aed;color:#ffffff;text-decoration:none;text-align:center;padding:14px 20px;border-radius:8px;font-weight:600;font-size:15px">
        View My Tickets →
      </a>

      <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6">
        Please carry a valid photo ID to the venue.<br>Tickets are non-transferable and non-refundable unless the event is cancelled.
      </p>
    </div>

    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 28px;text-align:center">
      <p style="margin:0;font-size:12px;color:#9ca3af">© TicketFlow · Powered by TicketFlow</p>
    </div>
  </div>
</body>
</html>`;
}
