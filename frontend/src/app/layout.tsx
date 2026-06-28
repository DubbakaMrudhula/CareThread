import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareThread | Clinical Intelligence Agent",
  description: "The clinical agent that never forgets, never overspends, and never guesses without a reason.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-purple-main selection:text-white">{children}</body>
    </html>
  );
}
