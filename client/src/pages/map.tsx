import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Filter } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MapView } from "@/components/map-view";
import { TrackInfoPanel } from "@/components/track-info-panel";
import type { Track, Trackday } from "@shared/schema";

interface TrackdayWithTrack extends Trackday {
  track?: Track;
}

interface Settings {
  userId: string;
  homeLat: number | null;
  homeLng: number | null;
  homeAddress: string | null;
  preferredRouteService: string | null;
  enableEmailNotifications: boolean;
  enableInAppNotifications: boolean;
  timezone: string | null;
}

export default function MapPage() {
  const [, setLocation] = useLocation();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  const { data: tracks, isLoading: tracksLoading } = useQuery<Track[]>({
    queryKey: ["/api/tracks"],
  });

  const { data: trackdays, isLoading: trackdaysLoading } = useQuery<TrackdayWithTrack[]>({
    queryKey: ["/api/trackdays"],
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  // Extract unique years from trackdays
  const years = useMemo(() => {
    if (!trackdays) return [];
    const yearSet = new Set(
      trackdays.map((td) => new Date(td.startDate).getFullYear().toString())
    );
    return Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));
  }, [trackdays]);

  // Filter trackdays based on selected year and status
  const filteredTrackdays = useMemo(() => {
    if (!trackdays) return [];

    return trackdays.filter((td) => {
      const yearMatch =
        selectedYear === "all" || new Date(td.startDate).getFullYear().toString() === selectedYear;
      const statusMatch = selectedStatus === "all" || td.participationStatus === selectedStatus;
      return yearMatch && statusMatch;
    });
  }, [trackdays, selectedYear, selectedStatus]);

  // Enrich trackdays with track data
  const enrichedTrackdays = useMemo(() => {
    if (!tracks || !filteredTrackdays) return [];
    return filteredTrackdays.map((td) => ({
      ...td,
      track: tracks.find((t) => t.id === td.trackId),
    }));
  }, [tracks, filteredTrackdays]);

  // Enrich all trackdays (unfiltered) for info panel
  const allEnrichedTrackdays = useMemo(() => {
    if (!tracks || !trackdays) return [];
    return trackdays.map((td) => ({
      ...td,
      track: tracks.find((t) => t.id === td.trackId),
    }));
  }, [tracks, trackdays]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredTrackdays.length;
    const byStatus = {
      planned: filteredTrackdays.filter((td) => td.participationStatus === "planned").length,
      registered: filteredTrackdays.filter((td) => td.participationStatus === "registered").length,
      attended: filteredTrackdays.filter((td) => td.participationStatus === "attended").length,
      cancelled: filteredTrackdays.filter((td) => td.participationStatus === "cancelled").length,
    };
    return { total, byStatus };
  }, [filteredTrackdays]);

  const isLoading = tracksLoading || trackdaysLoading;

  const handleTrackdayClick = (trackday: TrackdayWithTrack) => {
    setLocation(`/trackdays/${trackday.id}`);
  };

  const handleTrackClick = (track: Track) => {
    // Navigate to tracks page or show track details
    setLocation(`/tracks`);
  };

  const handleTrackSelect = (track: Track) => {
    setSelectedTrackId(track.id);
  };

  const handleCloseTrackInfo = () => {
    setSelectedTrackId(null);
  };

  const selectedTrack = useMemo(() => {
    if (!selectedTrackId || !tracks) return null;
    return tracks.find((t) => t.id === selectedTrackId) || null;
  }, [selectedTrackId, tracks]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Map Overview</h1>
            <p className="text-muted-foreground">
              View all your tracks and trackdays on the map
            </p>
          </div>

          {tracks && tracks.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32" data-testid="select-year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-36" data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="attended">Attended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {!isLoading && tracks && tracks.length > 0 ? (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total Trackdays</div>
                  <div className="text-2xl font-semibold" data-testid="stat-total">
                    {stats.total}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#3b82f6" }}
                    />
                    <div className="text-sm text-muted-foreground">Planned</div>
                  </div>
                  <div className="text-2xl font-semibold" data-testid="stat-planned">
                    {stats.byStatus.planned}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#f59e0b" }}
                    />
                    <div className="text-sm text-muted-foreground">Registered</div>
                  </div>
                  <div className="text-2xl font-semibold" data-testid="stat-registered">
                    {stats.byStatus.registered}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#10b981" }}
                    />
                    <div className="text-sm text-muted-foreground">Attended</div>
                  </div>
                  <div className="text-2xl font-semibold" data-testid="stat-attended">
                    {stats.byStatus.attended}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#ef4444" }}
                    />
                    <div className="text-sm text-muted-foreground">Cancelled</div>
                  </div>
                  <div className="text-2xl font-semibold" data-testid="stat-cancelled">
                    {stats.byStatus.cancelled}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Map */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Interactive Map</h2>
                    <p className="text-sm text-muted-foreground">
                      Click markers to view trackday details
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: "#3b82f6" }}
                      />
                      <span className="text-muted-foreground">Planned</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: "#f59e0b" }}
                      />
                      <span className="text-muted-foreground">Registered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: "#10b981" }}
                      />
                      <span className="text-muted-foreground">Attended</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] relative">
                  <MapView
                    tracks={tracks}
                    trackdays={enrichedTrackdays}
                    onTrackdayClick={handleTrackdayClick}
                    onTrackClick={handleTrackClick}
                    onTrackSelect={handleTrackSelect}
                    selectedTrackId={selectedTrackId}
                    center={
                      settings?.homeLat !== null && 
                      settings?.homeLat !== undefined && 
                      settings?.homeLng !== null && 
                      settings?.homeLng !== undefined
                        ? [settings.homeLat, settings.homeLng]
                        : undefined
                    }
                    zoom={6}
                    autoFitBounds={
                      !(settings?.homeLat !== null && 
                        settings?.homeLat !== undefined && 
                        settings?.homeLng !== null && 
                        settings?.homeLng !== undefined)
                    }
                    className="rounded-b-lg overflow-hidden"
                  />
                  <TrackInfoPanel 
                    track={selectedTrack} 
                    trackdays={allEnrichedTrackdays}
                    onTrackdayClick={handleTrackdayClick}
                    onClose={handleCloseTrackInfo} 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Track List */}
            <div>
              <h2 className="text-xl font-semibold mb-4">All Tracks</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tracks.map((track) => {
                  const trackTrackdays = filteredTrackdays.filter(
                    (td) => td.trackId === track.id
                  );
                  return (
                    <Card
                      key={track.id}
                      className="hover-elevate cursor-pointer"
                      onClick={() => handleTrackSelect(track)}
                      data-testid={`card-track-${track.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <MapPin className="w-5 h-5 text-primary" />
                            <div>
                              <div className="font-medium">{track.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {track.country}
                              </div>
                            </div>
                          </div>
                          {trackTrackdays.length > 0 && (
                            <Badge variant="secondary" data-testid={`badge-count-${track.id}`}>
                              {trackTrackdays.length}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        ) : isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">Loading map...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={MapPin}
            title="No tracks to display"
            description="Add tracks to see them on the map."
          />
        )}
      </div>
    </div>
  );
}
