import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Conviction Matrix | Institutional Signal Convergence",
  description: "Track where smart money is moving before it becomes news. 3-layer institutional conviction engine built on SoSoValue.",
  openGraph: {
    title: "Conviction Matrix",
    description: "Stop trading news. Start trading conviction.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-terminal-bg font-mono antialiased">
        <div className="scanline" aria-hidden />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
