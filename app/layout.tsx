// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "AI Travel Planner · Intelligente & Su Misura",
  description: "Pianifica il tuo prossimo viaggio ideale su misura con l'AI",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
