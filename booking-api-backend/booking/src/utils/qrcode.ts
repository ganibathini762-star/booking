import QRCode from "qrcode";

export async function generateQrDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 300,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

export async function generateQrBuffer(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 300,
  });
}

export function buildTicketUrl(ticketCode: string, baseUrl: string): string {
  return `${baseUrl}/tickets/${ticketCode}`;
}
