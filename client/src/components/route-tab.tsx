import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Clock, DollarSign } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MapView } from "@/components/map-view";
import type { Trackday, Track } from "@shared/schema";

interface RouteTabProps {
  trackday: Trackday & any;
}

export function RouteTab({ trackday }: RouteTabProps) {
  const { toast } = useToast();

  const { data: tracks } = useQuery<Track[]>({
    queryKey: ["/api/tracks"],
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/trackdays/${trackday.id}/calculate-route`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trackdays"] });
      toast({
        title: "Route calculated",
        description: "Travel costs have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to calculate route.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (cents: number) => {
    return `${(cents / 100).toFixed(2)} CHF`;
  };

  // Find the track for this trackday
  const track = tracks?.find(t => t.id === trackday.trackId);

  // Enrich trackday with track data for MapView
  const enrichedTrackday = track ? { ...trackday, track } : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Route & Travel Costs</CardTitle>
          <Button
            onClick={() => recalculateMutation.mutate()}
            disabled={recalculateMutation.isPending}
            size="sm"
            data-testid="button-recalculate"
          >
            {recalculateMutation.isPending ? "Calculating..." : "Recalculate"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {trackday.routeGeometry && tracks && track ? (
            <div className="rounded-lg overflow-hidden border" style={{ height: "400px" }}>
              <MapView
                tracks={[track]}
                trackdays={enrichedTrackday ? [enrichedTrackday] : []}
                center={[track.lat, track.lng]}
                zoom={7}
              />
            </div>
          ) : (
            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
              <div className="text-center space-y-2">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  {trackday.routeGeometry ? "Loading map..." : "Click 'Recalculate' to generate route"}
                </p>
              </div>
            </div>
          )}

          {trackday.routeDistance ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Navigation className="w-4 h-4" />
                  <p className="text-sm">Distance</p>
                </div>
                <p className="text-xl font-mono font-semibold" data-testid="route-distance">
                  {trackday.routeDistance.toFixed(0)} km
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <p className="text-sm">Duration</p>
                </div>
                <p className="text-xl font-mono font-semibold">
                  {trackday.routeDuration ? `${Math.floor(trackday.routeDuration / 60)}h ${trackday.routeDuration % 60}m` : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <p className="text-sm">Fuel Cost</p>
                </div>
                <p className="text-xl font-mono font-semibold">
                  {trackday.routeFuelCost ? formatCurrency(trackday.routeFuelCost) : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <p className="text-sm">Toll Cost</p>
                </div>
                <p className="text-xl font-mono font-semibold">
                  {trackday.routeTollsCost ? formatCurrency(trackday.routeTollsCost) : "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Click "Recalculate" to calculate route and travel costs
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
