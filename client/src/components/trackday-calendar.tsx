import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  startOfYear,
  endOfYear,
  compareAsc
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Wrench } from "lucide-react";
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

// Fun empty state messages
const getRandomEmptyMessage = (monthName: string) => {
  const messages = [
    `Your wife doesn't know it yet but maybe you'll be racing in ${monthName}`,
    `No trackdays planned yet - keep your bike warm or it will miss you`,
    `${monthName} is looking lonely - time to book some track action`,
    `Your motorcycle is getting dusty in ${monthName}`,
    `No races scheduled - but there's still time to surprise yourself in ${monthName}`,
    `Empty calendar in ${monthName}? Your bike is giving you the silent treatment`,
    `${monthName} needs more speed - no trackdays booked yet`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};

interface TrackdayCalendarProps {
  trackdays?: Array<Trackday & { track: Track }>;
  isLoading?: boolean;
}

interface MaintenanceTask {
  id: string;
  customTitle?: string;
  checklistItemTitle: string;
  dueAt: string;
  status: string;
  vehicle: {
    id: string;
    make: string;
    model: string;
  };
  planName: string;
}

export function TrackdayCalendar({ trackdays = [], isLoading }: TrackdayCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const today = startOfDay(new Date());

  // Query maintenance tasks
  const { data: maintenanceTasks = [], isLoading: isLoadingTasks } = useQuery<MaintenanceTask[]>({
    queryKey: ["/api/maintenance-tasks"],
    enabled: true,
  });

  // Filter trackdays that intersect with the current month
  const getTrackdaysForMonth = (month: Date) => {
    if (!trackdays.length) return [];

    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

    const filtered = trackdays.filter(trackday => {
      return trackday.startDate <= monthEndStr && trackday.endDate >= monthStartStr;
    });

    return filtered.sort((a, b) => 
      compareAsc(parseISO(a.startDate), parseISO(b.startDate))
    );
  };

  // Filter maintenance tasks for the current month
  const getMaintenanceTasksForMonth = (month: Date) => {
    if (!maintenanceTasks.length) return [];

    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    return maintenanceTasks.filter(task => {
      if (task.status === 'completed' || task.status === 'dismissed') return false;
      const dueDate = parseISO(task.dueAt);
      return dueDate >= monthStart && dueDate <= monthEnd;
    }).sort((a, b) => 
      compareAsc(parseISO(a.dueAt), parseISO(b.dueAt))
    );
  };

  const currentMonthTrackdays = getTrackdaysForMonth(currentMonth);
  const currentMonthTasks = getMaintenanceTasksForMonth(currentMonth);

  // Check if a trackday includes today
  const trackdayIncludesToday = (trackday: Trackday) => {
    const todayStr = format(today, 'yyyy-MM-dd');
    return todayStr >= trackday.startDate && todayStr <= trackday.endDate;
  };

  // Check if a trackday is in the past
  const trackdayIsPast = (trackday: Trackday) => {
    const end = parseISO(trackday.endDate);
    return isPast(end) && !trackdayIncludesToday(trackday);
  };

  // Check if a maintenance task is due today
  const taskIsDueToday = (task: MaintenanceTask) => {
    return isToday(parseISO(task.dueAt));
  };

  // Check if a maintenance task is overdue
  const taskIsOverdue = (task: MaintenanceTask) => {
    const dueDate = parseISO(task.dueAt);
    return isPast(dueDate) && !isToday(dueDate);
  };

  // Get all months for year view
  const yearMonths = useMemo(() => {
    const yearStart = startOfYear(currentMonth);
    const yearEnd = endOfYear(currentMonth);
    return eachMonthOfInterval({ start: yearStart, end: yearEnd });
  }, [currentMonth]);

  const renderMonthContent = (month: Date, isCompact: boolean = false) => {
    const monthTrackdays = getTrackdaysForMonth(month);
    const monthTasks = getMaintenanceTasksForMonth(month);
    const monthName = format(month, "MMMM");
    const hasContent = monthTrackdays.length > 0 || monthTasks.length > 0;

    if (!hasContent) {
      return (
        <div className={cn(
          "text-center text-muted-foreground italic",
          isCompact ? "py-4 text-xs" : "py-8"
        )}>
          {getRandomEmptyMessage(monthName)}
        </div>
      );
    }

    return (
      <div className={cn("space-y-2", isCompact && "space-y-1")}>
        {/* Trackdays */}
        {monthTrackdays.map((trackday) => {
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
                  "border-l-4 rounded-lg transition-all hover-elevate active-elevate-2 cursor-pointer",
                  getStatusColor(trackday.participationStatus),
                  isCompact ? "p-2" : "p-4",
                  isCurrentDay && "ring-2 ring-primary ring-offset-2 bg-primary/5",
                  isPastTrackday && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={cn(
                        "font-semibold",
                        isCompact ? "text-sm" : "text-base",
                        isPastTrackday && "text-muted-foreground"
                      )}>
                        {formatDateRange(trackday.startDate, trackday.endDate)}
                      </div>
                      
                      {isCurrentDay && !isCompact && (
                        <Badge 
                          variant="default" 
                          className="bg-primary text-primary-foreground text-xs"
                          data-testid="badge-today"
                        >
                          Today
                        </Badge>
                      )}
                      
                      {isPastTrackday && !isCompact && (
                        <Badge 
                          variant="secondary"
                          className="text-muted-foreground text-xs"
                        >
                          Past
                        </Badge>
                      )}
                    </div>

                    <div className={cn(
                      "font-bold",
                      isCompact ? "text-base" : "text-lg",
                      isPastTrackday ? "text-muted-foreground" : "text-foreground"
                    )}>
                      {trackday.track.name}
                    </div>

                    {!isCompact && trackday.track.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{trackday.track.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Badge 
                      className={cn(
                        "text-white font-medium",
                        getStatusBadgeColor(trackday.participationStatus),
                        isCompact && "text-xs"
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

        {/* Maintenance Tasks */}
        {monthTasks.map((task) => {
          const isDueToday = taskIsDueToday(task);
          const isOverdue = taskIsOverdue(task);

          return (
            <div
              key={task.id}
              className={cn(
                "border-l-4 rounded-lg bg-purple-500/10 border-purple-500",
                isCompact ? "p-2" : "p-3",
                isDueToday && "ring-2 ring-purple-500 ring-offset-2",
                isOverdue && "border-red-500 bg-red-500/10"
              )}
              data-testid={`calendar-task-${task.id}`}
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={cn(
                      "font-semibold",
                      isCompact ? "text-xs" : "text-sm",
                      isOverdue ? "text-red-600 dark:text-red-400" : "text-purple-600 dark:text-purple-400"
                    )}>
                      {format(parseISO(task.dueAt), "MMM d")}
                    </div>
                    
                    {isDueToday && !isCompact && (
                      <Badge 
                        variant="default" 
                        className="bg-purple-500 text-white text-xs"
                      >
                        Due Today
                      </Badge>
                    )}
                    
                    {isOverdue && !isCompact && (
                      <Badge 
                        variant="destructive"
                        className="text-xs"
                      >
                        Overdue
                      </Badge>
                    )}
                  </div>

                  <div className={cn(
                    "font-bold flex items-center gap-1",
                    isCompact ? "text-sm" : "text-base",
                    isOverdue ? "text-red-700 dark:text-red-300" : "text-purple-700 dark:text-purple-300"
                  )}>
                    <Wrench className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
                    {task.customTitle || task.checklistItemTitle}
                  </div>

                  {!isCompact && (
                    <div className="text-xs text-muted-foreground">
                      {task.vehicle.make} {task.vehicle.model} - {task.planName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Trackday Calendar
          </CardTitle>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View mode toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "month" | "year")}>
              <TabsList data-testid="tabs-calendar-view">
                <TabsTrigger value="month" data-testid="tab-month-view">Month</TabsTrigger>
                <TabsTrigger value="year" data-testid="tab-year-view">Year</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Month navigation */}
            {viewMode === "month" && (
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
            )}

            {viewMode === "year" && (
              <div className="text-sm font-semibold">
                {format(currentMonth, "yyyy")}
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground mt-4">
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
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span>Maintenance</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading || isLoadingTasks ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading calendar...
          </div>
        ) : viewMode === "month" ? (
          renderMonthContent(currentMonth, false)
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {yearMonths.map((month) => (
              <div key={month.toString()} className="space-y-2">
                <div className="text-base font-semibold border-b pb-2">
                  {format(month, "MMMM yyyy")}
                </div>
                {renderMonthContent(month, true)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
