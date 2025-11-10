import { useState, useMemo } from "react";
import { 
  format, 
  parseISO, 
  isToday,
  isPast,
  isFuture,
  isSameDay,
  startOfDay,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  compareAsc
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin } from "lucide-react";
import type { Trackday, Track } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { formatDateRange } from "@/lib/utils";

const getStatusColor = (status: string) => {
  switch (status) {
    case "planned":
      return "border-blue-500 bg-blue-500/10";
    case "registered":
      return "border-orange-500 bg-orange-500/10";
    case "attended":
      return "border-green-500 bg-green-500/10";
    case "cancelled":
      return "border-red-500 bg-red-500/10";
    default:
      return "border-muted bg-muted";
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "planned":
      return "bg-blue-500";
    case "registered":
      return "bg-orange-500";
    case "attended":
      return "bg-green-500";
    case "cancelled":
      return "bg-red-500";
    default:
      return "bg-muted";
  }
};

const getStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

interface TrackdayCalendarProps {
  trackdays?: Array<Trackday & { track: Track }>;
  isLoading?: boolean;
}

export function TrackdayCalendar({ trackdays = [], isLoading }: TrackdayCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfDay(new Date());

  // Filter trackdays that intersect with the current month
  const currentMonthTrackdays = useMemo(() => {
    if (!trackdays.length) return [];

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

    // Filter trackdays whose date range intersects with the current month
    const filtered = trackdays.filter(trackday => {
      // Check if trackday's date range overlaps with the month's range
      // Overlap occurs if: trackday.startDate <= monthEnd AND trackday.endDate >= monthStart
      return trackday.startDate <= monthEndStr && trackday.endDate >= monthStartStr;
    });

    // Sort by start date
    return filtered.sort((a, b) => 
      compareAsc(parseISO(a.startDate), parseISO(b.startDate))
    );
  }, [trackdays, currentMonth]);

  // Check if a trackday includes today
  const trackdayIncludesToday = (trackday: Trackday) => {
    const start = parseISO(trackday.startDate);
    const end = parseISO(trackday.endDate);
    const todayStr = format(today, 'yyyy-MM-dd');
    return todayStr >= trackday.startDate && todayStr <= trackday.endDate;
  };

  // Check if a trackday is in the past
  const trackdayIsPast = (trackday: Trackday) => {
    const end = parseISO(trackday.endDate);
    return isPast(end) && !trackdayIncludesToday(trackday);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Trackday Calendar
          </CardTitle>

          {/* Month navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="text-sm font-semibold min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              data-testid="button-next-month"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Planned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Registered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Attended</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Cancelled</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading trackdays...
          </div>
        ) : trackdays.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No trackdays scheduled yet
          </div>
        ) : currentMonthTrackdays.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No trackdays in {format(currentMonth, "MMMM yyyy")}
          </div>
        ) : (
          <div className="space-y-3">
            {currentMonthTrackdays.map((trackday) => {
              const isCurrentDay = trackdayIncludesToday(trackday);
              const isPastTrackday = trackdayIsPast(trackday);
              const startDate = parseISO(trackday.startDate);
              const endDate = parseISO(trackday.endDate);
              const isMultiDay = !isSameDay(startDate, endDate);

              return (
                <Link 
                  key={trackday.id} 
                  href={`/trackdays/${trackday.id}`}
                  data-testid={`calendar-trackday-${trackday.id}`}
                >
                  <div
                    className={cn(
                      "border-l-4 rounded-lg p-4 transition-all hover-elevate active-elevate-2 cursor-pointer",
                      getStatusColor(trackday.participationStatus),
                      isCurrentDay && "ring-2 ring-primary ring-offset-2 bg-primary/5",
                      isPastTrackday && "opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      {/* Left side: Date and info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Date */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className={cn(
                            "font-semibold text-lg",
                            isPastTrackday && "text-muted-foreground"
                          )}>
                            {formatDateRange(trackday.startDate, trackday.endDate)}
                          </div>
                          
                          {isCurrentDay && (
                            <Badge 
                              variant="default" 
                              className="bg-primary text-primary-foreground"
                              data-testid="badge-today"
                            >
                              Today
                            </Badge>
                          )}
                          
                          {isPastTrackday && (
                            <Badge 
                              variant="secondary"
                              className="text-muted-foreground"
                            >
                              Past
                            </Badge>
                          )}
                        </div>

                        {/* Track name - Title */}
                        <div className={cn(
                          "text-xl font-bold",
                          isPastTrackday ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {trackday.track.name}
                        </div>

                        {/* Track location */}
                        {trackday.track.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{trackday.track.location}</span>
                          </div>
                        )}

                        {/* Additional info */}
                        {trackday.organizerName && (
                          <div className="text-sm text-muted-foreground">
                            Organized by {trackday.organizerName}
                          </div>
                        )}
                      </div>

                      {/* Right side: Status badge */}
                      <div className="flex flex-col items-end gap-2">
                        <Badge 
                          className={cn(
                            "text-white font-medium",
                            getStatusBadgeColor(trackday.participationStatus)
                          )}
                          data-testid={`badge-status-${trackday.id}`}
                        >
                          {getStatusLabel(trackday.participationStatus)}
                        </Badge>
                        
                        {isMultiDay && (
                          <div className="text-xs text-muted-foreground">
                            {trackday.durationDays} days
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
