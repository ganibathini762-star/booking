// PDF ticket generation utility
// Used by ticketWorker to generate and upload PDF tickets

export type TicketPdfData = {
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
  qrDataUrl: string;
};

/**
 * Generate PDF ticket as a Buffer.
 * Uses a lightweight HTML-to-PDF approach via a template.
 * Full PDFKit integration will be added in Phase 4.
 */
export async function generateTicketPdf(data: TicketPdfData): Promise<Buffer> {
  // Placeholder — full PDFKit implementation in Phase 4
  const html = `
    <html>
      <body>
        <h1>${data.eventTitle}</h1>
        <p>Booking Ref: ${data.bookingRef}</p>
        <p>Ticket Code: ${data.ticketCode}</p>
        <p>Seat: ${data.seatInfo ?? "General Admission"}</p>
        <p>Date: ${data.eventDate} at ${data.eventTime}</p>
        <p>Venue: ${data.venueName}</p>
        <img src="${data.qrDataUrl}" width="200" />
      </body>
    </html>
  `;
  return Buffer.from(html, "utf-8");
}
