// components/common/Skeleton.tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-muted", className)}
    />
  );
}

export function DayCardSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
