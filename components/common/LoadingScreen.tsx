// components/common/LoadingScreen.tsx
import { Loader2 } from "lucide-react";

export function LoadingScreen({ label = "Caricamento in corso..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground"
    >
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
