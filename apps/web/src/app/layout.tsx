import type { Metadata } from "next";
import { AppHeader } from "@/components/shell/AppHeader";
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
      <body className="min-h-screen bg-stone-950 text-stone-200 antialiased">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
