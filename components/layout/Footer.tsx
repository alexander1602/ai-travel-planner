// components/layout/Footer.tsx
export function Footer() {
  return (
    <footer className="border-t border-border/60 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted-foreground sm:flex-row">
        <p>&copy; {new Date().getFullYear()} AI Travel Planner. Tutti i diritti riservati.</p>
        <p>Costruito con Next.js, TypeScript e AI.</p>
      </div>
    </footer>
  );
}
