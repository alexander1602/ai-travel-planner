// app/layout.tsx
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "AI Travel Planner",
  description: "Plan your next adventure with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
