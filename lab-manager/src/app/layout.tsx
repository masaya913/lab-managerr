import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lab Manager - Cell Culture Experiment Scheduler",
  description:
    "Manage cell culture experiment protocols, schedules, and daily lab notes with Google Calendar integration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
