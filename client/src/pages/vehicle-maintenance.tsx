import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Plus, Trash2, Calendar, Gauge, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Vehicle, MaintenancePlan, VehiclePlan, PlanChecklistItem } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const assignPlanSchema = z.object({
  activationDate: z.string().min(1, "Activation date is required"),
  odometerAtActivation: z.string().optional(),
  engineHoursAtActivation: z.string().optional(),
});

type AssignPlanForm = z.infer<typeof assignPlanSchema>;

type VehiclePlanWithDetails = VehiclePlan & { 
  plan: MaintenancePlan; 
  checklistItems: PlanChecklistItem[];
};

export default function VehicleMaintenance() {
  const { id: vehicleId } = useParams();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null);
  const [unassigningPlan, setUnassigningPlan] = useState<VehiclePlanWithDetails | null>(null);
  const { toast } = useToast();

  const { data: vehicle, isLoading: vehicleLoading } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${vehicleId}`],
    enabled: !!vehicleId,
  });

  const { data: availablePlans, isLoading: plansLoading } = useQuery<MaintenancePlan[]>({
    queryKey: ["/api/maintenance-plans"],
  });

  const { data: vehiclePlans, isLoading: vehiclePlansLoading } = useQuery<VehiclePlanWithDetails[]>({
    queryKey: [`/api/vehicle-plans?vehicleId=${vehicleId}`],
    enabled: !!vehicleId,
  });

  const form = useForm<AssignPlanForm>({
    resolver: zodResolver(assignPlanSchema),
    defaultValues: {
      activationDate: format(new Date(), "yyyy-MM-dd"),
      odometerAtActivation: "",
      engineHoursAtActivation: "",
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: AssignPlanForm) => {
      if (!selectedPlan || !vehicleId) return;
      
      return await apiRequest("POST", "/api/vehicle-plans", {
        vehicleId,
        planId: selectedPlan.id,
        activationDate: data.activationDate,
        odometerAtActivation: data.odometerAtActivation ? parseInt(data.odometerAtActivation) : null,
        engineHoursAtActivation: data.engineHoursAtActivation ? parseFloat(data.engineHoursAtActivation) : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: "active",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicle-plans?vehicleId=${vehicleId}`] });
      toast({
        title: "Plan assigned",
        description: "The maintenance plan has been assigned to this vehicle.",
      });
      setAssignDialogOpen(false);
      setSelectedPlan(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign maintenance plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (vehiclePlanId: string) => {
      return await apiRequest("DELETE", `/api/vehicle-plans/${vehiclePlanId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicle-plans?vehicleId=${vehicleId}`] });
      toast({
        title: "Plan unassigned",
        description: "The maintenance plan has been removed from this vehicle.",
      });
      setUnassigningPlan(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unassign maintenance plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAssignPlan = (plan: MaintenancePlan) => {
    setSelectedPlan(plan);
    setAssignDialogOpen(true);
  };

  const handleSubmit = (data: AssignPlanForm) => {
    assignMutation.mutate(data);
  };

  const getCadenceDescription = (plan: MaintenancePlan) => {
    const config = plan.cadenceConfig as any;
    switch (plan.cadenceType) {
      case "trackday":
        return `Every ${config.trackday?.afterEveryN || 1} trackday${(config.trackday?.afterEveryN || 1) > 1 ? "s" : ""}`;
      case "time_interval":
        return `Every ${config.time_interval?.intervalDays || 1} day${(config.time_interval?.intervalDays || 1) > 1 ? "s" : ""}`;
      case "odometer":
        return `Every ${config.odometer?.intervalKm || 0} km`;
      case "engine_hours":
        return `Every ${config.engine_hours?.intervalHours || 0} engine hours`;
      default:
        return plan.cadenceType;
    }
  };

  const assignedPlanIds = new Set(vehiclePlans?.map(vp => vp.planId) || []);

  if (vehicleLoading || plansLoading || vehiclePlansLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Vehicle not found.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <Link href="/vehicles">
            <Button variant="ghost" size="sm" data-testid="button-back-to-vehicles">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Vehicles
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold">{vehicle.name}</h1>
            <p className="text-muted-foreground">
              Manage maintenance plans for this vehicle
            </p>
          </div>
        </div>

        {/* Assigned Plans */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-xl font-semibold">Assigned Maintenance Plans</h2>
          </div>

          {vehiclePlans && vehiclePlans.length > 0 ? (
            <div className="grid gap-4">
              {vehiclePlans.map((vehiclePlan) => (
                <Card key={vehiclePlan.id} data-testid={`card-vehicle-plan-${vehiclePlan.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <CardTitle>{vehiclePlan.plan.name}</CardTitle>
                        <CardDescription>{vehiclePlan.plan.description}</CardDescription>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">
                            {getCadenceDescription(vehiclePlan.plan)}
                          </Badge>
                          <Badge variant={vehiclePlan.status === "active" ? "default" : "secondary"}>
                            {vehiclePlan.status}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUnassigningPlan(vehiclePlan)}
                        data-testid={`button-unassign-plan-${vehiclePlan.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Activation Details */}
                    <div className="flex items-center gap-6 flex-wrap text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Activated: {format(new Date(vehiclePlan.activationDate), "MMM d, yyyy")}</span>
                      </div>
                      {vehiclePlan.odometerAtActivation && (
                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4" />
                          <span>Odometer: {vehiclePlan.odometerAtActivation.toLocaleString()} km</span>
                        </div>
                      )}
                      {vehiclePlan.engineHoursAtActivation && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Engine Hours: {vehiclePlan.engineHoursAtActivation}</span>
                        </div>
                      )}
                    </div>

                    {/* Checklist Items */}
                    {vehiclePlan.checklistItems && vehiclePlan.checklistItems.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Checklist Items:</p>
                        <div className="space-y-1">
                          {vehiclePlan.checklistItems.map((item) => (
                            <div
                              key={item.id}
                              className="text-sm text-muted-foreground pl-4 border-l-2 border-muted"
                            >
                              {item.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">
                  No maintenance plans assigned to this vehicle yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Available Plans to Assign */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Plans</h2>
          {availablePlans && availablePlans.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {availablePlans
                .filter((plan) => !assignedPlanIds.has(plan.id))
                .map((plan) => (
                  <Card key={plan.id} data-testid={`card-available-plan-${plan.id}`}>
                    <CardHeader>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between gap-4">
                        <Badge variant="outline">
                          {getCadenceDescription(plan)}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignPlan(plan)}
                          data-testid={`button-assign-plan-${plan.id}`}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Assign
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">
                  No maintenance plans available. Create plans in the{" "}
                  <Link href="/maintenance-plans">
                    <span className="text-primary underline cursor-pointer">
                      Maintenance Plans
                    </span>
                  </Link>{" "}
                  page.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Assign Plan Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent data-testid="dialog-assign-plan">
            <DialogHeader>
              <DialogTitle>Assign Maintenance Plan</DialogTitle>
              <DialogDescription>
                Assign "{selectedPlan?.name}" to {vehicle?.name}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="activationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activation Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-activation-date"
                        />
                      </FormControl>
                      <FormDescription>
                        The date when this maintenance plan becomes active
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="odometerAtActivation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Odometer Reading (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 50000"
                          {...field}
                          data-testid="input-odometer-activation"
                        />
                      </FormControl>
                      <FormDescription>
                        Current odometer reading in kilometers
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="engineHoursAtActivation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Engine Hours (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="e.g., 120.5"
                          {...field}
                          data-testid="input-engine-hours-activation"
                        />
                      </FormControl>
                      <FormDescription>
                        Current engine hours
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAssignDialogOpen(false);
                      setSelectedPlan(null);
                      form.reset();
                    }}
                    data-testid="button-cancel-assign"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={assignMutation.isPending}
                    data-testid="button-submit-assign"
                  >
                    {assignMutation.isPending ? "Assigning..." : "Assign Plan"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Unassign Confirmation Dialog */}
        <AlertDialog open={!!unassigningPlan} onOpenChange={(open) => !open && setUnassigningPlan(null)}>
          <AlertDialogContent data-testid="dialog-unassign-plan">
            <AlertDialogHeader>
              <AlertDialogTitle>Unassign Maintenance Plan?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove "{unassigningPlan?.plan.name}" from this vehicle?
                This will also delete any pending maintenance tasks associated with this plan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-unassign">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => unassigningPlan && unassignMutation.mutate(unassigningPlan.id)}
                data-testid="button-confirm-unassign"
              >
                Unassign
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
