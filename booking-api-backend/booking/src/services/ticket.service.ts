import PDFDocument from "pdfkit";
import getStream from "get-stream";
import { db } from "../config/db.js";
import { env } from "../config/env.js";
import { tickets, bookings, bookingItems, ticketTiers, eventShows, events, venues } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { generateQrBuffer } from "../utils/qrcode.js";

export interface TicketPdfData {
  ticketCode: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  venueAddress: string;
  seatInfo?: string;
  tierName: string;
  price: string;
  bookingRef: string;
  userName: string;
}

export async function generateTicketPdf(data: TicketPdfData): Promise<Buffer> {
  const qrBuffer = await generateQrBuffer(data.ticketCode);
  
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A5",
      layout: "portrait",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: any) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ... (rest of the drawing logic)
    doc
      .rect(0, 0, doc.page.width, doc.page.height)
      .fillColor("#f8fafc")
      .fill();

    doc
      .rect(0, 0, doc.page.width, 50)
      .fillColor("#6366f1")
      .fill();

    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text("TICKET", 40, 25, { lineGap: 6 });

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#a5b4fc")
      .text(data.ticketCode, doc.page.width - 40, 20, { align: "right" });

    doc
      .fontSize(9)
      .fillColor("#64748b")
      .text(`Booking Ref: ${data.bookingRef}`, 40, 65);

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor("#1e293b")
      .text(data.eventTitle, 40, 100, { width: 400, lineGap: 4 });

    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#475569")
      .text(`📍 ${data.venueName}, ${data.venueAddress}`, 40, 150, { width: 400, lineGap: 3 })
      .text(`📅 ${data.eventDate} at ${data.eventTime}`, 40, 185, { width: 400, lineGap: 3 })
      .moveDown();

    if (data.seatInfo) {
      doc
        .fontSize(12)
        .fillColor("#334155")
        .text(`🎟️ ${data.tierName}: ${data.seatInfo}`, 40, 230);
    } else {
      doc.fontSize(12).fillColor("#334155").text(`🎟️ ${data.tierName}`, 40, 230);
    }

    doc
      .moveTo(40, 270)
      .lineTo(doc.page.width - 40, 270)
      .strokeColor("#cbd5e1")
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(10)
      .fillColor("#64748b")
      .text("Scan at venue entry", 40, 290);

    doc.image(qrBuffer, 340, 280, { width: 100 });

    // Footer
    doc
      .fontSize(8)
      .fillColor("#94a3b8")
      .text(
        "Please carry a valid photo ID. This ticket is non-transferable and non-refundable unless the event is cancelled.",
        40,
        doc.page.height - 60,
        { width: 360, align: "center" }
      );

    doc.end();
  });
}

// Get ticket data for a ticket code
export async function getTicketData(ticketCode: string) {
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.ticketCode, ticketCode),
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
              user: true,
            },
          },
          tier: true,
        },
      },
    },
  });

  if (!ticket || !ticket.bookingItem) return null;

  const booking = ticket.bookingItem.booking;
  const show = booking?.show;
  const event = show?.event;
  const venue = event?.venue;
  const tier = ticket.bookingItem.tier;

  // Format seat info
  const seatInfo = ticket.seatId
    ? `${ticket.seatId.slice(-4).toUpperCase()}` // Simplified: show last 4 chars of seat UUID
    : undefined;

  return {
    ticketCode: ticket.ticketCode,
    eventTitle: event?.title || "Event",
    eventDate: show?.showDate || "",
    eventTime: show?.showTime || "",
    venueName: venue?.name || "Venue",
    venueAddress: venue ? [venue.address, venue.city, venue.state].filter(Boolean).join(", ") : "",
    seatInfo,
    tierName: tier?.name || "General",
    price: tier?.price || "0",
    bookingRef: booking?.bookingRef || "",
    userName: booking?.user?.name || "Guest",
    qrDataUrl: `${env.FRONTEND_URL}/tickets/${ticket.ticketCode}`,
  };
}
