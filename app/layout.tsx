import type { Metadata } from "next";
import { Nunito, Fredoka, Plus_Jakarta_Sans, DM_Sans } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Book Buddy — Your Reading Companion",
  description:
    "A safe, interactive reading companion for kids, parents, and teachers.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${fredoka.variable} ${jakarta.variable} ${dmSans.variable}`}
    >
      <body className="font-sans antialiased">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}