import "server-only";
import QRCode from "qrcode";

/** QR Code gerado no servidor a partir do payload Pix (SVG → data URI; zero JS no cliente). */
export async function pixQrDataUri(payload: string): Promise<string> {
  const svg = await QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#33251D", light: "#FFFFFF" },
  });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
