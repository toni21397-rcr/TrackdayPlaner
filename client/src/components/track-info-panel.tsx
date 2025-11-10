import { X, MapPin, Ruler, TrendingUp, Map, Info, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Track, Trackday } from "@shared/schema";
import { format } from "date-fns";
import { formatDateRange } from "@/lib/utils";

interface TrackdayWithTrack extends Trackday {
  track?: Track;
}

interface TrackInfoPanelProps {
  track: Track | null;
  trackdays?: TrackdayWithTrack[];
  onClose: () => void;
  onTrackdayClick?: (trackday: TrackdayWithTrack) => void;
}

export function TrackInfoPanel({ track, trackdays = [], onClose, onTrackdayClick }: TrackInfoPanelProps) {
  if (!track) return null;

  // Filter trackdays for this track
  const trackTrackdays = trackdays.filter((td) => td.trackId === track.id);

  // Status colors
  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    planned: "default",
    registered: "secondary",
    attended: "outline",
    cancelled: "destructive",
  };

  return (
    <div className="absolute top-0 right-0 h-full w-full md:w-96 bg-background border-l shadow-lg z-[1000] overflow-y-auto">
      <div className="p-4 border-b sticky top-0 bg-background z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold truncate" data-testid="track-info-name">
              {track.name}
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{track.country}</span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            data-testid="button-close-track-info"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Summary */}
        {track.summary && (
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Overview
            </h3>
            <p className="text-sm text-muted-foreground" data-testid="track-info-summary">
              {track.summary}
            </p>
          </div>
        )}

        {/* Track Details */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Map className="w-4 h-4" />
            Track Details
          </h3>
          <div className="space-y-2">
            {track.lengthKm && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Ruler className="w-4 h-4" />
                  <span>Length</span>
                </div>
                <Badge variant="secondary" data-testid="track-info-length">
                  {track.lengthKm.toFixed(2)} km
                </Badge>
              </div>
            )}
            {track.turns && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>Turns</span>
                </div>
                <Badge variant="secondary" data-testid="track-info-turns">
                  {track.turns}
                </Badge>
              </div>
            )}
            {track.surface && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Surface</span>
                <Badge variant="secondary" data-testid="track-info-surface">
                  {track.surface}
                </Badge>
              </div>
            )}
            {track.difficulty && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Difficulty</span>
                <Badge
                  variant={
                    track.difficulty.toLowerCase() === "advanced"
                      ? "destructive"
                      : track.difficulty.toLowerCase() === "intermediate"
                      ? "default"
                      : "secondary"
                  }
                  data-testid="track-info-difficulty"
                >
                  {track.difficulty}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Facilities */}
        {track.facilities && track.facilities.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Facilities</h3>
            <div className="flex flex-wrap gap-2">
              {track.facilities.map((facility, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  data-testid={`facility-${index}`}
                >
                  {facility}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tips & Nice to Know */}
        {track.tips && track.tips.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Nice to Know</h3>
            <Card>
              <CardContent className="p-3">
                <ul className="space-y-2">
                  {track.tips.map((tip, index) => (
                    <li
                      key={index}
                      className="text-sm text-muted-foreground flex gap-2"
                      data-testid={`tip-${index}`}
                    >
                      <span className="text-primary">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trackdays */}
        {trackTrackdays.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Your Trackdays ({trackTrackdays.length})
            </h3>
            <div className="space-y-2">
              {trackTrackdays.map((trackday) => (
                <Card
                  key={trackday.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => onTrackdayClick?.(trackday)}
                  data-testid={`trackday-card-${trackday.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {formatDateRange(trackday.startDate, trackday.endDate)}
                        </div>
                        {trackday.notes && (
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {trackday.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={statusColors[trackday.participationStatus] || "default"}>
                          {trackday.participationStatus}
                        </Badge>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Organizer */}
        {track.organizerName && (
          <div>
            <h3 className="text-sm font-medium mb-2">Organizer</h3>
            <Card>
              <CardContent className="p-3">
                <div className="text-sm font-medium" data-testid="track-info-organizer-name">
                  {track.organizerName}
                </div>
                {track.organizerWebsite && (
                  <a
                    href={track.organizerWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                    data-testid="track-info-organizer-website"
                  >
                    Visit Website
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
