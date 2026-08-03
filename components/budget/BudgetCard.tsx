// components/budget/BudgetCard.tsx
import type { BudgetBreakdown } from "@/types/trip";

interface BudgetCardProps {
  totalBudget: number;
  currency: string;
  breakdown: BudgetBreakdown;
}

const LABELS: Record<keyof BudgetBreakdown, string> = {
  hotel: "Hotel",
  transport: "Trasporti",
  food: "Cibo",
  activities: "Attività",
  extra: "Extra",
};

export function BudgetCard({ totalBudget, currency, breakdown }: BudgetCardProps) {
  const spent = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-semibold">Budget</h2>
        <p className="text-sm text-muted-foreground">
          {spent} / {totalBudget} {currency}
        </p>
      </div>

      <div className="space-y-3">
        {(Object.keys(breakdown) as Array<keyof BudgetBreakdown>).map((key) => {
          const value = breakdown[key];
          const percentage = totalBudget > 0 ? Math.min(100, (value / totalBudget) * 100) : 0;

          return (
            <div key={key}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-foreground">{LABELS[key]}</span>
                <span className="font-medium">
                  {value} {currency}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
