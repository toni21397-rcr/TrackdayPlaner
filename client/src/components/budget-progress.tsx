import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BudgetProgressProps {
  projected: number;
  spent: number;
  remaining: number;
  annual: number;
  currency?: string;
}

export function BudgetProgress({
  projected,
  spent,
  remaining,
  annual,
  currency = "CHF",
}: BudgetProgressProps) {
  const formatCurrency = (cents: number) => {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  };

  const spentPercentage = annual > 0 ? (spent / annual) * 100 : 0;
  const projectedPercentage = annual > 0 ? (projected / annual) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual Budget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Budget: {formatCurrency(annual)}</span>
            <span className="font-mono font-semibold" data-testid="budget-remaining">
              {formatCurrency(remaining)} remaining
            </span>
          </div>
          <div className="relative h-10 w-full rounded-lg bg-muted overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-cyan-600"
              style={{ width: `${Math.min(spentPercentage, 100)}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-cyan-400 opacity-50"
              style={{ width: `${Math.min(projectedPercentage, 100)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium">
              <span className="text-foreground/90">
                Spent: {formatCurrency(spent)} ({spentPercentage.toFixed(0)}%)
              </span>
              {projected > spent && (
                <span className="text-foreground/90">
                  Projected: {formatCurrency(projected)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Projected</p>
            <p className="text-sm font-mono font-semibold" data-testid="budget-projected">
              {formatCurrency(projected)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Spent</p>
            <p className="text-sm font-mono font-semibold" data-testid="budget-spent">
              {formatCurrency(spent)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-sm font-mono font-semibold">
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {/* Cost Categories Legend */}
        <div className="pt-4 border-t">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Cost Categories</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span>Entry Fees</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500" />
              <span>Travel</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Hotel</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pink-500" />
              <span>Tires</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-teal-500" />
              <span>Fuel</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-lime-500" />
              <span>Food</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-500" />
              <span>Other</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
