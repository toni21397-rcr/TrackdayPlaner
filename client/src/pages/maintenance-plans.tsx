import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, ListChecks, ChevronRight, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useTutorial } from "@/components/tutorial-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertMaintenancePlanSchema, type MaintenancePlan, type InsertMaintenancePlan } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function MaintenancePlansPage() {
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { startTour } = useTutorial();

  const { data: plans, isLoading } = useQuery<MaintenancePlan[]>({
    queryKey: ["/api/maintenance-plans"],
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: InsertMaintenancePlan) =>
      await apiRequest("POST", "/api/maintenance-plans", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-plans"] });
      setIsDialogOpen(false);
      toast({ title: "Maintenance plan created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create plan", description: error.message, variant: "destructive" });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertMaintenancePlan> }) =>
      await apiRequest("PATCH", `/api/maintenance-plans/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-plans"] });
      setIsDialogOpen(false);
      setSelectedPlan(null);
      toast({ title: "Maintenance plan updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update plan", description: error.message, variant: "destructive" });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) =>
      await apiRequest("DELETE", `/api/maintenance-plans/${id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-plans"] });
      toast({ title: "Maintenance plan deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete plan", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateOrUpdate = (data: InsertMaintenancePlan) => {
    if (selectedPlan) {
      updatePlanMutation.mutate({ id: selectedPlan.id, data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this maintenance plan?")) {
      deletePlanMutation.mutate(id);
    }
  };

  const handleOpenDialog = (plan?: MaintenancePlan) => {
    setSelectedPlan(plan || null);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Maintenance Plans</h1>
          <p className="text-muted-foreground mt-2">
            Create maintenance plan templates to track and organize your vehicle maintenance tasks
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const templates = plans?.filter((p) => p.isTemplate) || [];
  const userPlans = plans?.filter((p) => !p.isTemplate) || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Plans</h1>
          <p className="text-muted-foreground mt-2">
            Create maintenance plan templates to track and organize your vehicle maintenance tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startTour('maintenance-plans')}
            data-testid="button-maintenance-tutorial"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Tutorial
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} data-testid="button-create-plan">
                <Plus className="w-4 h-4" />
                Create Plan
              </Button>
            </DialogTrigger>
            <MaintenancePlanDialog
              plan={selectedPlan}
              onSubmit={handleCreateOrUpdate}
              isPending={createPlanMutation.isPending || updatePlanMutation.isPending}
            />
          </Dialog>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            Templates
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => handleOpenDialog(plan)}
                onDelete={() => handleDelete(plan.id)}
              />
            ))}
          </div>
        </div>
      )}

      {userPlans.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">My Plans</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => handleOpenDialog(plan)}
                onDelete={() => handleDelete(plan.id)}
              />
            ))}
          </div>
        </div>
      )}

      {plans && plans.length === 0 && (
        <Card className="p-8 text-center">
          <ListChecks className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No maintenance plans yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first maintenance plan to start tracking vehicle maintenance tasks
          </p>
          <Button onClick={() => handleOpenDialog()} data-testid="button-create-first-plan">
            <Plus className="w-4 h-4" />
            Create Your First Plan
          </Button>
        </Card>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  onEdit,
  onDelete,
}: {
  plan: MaintenancePlan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="hover-elevate" data-testid={`card-plan-${plan.id}`}>
      <Link href={`/maintenance-plans/${plan.id}`}>
        <a className="block" data-testid={`link-plan-detail-${plan.id}`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2" data-testid={`text-plan-name-${plan.id}`}>
                  {plan.name}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardTitle>
                <CardDescription className="mt-1">
                  {plan.cadenceType === "trackday" && (
                    <Badge variant="secondary">
                      Every {plan.cadenceConfig.trackday?.afterEveryN || 1} trackday{(plan.cadenceConfig.trackday?.afterEveryN || 1) > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {plan.cadenceType === "time_interval" && (
                    <Badge variant="secondary">
                      Every {plan.cadenceConfig.time_interval?.intervalDays} days
                    </Badge>
                  )}
                  {plan.cadenceType === "odometer" && (
                    <Badge variant="secondary">
                      Every {plan.cadenceConfig.odometer?.intervalKm} km
                    </Badge>
                  )}
                  {plan.cadenceType === "engine_hours" && (
                    <Badge variant="secondary">
                      Every {plan.cadenceConfig.engine_hours?.intervalHours} hours
                    </Badge>
                  )}
                </CardDescription>
              </div>
              {plan.isTemplate && (
                <Badge variant="outline" className="ml-2">
                  Template
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {plan.description || "No description"}
            </p>
          </CardContent>
        </a>
      </Link>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            data-testid={`button-edit-plan-${plan.id}`}
          >
            <Edit className="w-3 h-3" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            data-testid={`button-delete-plan-${plan.id}`}
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MaintenancePlanDialog({
  plan,
  onSubmit,
  isPending,
}: {
  plan: MaintenancePlan | null;
  onSubmit: (data: InsertMaintenancePlan) => void;
  isPending: boolean;
}) {
  const form = useForm<InsertMaintenancePlan>({
    resolver: zodResolver(insertMaintenancePlanSchema),
    defaultValues: plan || {
      name: "",
      description: "",
      isTemplate: false,
      cadenceType: "trackday",
      cadenceConfig: {},
    },
  });

  const cadenceType = form.watch("cadenceType");

  return (
    <DialogContent className="max-w-lg" data-testid="dialog-maintenance-plan">
      <DialogHeader>
        <DialogTitle>{plan ? "Edit Plan" : "Create Maintenance Plan"}</DialogTitle>
        <DialogDescription>
          {plan
            ? "Update the maintenance plan details"
            : "Create a new maintenance plan template"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plan Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Pre-Trackday Inspection"
                    data-testid="input-plan-name"
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    placeholder="Describe this maintenance plan..."
                    data-testid="input-plan-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cadenceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trigger Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-trigger-type">
                      <SelectValue placeholder="Select trigger type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="trackday">Trackday</SelectItem>
                    <SelectItem value="time_interval">Time Interval</SelectItem>
                    <SelectItem value="odometer">Odometer</SelectItem>
                    <SelectItem value="engine_hours">Engine Hours</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  When should this maintenance plan trigger tasks?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {cadenceType === "trackday" && (
            <FormField
              control={form.control}
              name="cadenceConfig.trackday.afterEveryN"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>After Every N Trackdays</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? 1}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      placeholder="e.g., 1"
                      data-testid="input-trackday-after-n"
                    />
                  </FormControl>
                  <FormDescription>
                    Tasks will trigger after every N trackdays
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {cadenceType === "time_interval" && (
            <FormField
              control={form.control}
              name="cadenceConfig.time_interval.intervalDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interval (Days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      placeholder="e.g., 30"
                      data-testid="input-interval-days"
                    />
                  </FormControl>
                  <FormDescription>
                    Tasks will trigger every N days
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {cadenceType === "odometer" && (
            <FormField
              control={form.control}
              name="cadenceConfig.odometer.intervalKm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Odometer Interval (km)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      placeholder="e.g., 5000"
                      data-testid="input-odometer-km"
                    />
                  </FormControl>
                  <FormDescription>
                    Tasks will trigger every N kilometers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {cadenceType === "engine_hours" && (
            <FormField
              control={form.control}
              name="cadenceConfig.engine_hours.intervalHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Engine Hours Interval</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      placeholder="e.g., 50"
                      data-testid="input-engine-hours"
                    />
                  </FormControl>
                  <FormDescription>
                    Tasks will trigger every N engine hours
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending} data-testid="button-submit-plan">
              {isPending ? "Saving..." : plan ? "Update Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
