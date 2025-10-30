import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Plus, Edit, Trash2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertPlanChecklistItemSchema, type MaintenancePlan, type PlanChecklistItem, type InsertPlanChecklistItem } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function MaintenancePlanDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<PlanChecklistItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: plan, isLoading: planLoading } = useQuery<MaintenancePlan>({
    queryKey: [`/api/maintenance-plans/${id}`],
  });

  const { data: checklistItems = [], isLoading: itemsLoading } = useQuery<PlanChecklistItem[]>({
    queryKey: [`/api/checklist-items?planId=${id}`],
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: InsertPlanChecklistItem) =>
      await apiRequest("POST", "/api/checklist-items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/checklist-items?planId=${id}`] });
      setIsDialogOpen(false);
      setSelectedItem(null);
      toast({ title: "Checklist item added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add checklist item", description: error.message, variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: Partial<InsertPlanChecklistItem> }) =>
      await apiRequest("PATCH", `/api/checklist-items/${itemId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/checklist-items?planId=${id}`] });
      setIsDialogOpen(false);
      setSelectedItem(null);
      toast({ title: "Checklist item updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update checklist item", description: error.message, variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) =>
      await apiRequest("DELETE", `/api/checklist-items/${itemId}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/checklist-items?planId=${id}`] });
      toast({ title: "Checklist item deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete checklist item", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateOrUpdate = (data: InsertPlanChecklistItem) => {
    if (selectedItem) {
      updateItemMutation.mutate({ itemId: selectedItem.id, data });
    } else {
      createItemMutation.mutate({ ...data, planId: id! });
    }
  };

  const handleDelete = (itemId: string) => {
    if (confirm("Are you sure you want to delete this checklist item?")) {
      deleteItemMutation.mutate(itemId);
    }
  };

  const handleOpenDialog = (item?: PlanChecklistItem) => {
    setSelectedItem(item || null);
    setIsDialogOpen(true);
  };

  if (planLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-9 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-8 bg-muted rounded w-64 mb-2 animate-pulse" />
        <div className="h-4 bg-muted rounded w-96 mb-6 animate-pulse" />
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-48" />
          </CardHeader>
          <CardContent>
            <div className="h-4 bg-muted rounded w-full mb-2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/maintenance-plans">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to Plans
            </Button>
          </Link>
        </div>
        <Card className="p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Plan not found</h3>
          <p className="text-muted-foreground">The maintenance plan you're looking for doesn't exist.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/maintenance-plans">
          <Button variant="outline" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            Back to Plans
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold" data-testid="text-plan-name">{plan.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              {plan.cadenceType === "trackday" && (
                <Badge variant="secondary" data-testid="badge-cadence">
                  Every {plan.cadenceConfig.trackday?.afterEveryN || 1} trackday{(plan.cadenceConfig.trackday?.afterEveryN || 1) > 1 ? 's' : ''}
                </Badge>
              )}
              {plan.cadenceType === "time_interval" && (
                <Badge variant="secondary" data-testid="badge-cadence">
                  Every {plan.cadenceConfig.time_interval?.intervalDays} days
                </Badge>
              )}
              {plan.cadenceType === "odometer" && (
                <Badge variant="secondary" data-testid="badge-cadence">
                  Every {plan.cadenceConfig.odometer?.intervalKm} km
                </Badge>
              )}
              {plan.cadenceType === "engine_hours" && (
                <Badge variant="secondary" data-testid="badge-cadence">
                  Every {plan.cadenceConfig.engine_hours?.intervalHours} hours
                </Badge>
              )}
              {plan.isTemplate && (
                <Badge variant="outline" data-testid="badge-template">
                  Template
                </Badge>
              )}
            </div>
          </div>
        </div>
        {plan.description && (
          <p className="text-muted-foreground" data-testid="text-plan-description">
            {plan.description}
          </p>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            Checklist Items
          </h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} data-testid="button-add-checklist-item">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <ChecklistItemDialog
              item={selectedItem}
              onSubmit={handleCreateOrUpdate}
              isPending={createItemMutation.isPending || updateItemMutation.isPending}
            />
          </Dialog>
        </div>

        {itemsLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : checklistItems.length === 0 ? (
          <Card className="p-8 text-center">
            <ListChecks className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No checklist items yet</h3>
            <p className="text-muted-foreground mb-4">
              Add checklist items to define the tasks for this maintenance plan
            </p>
            <Button onClick={() => handleOpenDialog()} data-testid="button-add-first-item">
              <Plus className="w-4 h-4" />
              Add Your First Item
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {checklistItems.map((item) => (
              <Card key={item.id} className="hover-elevate" data-testid={`card-checklist-item-${item.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium" data-testid={`text-item-name-${item.id}`}>
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1" data-testid={`text-item-description-${item.id}`}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(item)}
                        data-testid={`button-edit-item-${item.id}`}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        data-testid={`button-delete-item-${item.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChecklistItemDialog({
  item,
  onSubmit,
  isPending,
}: {
  item: PlanChecklistItem | null;
  onSubmit: (data: InsertPlanChecklistItem) => void;
  isPending: boolean;
}) {
  const form = useForm<InsertPlanChecklistItem>({
    resolver: zodResolver(insertPlanChecklistItemSchema.omit({ planId: true })),
    defaultValues: item || {
      title: "",
      description: "",
      maintenanceType: "other",
      defaultDueOffset: { days: 0, trackdays: 0, odometerKm: 0 },
      autoCompleteMatcher: {},
      sequence: 0,
      isCritical: false,
    },
  });

  return (
    <DialogContent data-testid="dialog-checklist-item">
      <DialogHeader>
        <DialogTitle>{item ? "Edit Checklist Item" : "Add Checklist Item"}</DialogTitle>
        <DialogDescription>
          {item
            ? "Update the checklist item details"
            : "Add a new item to the maintenance plan checklist"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Check tire pressure"
                    data-testid="input-item-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    placeholder="Additional details about this checklist item..."
                    data-testid="input-item-description"
                  />
                </FormControl>
                <FormDescription>
                  Provide any specific instructions or notes
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="submit" disabled={isPending} data-testid="button-submit-item">
              {isPending ? "Saving..." : item ? "Update Item" : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
