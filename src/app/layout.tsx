import type { Metadata } from "next";
import { Geist, Cormorant_Garamond, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import StickyBookingCTA from "@/components/layout/StickyBookingCTA";
import ChromeGuard from "@/components/layout/ChromeGuard";
import Providers from "@/components/layout/Providers";
import { STUDIO_NAME, STUDIO_DESCRIPTION } from "@/lib/constants";
import { Suspense } from "react";
import OAuthCallbackHandler from "@/components/OAuthCallbackHandler";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const notoSerifKR = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
      <body className={`${geist.variable} ${cormorant.variable} ${notoSerifKR.variable} bg-[#F7F3EB] font-sans text-[#3B342F] antialiased`}>
        <Providers>
          {/* OAuth 코드 파라미터 정리 */}
          <Suspense fallback={null}>
            <OAuthCallbackHandler />
          </Suspense>
          <Header />
          <main>{children}</main>
          <ChromeGuard>
            <Footer />
          </ChromeGuard>
          <StickyBookingCTA />
        </Providers>
      </body>
    </html>
  );
}
