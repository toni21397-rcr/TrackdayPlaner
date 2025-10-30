import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Filter, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isPast } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MaintenanceTask, Vehicle } from "@shared/schema";
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

type TaskWithDetails = MaintenanceTask & {
  vehicle: Vehicle;
  planName: string;
  checklistItemTitle: string;
};

export default function MaintenanceTasks() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [actioningTask, setActioningTask] = useState<{ task: TaskWithDetails; action: "complete" | "snooze" | "dismiss" } | null>(null);
  const { toast } = useToast();

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: tasks, isLoading } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/maintenance-tasks"],
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("POST", `/api/maintenance-tasks/${taskId}/complete`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tasks"] });
      toast({
        title: "Task completed",
        description: "The maintenance task has been marked as completed.",
      });
      setActioningTask(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const snoozeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("POST", `/api/maintenance-tasks/${taskId}/snooze`, {
        snoozedUntil: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tasks"] });
      toast({
        title: "Task snoozed",
        description: "The maintenance task has been snoozed for 7 days.",
      });
      setActioningTask(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to snooze task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const dismissTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("POST", `/api/maintenance-tasks/${taskId}/dismiss`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tasks"] });
      toast({
        title: "Task dismissed",
        description: "The maintenance task has been dismissed.",
      });
      setActioningTask(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to dismiss task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAction = (action: "complete" | "snooze" | "dismiss") => {
    if (!actioningTask) return;
    
    switch (action) {
      case "complete":
        completeTaskMutation.mutate(actioningTask.task.id);
        break;
      case "snooze":
        snoozeTaskMutation.mutate(actioningTask.task.id);
        break;
      case "dismiss":
        dismissTaskMutation.mutate(actioningTask.task.id);
        break;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "snoozed":
        return <Clock className="w-4 h-4" />;
      case "dismissed":
        return <XCircle className="w-4 h-4" />;
      case "due":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "due":
        return "destructive";
      case "snoozed":
        return "secondary";
      case "dismissed":
        return "outline";
      default:
        return "secondary";
    }
  };

  const allTasks = tasks ?? [];

  const filteredTasks = allTasks.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (vehicleFilter !== "all" && task.vehicle.id !== vehicleFilter) return false;
    return true;
  });

  const taskCounts = {
    all: allTasks.length,
    pending: allTasks.filter(t => t.status === "pending").length,
    due: allTasks.filter(t => t.status === "due").length,
    snoozed: allTasks.filter(t => t.status === "snoozed").length,
    completed: allTasks.filter(t => t.status === "completed").length,
    dismissed: allTasks.filter(t => t.status === "dismissed").length,
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold">Maintenance Tasks</h1>
          <p className="text-muted-foreground">
            View and manage your upcoming maintenance tasks
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses ({taskCounts.all})</SelectItem>
              <SelectItem value="pending">Pending ({taskCounts.pending})</SelectItem>
              <SelectItem value="due">Due ({taskCounts.due})</SelectItem>
              <SelectItem value="snoozed">Snoozed ({taskCounts.snoozed})</SelectItem>
              <SelectItem value="completed">Completed ({taskCounts.completed})</SelectItem>
              <SelectItem value="dismissed">Dismissed ({taskCounts.dismissed})</SelectItem>
            </SelectContent>
          </Select>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-48" data-testid="select-vehicle-filter">
              <SelectValue placeholder="Filter by vehicle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles?.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Task List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="space-y-4">
            {filteredTasks.map((task) => {
              const isOverdue = task.status === "due" && task.dueAt && isPast(new Date(task.dueAt));
              
              return (
                <Card 
                  key={task.id} 
                  className={isOverdue ? "border-destructive" : ""}
                  data-testid={`card-task-${task.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg">{task.checklistItemTitle}</CardTitle>
                          <Badge variant={getStatusColor(task.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(task.status)}
                              {task.status}
                            </span>
                          </Badge>
                          {isOverdue && (
                            <Badge variant="destructive">Overdue</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                          <span>Vehicle: {task.vehicle.name}</span>
                          <span>Plan: {task.planName}</span>
                          {task.dueAt && (
                            <span>Due: {format(new Date(task.dueAt), "MMM d, yyyy")}</span>
                          )}
                        </div>
                      </div>
                      {task.status !== "completed" && task.status !== "dismissed" && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setActioningTask({ task, action: "complete" })}
                            data-testid={`button-complete-task-${task.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Complete
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActioningTask({ task, action: "snooze" })}
                            data-testid={`button-snooze-task-${task.id}`}
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Snooze
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActioningTask({ task, action: "dismiss" })}
                            data-testid={`button-dismiss-task-${task.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTask(task)}
                        data-testid={`button-view-task-${task.id}`}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No maintenance tasks found.</p>
                {(statusFilter !== "all" || vehicleFilter !== "all") && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStatusFilter("all");
                      setVehicleFilter("all");
                    }}
                    data-testid="button-clear-filters"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task Details Dialog */}
        <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
          <DialogContent data-testid="dialog-task-details">
            <DialogHeader>
              <DialogTitle>{selectedTask?.checklistItemTitle}</DialogTitle>
              <DialogDescription>
                Maintenance task details
              </DialogDescription>
            </DialogHeader>
            {selectedTask && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Vehicle</p>
                    <p className="text-sm text-muted-foreground">{selectedTask.vehicle.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Plan</p>
                    <p className="text-sm text-muted-foreground">{selectedTask.planName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge variant={getStatusColor(selectedTask.status)}>
                      {selectedTask.status}
                    </Badge>
                  </div>
                  {selectedTask.dueAt && (
                    <div>
                      <p className="text-sm font-medium">Due Date</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedTask.dueAt), "MMMM d, yyyy")}
                      </p>
                    </div>
                  )}
                  {selectedTask.snoozedUntil && (
                    <div>
                      <p className="text-sm font-medium">Snoozed Until</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedTask.snoozedUntil), "MMMM d, yyyy")}
                      </p>
                    </div>
                  )}
                  {selectedTask.completedAt && (
                    <div>
                      <p className="text-sm font-medium">Completed At</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedTask.completedAt), "MMMM d, yyyy")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!actioningTask} onOpenChange={(open) => !open && setActioningTask(null)}>
          <AlertDialogContent data-testid="dialog-confirm-action">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actioningTask?.action === "complete" && "Complete Task?"}
                {actioningTask?.action === "snooze" && "Snooze Task?"}
                {actioningTask?.action === "dismiss" && "Dismiss Task?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actioningTask?.action === "complete" && 
                  `Mark "${actioningTask.task.checklistItemTitle}" as completed? This will record the task as done.`
                }
                {actioningTask?.action === "snooze" && 
                  `Snooze "${actioningTask.task.checklistItemTitle}" for 7 days? You'll be reminded again after the snooze period.`
                }
                {actioningTask?.action === "dismiss" && 
                  `Dismiss "${actioningTask.task.checklistItemTitle}"? This will remove the task without marking it as completed.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-action">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => actioningTask && handleAction(actioningTask.action)}
                data-testid="button-confirm-action"
              >
                {actioningTask?.action === "complete" && "Complete"}
                {actioningTask?.action === "snooze" && "Snooze"}
                {actioningTask?.action === "dismiss" && "Dismiss"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
