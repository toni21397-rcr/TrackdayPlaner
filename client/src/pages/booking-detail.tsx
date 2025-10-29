import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { ArrowLeft, ExternalLink, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Track, Vehicle } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BookingDetail() {
  const [, params] = useRoute("/booking/:trackId");
  const [, setLocation] = useLocation();
  const trackId = params?.trackId;
  const { toast } = useToast();

  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  
  // Form state
  const [date, setDate] = useState("");
  const [durationDays, setDurationDays] = useState("1");
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  const { data: track, isLoading: trackLoading } = useQuery<Track>({
    queryKey: ["/api/tracks", trackId],
    queryFn: async () => {
      const response = await fetch(`/api/tracks/${trackId}`);
      if (!response.ok) throw new Error("Track not found");
      return response.json();
    },
    enabled: !!trackId,
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const createTrackdayMutation = useMutation({
    mutationFn: async () => {
      if (!track) throw new Error("Track not found");
      if (!date) throw new Error("Date is required");

      // Create trackday
      const trackdayResponse = await apiRequest("POST", "/api/trackdays", {
        trackId: track.id,
        date,
        durationDays: parseInt(durationDays),
        vehicleId: vehicleId || null,
        notes,
        participationStatus: "planned",
      });
      const trackday = await trackdayResponse.json();

      // Create cost item if price provided
      if (price && parseFloat(price) > 0) {
        await apiRequest("POST", "/api/cost-items", {
          trackdayId: trackday.id,
          type: "entry",
          amountCents: Math.round(parseFloat(price) * 100),
          currency: "CHF",
          status: "planned",
          dueDate: date,
          paidAt: null,
          notes: `Entry fee from booking at ${track.organizerName || track.name}`,
          isTravelAuto: false,
        });
      }

      return trackday;
    },
    onSuccess: (trackday) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trackdays"] });
      toast({
        title: "Trackday created!",
        description: "Successfully created from booking information.",
      });
      setLocation(`/trackdays/${trackday.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating trackday",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Detect iframe loading failures
  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  const handleIframeError = () => {
    setIframeBlocked(true);
    setIframeLoading(false);
  };

  if (trackLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="h-full p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (!track || !track.organizerWebsite) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <p className="text-center text-muted-foreground">
            Track not found or no organizer website available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/booking">
              <Button variant="ghost" size="sm" data-testid="button-back-to-booking">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Booking
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">{track.name}</h1>
              <p className="text-sm text-muted-foreground">{track.organizerName || "Organizer Booking"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left: Iframe */}
        <div className="flex-1 overflow-auto border-r">
          <div className="h-full p-4">
            {iframeBlocked ? (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center space-y-4 p-8">
                  <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Website Blocked Embedding</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      This website doesn't allow embedding. Open it in a new tab instead.
                    </p>
                    <Button asChild>
                      <a href={track.organizerWebsite} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in New Tab
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="relative h-full">
                {iframeLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                    <p className="text-muted-foreground">Loading organizer website...</p>
                  </div>
                )}
                <iframe
                  src={track.organizerWebsite}
                  className="w-full h-full border rounded-md"
                  title="Organizer Website"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  data-testid="iframe-organizer-website"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Create Form */}
        <div className="w-full md:w-96 overflow-auto bg-muted/30">
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Quick Create Trackday</h2>
              <p className="text-sm text-muted-foreground">
                Fill in booking details to create a trackday
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  data-testid="input-booking-date"
                  required
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  data-testid="input-booking-duration"
                />
              </div>

              <div>
                <Label htmlFor="vehicle">Vehicle</Label>
                <Select value={vehicleId || undefined} onValueChange={(value) => setVehicleId(value)}>
                  <SelectTrigger id="vehicle" data-testid="select-booking-vehicle">
                    <SelectValue placeholder="Select vehicle (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles?.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="price">Entry Fee (CHF)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 450.00"
                  data-testid="input-booking-price"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any booking details..."
                  rows={3}
                  data-testid="textarea-booking-notes"
                />
              </div>

              <Button
                className="w-full"
                onClick={() => createTrackdayMutation.mutate()}
                disabled={!date || createTrackdayMutation.isPending}
                data-testid="button-create-trackday"
              >
                <Plus className="w-4 h-4 mr-2" />
                {createTrackdayMutation.isPending ? "Creating..." : "Create Trackday"}
              </Button>
            </div>

            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Tip:</strong> Browse the organizer website on the left, then quickly transfer the booking details here to create a trackday with all information saved.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
