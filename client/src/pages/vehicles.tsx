import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Car, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { VehicleDialog } from "@/components/vehicle-dialog";
import { MaintenanceDialog } from "@/components/maintenance-dialog";
import { Badge } from "@/components/ui/badge";
import type { Vehicle, MaintenanceLog } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Vehicles() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  const [maintenanceDialogVehicle, setMaintenanceDialogVehicle] = useState<string | null>(null);

  const { data: vehicles, isLoading } = useQuery<Array<Vehicle & { maintenance?: MaintenanceLog[] }>>({
    queryKey: ["/api/vehicles"],
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
                        <Badge variant="outline">{vehicle.fuelType}</Badge>
                        <span className="text-sm text-muted-foreground font-mono">
                          {vehicle.consumptionPer100}L/100km
                        </span>
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
                  </div>
                </CardHeader>
                {vehicle.notes && (
                  <CardContent className="pb-4">
                    <p className="text-sm text-muted-foreground">{vehicle.notes}</p>
                  </CardContent>
                )}
                {expandedVehicle === vehicle.id && vehicle.maintenance && vehicle.maintenance.length > 0 && (
                  <CardContent className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Maintenance History</h4>
                    <div className="space-y-2">
                      {vehicle.maintenance.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-sm">
                              <div className="font-medium">{log.type.replace(/_/g, ' ')}</div>
                              <div className="text-muted-foreground">
                                {format(new Date(log.date), "MMM dd, yyyy")}
                              </div>
                            </div>
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
    </div>
  );
}
