import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { CostItemDialog } from "@/components/cost-item-dialog";
import { EmptyState } from "@/components/empty-state";
import { DollarSign } from "lucide-react";
import type { CostItem } from "@shared/schema";
import { format } from "date-fns";

interface CostItemsTabProps {
  trackdayId: string;
}

export function CostItemsTab({ trackdayId }: CostItemsTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCostItem, setEditingCostItem] = useState<CostItem | null>(null);

  const { data: costItems } = useQuery<CostItem[]>({
    queryKey: ["/api/cost-items", trackdayId],
    queryFn: async () => {
      const response = await fetch(`/api/cost-items?trackdayId=${trackdayId}`);
      if (!response.ok) throw new Error("Failed to fetch cost items");
      return response.json();
    },
  });

  const formatCurrency = (cents: number) => {
    return `${(cents / 100).toFixed(2)} CHF`;
  };

  const totalProjected = costItems?.filter(c => c.status === "planned" || c.status === "invoiced").reduce((sum, c) => sum + c.amountCents, 0) || 0;
  const totalSpent = costItems?.filter(c => c.status === "paid").reduce((sum, c) => sum + c.amountCents, 0) || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Cost Items</CardTitle>
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm" data-testid="button-add-cost">
            <Plus className="w-4 h-4 mr-2" />
            Add Cost
          </Button>
        </CardHeader>
        <CardContent>
          {costItems && costItems.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover-elevate cursor-pointer"
                      onClick={() => setEditingCostItem(item)}
                    >
                      <TableCell className="font-medium capitalize">
                        {item.type.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.amountCents)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} type="payment" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.dueDate ? format(new Date(item.dueDate), "MMM dd, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {item.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end gap-8 mt-6 pt-4 border-t">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Projected</p>
                  <p className="text-lg font-mono font-semibold" data-testid="total-projected">
                    {formatCurrency(totalProjected)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Spent</p>
                  <p className="text-lg font-mono font-semibold" data-testid="total-spent">
                    {formatCurrency(totalSpent)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={DollarSign}
              title="No costs yet"
              description="Add cost items to track your spending for this trackday."
              actionLabel="Add Cost"
              onAction={() => setIsAddDialogOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      <CostItemDialog
        open={isAddDialogOpen || editingCostItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingCostItem(null);
          }
        }}
        trackdayId={trackdayId}
        costItem={editingCostItem || undefined}
      />
    </div>
  );
}
