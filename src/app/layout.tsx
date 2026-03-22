import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import StickyBookingCTA from "@/components/layout/StickyBookingCTA";
import Providers from "@/components/layout/Providers";
import { STUDIO_NAME, STUDIO_DESCRIPTION } from "@/lib/constants";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: STUDIO_NAME,
    template: `%s | ${STUDIO_NAME}`,
  },
  description: STUDIO_DESCRIPTION,
  openGraph: {
    title: STUDIO_NAME,
    description: STUDIO_DESCRIPTION,
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="scroll-smooth">
      <body className={`${geist.variable} bg-[#F7F3EB] font-sans text-[#3B342F] antialiased`}>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
          <StickyBookingCTA />
        </Providers>
      </body>
    </html>
  );
}
