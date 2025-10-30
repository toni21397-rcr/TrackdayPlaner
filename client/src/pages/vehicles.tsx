import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Car, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { VehicleDialog } from "@/components/vehicle-dialog";
import { MaintenanceDialog } from "@/components/maintenance-dialog";
import { Badge } from "@/components/ui/badge";
import type { Vehicle, MaintenanceLog } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

export default function Vehicles() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  const [maintenanceDialogVehicle, setMaintenanceDialogVehicle] = useState<string | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const { toast } = useToast();

  const { data: vehicles, isLoading } = useQuery<Array<Vehicle & { maintenance?: MaintenanceLog[] }>>({
    queryKey: ["/api/vehicles"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/vehicles/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Vehicle deleted",
        description: "The vehicle has been successfully removed.",
      });
      setDeletingVehicle(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete vehicle. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (cents: number) => {
    return `${(cents / 100).toFixed(2)} CHF`;
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold">Vehicles</h1>
            <p className="text-muted-foreground">
              Manage your vehicles and maintenance logs
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-vehicle">
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        </div>

        {/* Vehicles List */}
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
        ) : vehicles && vehicles.length > 0 ? (
          <div className="space-y-4">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Car className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{vehicle.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{vehicle.type}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMaintenanceDialogVehicle(vehicle.id)}
                      data-testid={`button-add-maintenance-${vehicle.id}`}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Maintenance
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingVehicle(vehicle)}
                      data-testid={`button-edit-vehicle-${vehicle.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingVehicle(vehicle)}
                      data-testid={`button-delete-vehicle-${vehicle.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {vehicle.maintenance && vehicle.maintenance.length > 3 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedVehicle(
                          expandedVehicle === vehicle.id ? null : vehicle.id
                        )}
                        data-testid={`button-toggle-maintenance-${vehicle.id}`}
                      >
                        {expandedVehicle === vehicle.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                {vehicle.notes && (
                  <CardContent className="pb-4">
                    <p className="text-sm text-muted-foreground">{vehicle.notes}</p>
                  </CardContent>
                )}
                
                {/* Recent Maintenance (Last 3) - Always Visible */}
                {vehicle.maintenance && vehicle.maintenance.length > 0 && (
                  <CardContent className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Recent Maintenance</h4>
                    <div className="space-y-2">
                      {vehicle.maintenance.slice(0, 3).map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-md bg-muted/50"
                          data-testid={`maintenance-${log.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 text-sm">
                              <div className="font-medium">{log.type.replace(/_/g, ' ')}</div>
                              <div className="text-muted-foreground">
                                {format(new Date(log.date), "MMM dd, yyyy")}
                              </div>
                              {log.notes && (
                                <div className="text-muted-foreground mt-1">
                                  {log.notes}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-semibold">
                                {formatCurrency(log.costCents)}
                              </div>
                              {log.odometerKm && (
                                <div className="text-xs text-muted-foreground">
                                  {log.odometerKm.toLocaleString()} km
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
                
                {/* Older Maintenance - Expandable */}
                {expandedVehicle === vehicle.id && vehicle.maintenance && vehicle.maintenance.length > 3 && (
                  <CardContent className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Older Maintenance</h4>
                    <div className="space-y-2">
                      {vehicle.maintenance.slice(3).map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-md bg-muted/50"
                          data-testid={`maintenance-${log.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 text-sm">
                              <div className="font-medium">{log.type.replace(/_/g, ' ')}</div>
                              <div className="text-muted-foreground">
                                {format(new Date(log.date), "MMM dd, yyyy")}
                              </div>
                              {log.notes && (
                                <div className="text-muted-foreground mt-1">
                                  {log.notes}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-semibold">
                                {formatCurrency(log.costCents)}
                              </div>
                              {log.odometerKm && (
                                <div className="text-xs text-muted-foreground">
                                  {log.odometerKm.toLocaleString()} km
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Car}
            title="No vehicles yet"
            description="Add your first vehicle to track fuel consumption and maintenance."
            actionLabel="Add Vehicle"
            onAction={() => setIsAddDialogOpen(true)}
          />
        )}
      </div>

      <VehicleDialog
        open={isAddDialogOpen || editingVehicle !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingVehicle(null);
          }
        }}
        vehicle={editingVehicle || undefined}
      />

      {maintenanceDialogVehicle && (
        <MaintenanceDialog
          open={true}
          onOpenChange={(open) => !open && setMaintenanceDialogVehicle(null)}
          vehicleId={maintenanceDialogVehicle}
        />
      )}

      <AlertDialog open={deletingVehicle !== null} onOpenChange={(open) => !open && setDeletingVehicle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingVehicle?.name}? This action cannot be undone and will remove all associated maintenance records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingVehicle && deleteMutation.mutate(deletingVehicle.id)}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
