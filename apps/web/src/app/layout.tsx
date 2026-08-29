import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Game Tracker",
  description: "Track your stats and streaks for daily short games.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
