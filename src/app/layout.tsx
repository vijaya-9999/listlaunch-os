import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ListLaunch OS",
  description:
    "Pre-list board: repairs → clean → stage → photo → MLS QA → go-live",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
