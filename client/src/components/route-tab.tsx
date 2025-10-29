import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Clock, DollarSign, ExternalLink, Share2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MapView } from "@/components/map-view";
import { ShareRouteDialog } from "@/components/share-route-dialog";
import type { Trackday, Track } from "@shared/schema";

interface RouteTabProps {
  trackday: Trackday & any;
}

interface Settings {
  id: string;
  currency: string;
  homeLat: number | null;
  homeLng: number | null;
  fuelPrice95Cents: number;
  fuelPrice98Cents: number;
  dieselPriceCents: number;
  openrouteServiceKey: string;
  openWeatherApiKey: string;
  annualBudgetCents: number;
}

export function RouteTab({ trackday }: RouteTabProps) {
  const { toast } = useToast();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const { data: tracks } = useQuery<Track[]>({
    queryKey: ["/api/tracks"],
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
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

  // Generate Google Maps navigation URL
  const getGoogleMapsUrl = () => {
    if (!track || !settings?.homeLat || !settings?.homeLng) return null;
    
    const origin = `${settings.homeLat},${settings.homeLng}`;
    const destination = `${track.lat},${track.lng}`;
    
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  };

  const googleMapsUrl = getGoogleMapsUrl();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 flex-wrap">
          <CardTitle>Route & Travel Costs</CardTitle>
          <div className="flex gap-2 flex-wrap">
            {googleMapsUrl && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShareDialogOpen(true)}
                  data-testid="button-share-route"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share to Phone
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  data-testid="button-open-google-maps"
                >
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                    <Navigation className="w-4 h-4 mr-2" />
                    Open in Google Maps
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                </Button>
              </>
            )}
            <Button
              onClick={() => recalculateMutation.mutate()}
              disabled={recalculateMutation.isPending}
              size="sm"
              data-testid="button-recalculate"
            >
              {recalculateMutation.isPending ? "Calculating..." : "Recalculate"}
            </Button>
          </div>
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

      {/* Share Dialog */}
      {googleMapsUrl && track && (
        <ShareRouteDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          googleMapsUrl={googleMapsUrl}
          trackName={track.name}
        />
      )}
    </div>
  );
}
