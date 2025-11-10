import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Filter, Search, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { format } from "date-fns";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { TrackdayDialog } from "@/components/trackday-dialog";
import type { Trackday, Track, Vehicle } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

interface Settings {
  id: string;
  currency: string;
  homeLat: number | null;
  homeLng: number | null;
  fuelPricePerLitre: number;
  tollsPerKm: number;
  annualBudgetCents: number;
  openRouteServiceKey: string;
  openWeatherApiKey: string;
}

export default function Trackdays() {
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<string>("all");
  const [participationFilter, setParticipationFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: trackdays, isLoading } = useQuery<Array<Trackday & { track: Track; vehicle?: Vehicle }>>({
    queryKey: ["/api/trackdays", year, participationFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (year && year !== "all") params.append("year", year);
      if (participationFilter && participationFilter !== "all") params.append("participationStatus", participationFilter);
      const response = await fetch(`/api/trackdays?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch trackdays");
      return response.json();
    },
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const getGoogleMapsUrl = (track: Track) => {
    if (!settings?.homeLat || !settings?.homeLng) return null;
    
    const origin = `${settings.homeLat},${settings.homeLng}`;
    const destination = `${track.lat},${track.lng}`;
    
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  };

  const filteredTrackdays = trackdays?.filter((td) => {
    if (search && !td.track.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const formatCurrency = (cents: number) => {
    return `${(cents / 100).toFixed(0)} CHF`;
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold">Trackdays</h1>
            <p className="text-muted-foreground">
              Manage and track your trackday events
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-trackday">
            <Plus className="w-4 h-4 mr-2" />
            Add Trackday
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search trackdays..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-[150px]" data-testid="select-year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                </SelectContent>
              </Select>
              <Select value={participationFilter} onValueChange={setParticipationFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="attended">Attended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Trackday Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-40 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTrackdays && filteredTrackdays.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrackdays.map((trackday) => {
              const googleMapsUrl = getGoogleMapsUrl(trackday.track);
              
              return (
                <Link key={trackday.id} href={`/trackdays/${trackday.id}`} data-testid={`link-trackday-card-${trackday.id}`}>
                  <Card className="h-full hover-elevate active-elevate-2 cursor-pointer">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-md p-2 min-w-[3rem]">
                            <div className="text-sm font-mono font-semibold">
                              {format(new Date(trackday.startDate), "MMM")}
                            </div>
                            <div className="text-2xl font-mono font-bold">
                              {format(new Date(trackday.startDate), "dd")}
                            </div>
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{trackday.track.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {trackday.track.country}
                            </p>
                          </div>
                        </div>
                        {googleMapsUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            data-testid={`button-navigate-${trackday.id}`}
                          >
                            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" title="Navigate in Google Maps">
                              <Navigation className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status={trackday.participationStatus}
                          type="participation"
                        />
                      </div>
                      {trackday.vehicle && (
                        <div className="text-sm text-muted-foreground">
                          {trackday.vehicle.name}
                        </div>
                      )}
                      {trackday.routeDistance && (
                        <div className="text-sm font-mono text-muted-foreground">
                          {trackday.routeDistance.toFixed(0)} km
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Filter}
            title="No trackdays found"
            description="Try adjusting your filters or add your first trackday to get started."
            actionLabel="Add Trackday"
            onAction={() => setIsAddDialogOpen(true)}
          />
        )}
      </div>

      <TrackdayDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
}
