import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, Edit, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { TrackdayDialog } from "@/components/trackday-dialog";
import { CostItemsTab } from "@/components/cost-items-tab";
import { RouteTab } from "@/components/route-tab";
import { WeatherTab } from "@/components/weather-tab";
import { TimelineTab } from "@/components/timeline-tab";
import { LapsTab } from "@/components/laps-tab";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Trackday, Track, Vehicle } from "@shared/schema";

export default function TrackdayDetail() {
  const [, params] = useRoute("/trackdays/:id");
  const [, setLocation] = useLocation();
  const trackdayId = params?.id;
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: trackday, isLoading } = useQuery<Trackday & { track: Track; vehicle?: Vehicle }>({
    queryKey: ["/api/trackdays", trackdayId],
    enabled: !!trackdayId,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/trackdays/${trackdayId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trackdays"] });
      toast({
        title: "Trackday deleted",
        description: "The trackday has been removed successfully.",
      });
      setLocation("/trackdays");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete trackday.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!trackday) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <p className="text-center text-muted-foreground">Trackday not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/trackdays">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Trackdays
            </Button>
          </Link>
        </div>

        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-md p-2 min-w-[3.5rem]">
                    <div className="text-sm font-mono font-semibold">
                      {format(new Date(trackday.date), "MMM")}
                    </div>
                    <div className="text-2xl font-mono font-bold">
                      {format(new Date(trackday.date), "dd")}
                    </div>
                    <div className="text-xs font-mono">
                      {format(new Date(trackday.date), "yyyy")}
                    </div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-semibold">{trackday.track.name}</h1>
                    <p className="text-muted-foreground">{trackday.track.country}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={trackday.participationStatus}
                    type="participation"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                  data-testid="button-edit"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this trackday?")) {
                      deleteMutation.mutate();
                    }
                  }}
                  data-testid="button-delete"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">{trackday.durationDays} day{trackday.durationDays !== 1 ? 's' : ''}</p>
            </div>
            {trackday.vehicle && (
              <div>
                <p className="text-sm text-muted-foreground">Vehicle</p>
                <p className="font-medium">{trackday.vehicle.name}</p>
              </div>
            )}
            {trackday.routeDistance && (
              <div>
                <p className="text-sm text-muted-foreground">Distance</p>
                <p className="font-medium font-mono">{trackday.routeDistance.toFixed(0)} km</p>
              </div>
            )}
          </CardContent>
          {trackday.notes && (
            <CardContent className="border-t pt-4">
              <p className="text-sm text-muted-foreground">{trackday.notes}</p>
            </CardContent>
          )}
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="costs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="costs" data-testid="tab-costs">Costs</TabsTrigger>
            <TabsTrigger value="route" data-testid="tab-route">Route</TabsTrigger>
            <TabsTrigger value="weather" data-testid="tab-weather">Weather</TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
            <TabsTrigger value="laps" data-testid="tab-laps">Laps</TabsTrigger>
          </TabsList>

          <TabsContent value="costs">
            <CostItemsTab trackdayId={trackday.id} />
          </TabsContent>

          <TabsContent value="route">
            <RouteTab trackday={trackday} />
          </TabsContent>

          <TabsContent value="weather">
            <WeatherTab trackdayId={trackday.id} date={trackday.date} />
          </TabsContent>

          <TabsContent value="timeline">
            <TimelineTab trackdayId={trackday.id} />
          </TabsContent>

          <TabsContent value="laps">
            <LapsTab trackdayId={trackday.id} />
          </TabsContent>
        </Tabs>
      </div>

      {trackday && (
        <TrackdayDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          trackday={trackday}
        />
      )}
    </div>
  );
}
