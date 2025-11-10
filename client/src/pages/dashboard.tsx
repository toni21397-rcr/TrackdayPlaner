import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/kpi-card";
import { BudgetProgress } from "@/components/budget-progress";
import { MonthlyChart } from "@/components/monthly-chart";
import { TrackdayCalendar } from "@/components/trackday-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Wrench, TrendingUp, MapPin, Car } from "lucide-react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { StatusBadge } from "@/components/status-badge";
import type { DashboardStats, BudgetSummary, MonthlySpending, Trackday, Track, MaintenanceLog, Vehicle, CostItem } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateRange } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type DetailView = "events" | "spent" | "maintenance" | "upcoming" | null;

export default function Dashboard() {
  const [openDetailView, setOpenDetailView] = useState<DetailView>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/summary/stats"],
  });

  const { data: budget, isLoading: budgetLoading } = useQuery<BudgetSummary>({
    queryKey: ["/api/summary/budget"],
  });

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery<MonthlySpending[]>({
    queryKey: ["/api/summary/monthly"],
  });

  const { data: upcoming, isLoading: upcomingLoading } = useQuery<Array<Trackday & { track: Track }>>({
    queryKey: ["/api/trackdays/upcoming"],
  });

  const { data: allTrackdays, isLoading: trackdaysLoading } = useQuery<Array<Trackday & { track: Track }>>({
    queryKey: ["/api/trackdays"],
  });

  const { data: maintenanceLogs, isLoading: maintenanceLoading } = useQuery<Array<MaintenanceLog & { vehicle: Vehicle }>>({
    queryKey: ["/api/maintenance-logs"],
  });

  const { data: costItems, isLoading: costItemsLoading } = useQuery<CostItem[]>({
    queryKey: ["/api/cost-items"],
  });

  const formatCurrency = (cents: number) => {
    return `${(cents / 100).toFixed(0)} CHF`;
  };

  // Get trackdays for this year
  const currentYear = new Date().getFullYear();
  const thisYearTrackdays = allTrackdays?.filter(td => {
    const year = new Date(td.startDate).getFullYear();
    return year === currentYear;
  }) || [];

  // Get maintenance logs for this year
  const thisYearMaintenance = maintenanceLogs?.filter(log => {
    const year = new Date(log.date).getFullYear();
    return year === currentYear;
  }) || [];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your trackday overview.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <KpiCard
                title="Total Events"
                value={stats?.totalEvents || 0}
                subtitle="This year"
                icon={Calendar}
                onClick={() => setOpenDetailView("events")}
              />
              <KpiCard
                title="Total Spent"
                value={formatCurrency(stats?.totalCostCents || 0)}
                subtitle="Including travel"
                icon={DollarSign}
                onClick={() => setOpenDetailView("spent")}
              />
              <KpiCard
                title="Maintenance"
                value={formatCurrency(stats?.maintenanceCostCents || 0)}
                subtitle="This year"
                icon={Wrench}
                onClick={() => setOpenDetailView("maintenance")}
              />
              <KpiCard
                title="Upcoming"
                value={stats?.upcomingEvents || 0}
                subtitle="Events planned"
                icon={TrendingUp}
                onClick={() => setOpenDetailView("upcoming")}
              />
            </>
          )}
        </div>

        {/* Detail View Dialogs */}
        
        {/* Total Events Detail */}
        <Dialog open={openDetailView === "events"} onOpenChange={(open) => !open && setOpenDetailView(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Total Events ({thisYearTrackdays.length} in {currentYear})
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-3">
                {thisYearTrackdays.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No trackdays this year
                  </p>
                ) : (
                  thisYearTrackdays
                    .sort((a, b) => a.startDate.localeCompare(b.startDate))
                    .map((trackday) => (
                      <Link key={trackday.id} href={`/trackdays/${trackday.id}`}>
                        <div className="border rounded-lg p-4 hover-elevate active-elevate-2 cursor-pointer" data-testid={`detail-trackday-${trackday.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg">{trackday.track.name}</h3>
                                <StatusBadge status={trackday.participationStatus} type="participation" />
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {formatDateRange(trackday.startDate, trackday.endDate)}
                                  {trackday.durationDays > 1 && ` (${trackday.durationDays} days)`}
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  {trackday.track.country}
                                </div>
                                {trackday.track.organizerName && (
                                  <div className="text-xs">
                                    Organized by {trackday.track.organizerName}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Total Spent Detail */}
        <Dialog open={openDetailView === "spent"} onOpenChange={(open) => !open && setOpenDetailView(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Total Spent ({formatCurrency(stats?.totalCostCents || 0)} in {currentYear})
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* All Costs */}
                {costItems && costItems.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Cost Items</h3>
                    <div className="space-y-2">
                      {costItems
                        .filter(cost => cost.status === 'paid')
                        .sort((a, b) => {
                          const dateA = cost.paidAt || cost.dueDate || '';
                          const dateB = cost.paidAt || cost.dueDate || '';
                          return dateB.localeCompare(dateA);
                        })
                        .map((cost) => (
                          <div key={cost.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`cost-item-${cost.id}`}>
                            <div className="flex-1">
                              <div className="font-medium capitalize">{cost.type.replace('_', ' ')}</div>
                              {cost.notes && (
                                <div className="text-sm text-muted-foreground">{cost.notes}</div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                {cost.paidAt ? `Paid: ${format(parseISO(cost.paidAt), 'MMM d, yyyy')}` : cost.dueDate ? `Due: ${format(parseISO(cost.dueDate), 'MMM d, yyyy')}` : ''}
                              </div>
                            </div>
                            <div className="font-semibold">{formatCurrency(cost.amountCents)}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Maintenance Detail */}
        <Dialog open={openDetailView === "maintenance"} onOpenChange={(open) => !open && setOpenDetailView(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance ({formatCurrency(stats?.maintenanceCostCents || 0)} in {currentYear})
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-3">
                {thisYearMaintenance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No maintenance logs this year
                  </p>
                ) : (
                  thisYearMaintenance
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((log) => (
                      <div key={log.id} className="border rounded-lg p-4" data-testid={`maintenance-log-${log.id}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{log.type}</h3>
                              <Badge variant="outline" className="text-xs">
                                <Car className="h-3 w-3 mr-1" />
                                {log.vehicle.name}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>{format(parseISO(log.date), 'MMM d, yyyy')}</div>
                              {log.notes && <div>{log.notes}</div>}
                              {log.odometerKm && (
                                <div>{log.odometerKm.toLocaleString()} km</div>
                              )}
                            </div>
                          </div>
                          {log.costCents > 0 && (
                            <div className="text-right">
                              <div className="font-semibold">{formatCurrency(log.costCents)}</div>
                              <div className="text-xs text-muted-foreground">Cost</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Upcoming Detail */}
        <Dialog open={openDetailView === "upcoming"} onOpenChange={(open) => !open && setOpenDetailView(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Upcoming Events ({upcoming?.length || 0})
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-3">
                {!upcoming || upcoming.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No upcoming trackdays
                  </p>
                ) : (
                  upcoming.map((trackday) => (
                    <Link key={trackday.id} href={`/trackdays/${trackday.id}`}>
                      <div className="border rounded-lg p-4 hover-elevate active-elevate-2 cursor-pointer" data-testid={`upcoming-detail-${trackday.id}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{trackday.track.name}</h3>
                              <StatusBadge status={trackday.participationStatus} type="participation" />
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {formatDateRange(trackday.startDate, trackday.endDate)}
                                {trackday.durationDays > 1 && ` (${trackday.durationDays} days)`}
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {trackday.track.country}
                              </div>
                              {trackday.track.organizerName && (
                                <div className="text-xs">
                                  Organized by {trackday.track.organizerName}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Budget Progress */}
        {budgetLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ) : budget ? (
          <BudgetProgress
            projected={budget.projectedCents}
            spent={budget.spentCents}
            remaining={budget.remainingCents}
            annual={budget.annualBudgetCents}
          />
        ) : null}

        {/* Trackday Calendar */}
        <TrackdayCalendar 
          trackdays={allTrackdays} 
          isLoading={trackdaysLoading} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Chart */}
          <div className="lg:col-span-2">
            {monthlyLoading ? (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-80 w-full" />
                </CardContent>
              </Card>
            ) : monthlyData && monthlyData.length > 0 ? (
              <MonthlyChart data={monthlyData} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Spending</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-12">
                    No spending data yet
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Upcoming Trackdays */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Trackdays</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingLoading ? (
                  <>
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </>
                ) : upcoming && upcoming.length > 0 ? (
                  upcoming.slice(0, 3).map((trackday) => (
                    <Link
                      key={trackday.id}
                      href={`/trackdays/${trackday.id}`}
                    >
                      <div className="flex gap-3 p-3 rounded-lg hover-elevate active-elevate-2 border cursor-pointer" data-testid={`card-upcoming-trackday-${trackday.id}`}>
                        <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-md p-2 min-w-[3rem]">
                          <div className="text-sm font-mono font-semibold">
                            {format(parseISO(trackday.startDate), "MMM")}
                          </div>
                          <div className="text-xl font-mono font-bold">
                            {format(parseISO(trackday.startDate), "dd")}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {trackday.track.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDateRange(trackday.startDate, trackday.endDate)} • {trackday.track.country}
                          </div>
                          <div className="mt-1">
                            <StatusBadge
                              status={trackday.participationStatus}
                              type="participation"
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8 text-sm">
                    No upcoming trackdays
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
