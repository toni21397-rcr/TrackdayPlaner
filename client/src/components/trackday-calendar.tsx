import { useState } from "react";
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  startOfYear,
  endOfYear
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Trackday, Track } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getStatusColor = (status: string) => {
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

interface TrackdayCalendarProps {
  trackdays?: Array<Trackday & { track: Track }>;
  isLoading?: boolean;
}

export function TrackdayCalendar({ trackdays = [], isLoading }: TrackdayCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"year" | "month">("year");

  // Get all trackdays for a specific date
  const getTrackdaysForDate = (date: Date) => {
    return trackdays.filter((trackday) => {
      // Check if date falls within the trackday range
      const dateStr = format(date, 'yyyy-MM-dd');
      return dateStr >= trackday.startDate && dateStr <= trackday.endDate;
    });
  };

  // Render a single month calendar
  const renderMonthGrid = (month: Date, isCompact: boolean = false) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Calculate leading empty cells (Monday = 0, Sunday = 6)
    const startDay = (monthStart.getDay() + 6) % 7;
    const leadingEmptyCells = Array(startDay).fill(null);

    return (
      <div className={cn("grid grid-cols-7 gap-1", isCompact ? "text-xs" : "")}>
        {/* Weekday headers */}
        {WEEKDAYS.map((day) => (
          <div 
            key={day} 
            className={cn(
              "text-center font-medium text-muted-foreground",
              isCompact ? "text-[10px] py-0.5" : "text-sm py-2"
            )}
          >
            {isCompact ? day.slice(0, 1) : day}
          </div>
        ))}

        {/* Leading empty cells */}
        {leadingEmptyCells.map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Days */}
        {days.map((day) => {
          const dayTrackdays = getTrackdaysForDate(day);
          const hasTrackdays = dayTrackdays.length > 0;

          return (
            <div
              key={day.toString()}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-md relative",
                isCompact ? "p-0.5" : "p-2",
                !isSameMonth(day, month) && "text-muted-foreground opacity-50",
                hasTrackdays && "font-semibold"
              )}
              data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
            >
              <div className={cn(isCompact ? "text-[10px]" : "text-sm")}>
                {format(day, "d")}
              </div>
              
              {/* Status indicators */}
              {hasTrackdays && (
                <div className={cn(
                  "flex gap-0.5 flex-wrap justify-center mt-0.5",
                  isCompact ? "mt-0" : "mt-1"
                )}>
                  {dayTrackdays.map((trackday, idx) => (
                    <Link 
                      key={trackday.id} 
                      href={`/trackdays/${trackday.id}`}
                      data-testid={`calendar-trackday-${trackday.id}`}
                    >
                      <div
                        className={cn(
                          "rounded-full",
                          getStatusColor(trackday.participationStatus),
                          isCompact ? "w-1 h-1" : "w-1.5 h-1.5"
                        )}
                        title={`${trackday.track.name} - ${trackday.participationStatus}`}
                      />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Year view: 12 mini calendars
  const renderYearView = () => {
    const yearStart = startOfYear(currentMonth);
    const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {months.map((month) => (
          <div key={month.toString()} className="space-y-2">
            <div className="text-sm font-medium text-center">
              {format(month, "MMMM")}
            </div>
            {renderMonthGrid(month, true)}
          </div>
        ))}
      </div>
    );
  };

  // Month view: Single large calendar
  const renderMonthView = () => {
    return (
      <div className="space-y-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-lg font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {renderMonthGrid(currentMonth, false)}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Trackday Calendar
          </CardTitle>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "year" | "month")}>
            <TabsList data-testid="tabs-calendar-view">
              <TabsTrigger value="year" data-testid="tab-year-view">Year</TabsTrigger>
              <TabsTrigger value="month" data-testid="tab-month-view">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-4">
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
            Loading calendar...
          </div>
        ) : trackdays.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No trackdays scheduled yet
          </div>
        ) : (
          <>
            {viewMode === "year" && renderYearView()}
            {viewMode === "month" && renderMonthView()}
          </>
        )}
      </CardContent>
    </Card>
  );
}
