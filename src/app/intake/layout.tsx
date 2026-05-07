import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "홈페이지 제작 의뢰서",
  description: "A1STUDIO 홈페이지 제작 의뢰서",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function IntakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
