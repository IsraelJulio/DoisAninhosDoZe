import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { EVENT } from "@/features/event/event";
import "@/styles/globals.css";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-fredoka" });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-nunito" });

const title = `${EVENT.childName} ${EVENT.age} anos — Aniversário Safari`;
const description = `Venha viver essa aventura! ${EVENT.displayDate} às ${EVENT.displayTime}, ${EVENT.venue}.`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: { default: title, template: `%s · ${EVENT.childName} ${EVENT.age} anos` },
  description,
  openGraph: {
    title,
    description,
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/assets/jose/jose-avatar.webp", width: 640, height: 640, alt: `${EVENT.childName}` }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#168447",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
