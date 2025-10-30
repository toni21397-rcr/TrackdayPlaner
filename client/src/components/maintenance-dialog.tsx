import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { insertMaintenanceLogSchema, type InsertMaintenanceLog } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { format, isPast } from "date-fns";

interface MaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
}

interface MaintenanceTask {
  id: string;
  vehiclePlanId: string;
  checklistItemId: string;
  status: string;
  dueDate: string | null;
  checklistItemTitle: string;
  planName: string;
  vehicle: {
    id: string;
    name: string;
    make: string;
    model: string;
  };
}

export function MaintenanceDialog({ open, onOpenChange, vehicleId }: MaintenanceDialogProps) {
  const { toast } = useToast();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<MaintenanceTask[]>({
    queryKey: ["/api/maintenance-tasks", { vehicleId, status: "due,pending" }],
    enabled: open && !!vehicleId,
  });

  const dueTasks = tasks.filter(task => 
    task.status === "due" || task.status === "pending"
  );

  const form = useForm<InsertMaintenanceLog>({
    resolver: zodResolver(insertMaintenanceLogSchema),
    defaultValues: {
      vehicleId,
      date: new Date().toISOString().split("T")[0],
      type: "service",
      costCents: 0,
      odometerKm: null,
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertMaintenanceLog) => {
      return apiRequest("POST", "/api/maintenance", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tasks"] });
      toast({
        title: "Maintenance logged",
        description: "Your maintenance record has been saved successfully.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save maintenance log. Please try again.",
        variant: "destructive",
      });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest("POST", `/api/maintenance-tasks/${taskId}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tasks"] });
      toast({
        title: "Task completed",
        description: "Maintenance task marked as complete.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCompleteTask = (taskId: string) => {
    completeTaskMutation.mutate(taskId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Maintenance Log</DialogTitle>
        </DialogHeader>

        {dueTasks.length > 0 && (
          <>
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800" data-testid="alert-due-tasks">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription>
                <div className="flex flex-col gap-2">
                  <span className="font-medium text-sm">You have {dueTasks.length} maintenance task{dueTasks.length > 1 ? 's' : ''} due:</span>
                  <div className="space-y-2">
                    {dueTasks.map((task) => {
                      const isOverdue = task.dueDate && isPast(new Date(task.dueDate));
                      return (
                        <div
                          key={task.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-md bg-background border"
                          data-testid={`task-nudge-${task.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {task.checklistItemTitle}
                              </span>
                              {isOverdue && (
                                <Badge variant="destructive" className="text-xs">
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{task.planName}</span>
                              {task.dueDate && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Due {format(new Date(task.dueDate), "MMM d, yyyy")}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCompleteTask(task.id)}
                            disabled={completeTaskMutation.isPending}
                            data-testid={`button-complete-task-${task.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
            <Separator />
          </>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-maintenance-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-maintenance-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="oil_change">Oil Change</SelectItem>
                        <SelectItem value="tires">Tires</SelectItem>
                        <SelectItem value="brakes">Brakes</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="repair">Repair</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost (CHF)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? 0 : Math.round(parseFloat(value) * 100));
                        }}
                        value={field.value === 0 ? "" : (field.value / 100).toString()}
                        data-testid="input-cost"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="odometerKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Odometer (km, optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        value={field.value || ""}
                        data-testid="input-odometer"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add any notes about this maintenance..."
                      className="resize-none"
                      rows={3}
                      data-testid="input-maintenance-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-save-maintenance"
              >
                {mutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
