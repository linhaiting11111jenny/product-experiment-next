import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC, Playfair_Display } from "next/font/google";

import "@/app/globals.css";

const notoSans = Noto_Sans_SC({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const notoSerif = Noto_Serif_SC({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap"
});

const playfair = Playfair_Display({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  title: "AceTrack G1 商品实验页",
  description: "基于 Next.js 14 App Router 重写的商品浏览实验项目"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${notoSans.variable} ${notoSerif.variable} ${playfair.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
