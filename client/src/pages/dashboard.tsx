import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/kpi-card";
import { BudgetProgress } from "@/components/budget-progress";
import { MonthlyChart } from "@/components/monthly-chart";
import { TrackdayCalendar } from "@/components/trackday-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Wrench, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { StatusBadge } from "@/components/status-badge";
import type { DashboardStats, BudgetSummary, MonthlySpending, Trackday, Track } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateRange } from "@/lib/utils";

export default function Dashboard() {
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

  const formatCurrency = (cents: number) => {
    return `${(cents / 100).toFixed(0)} CHF`;
  };

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
              />
              <KpiCard
                title="Total Spent"
                value={formatCurrency(stats?.totalCostCents || 0)}
                subtitle="Including travel"
                icon={DollarSign}
              />
              <KpiCard
                title="Maintenance"
                value={formatCurrency(stats?.maintenanceCostCents || 0)}
                subtitle="This year"
                icon={Wrench}
              />
              <KpiCard
                title="Upcoming"
                value={stats?.upcomingEvents || 0}
                subtitle="Events planned"
                icon={TrendingUp}
              />
            </>
          )}
        </div>

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
                  upcoming.map((trackday) => (
                    <Link
                      key={trackday.id}
                      href={`/trackdays/${trackday.id}`}
                    >
                      <div className="flex gap-3 p-3 rounded-lg hover-elevate active-elevate-2 border cursor-pointer" data-testid={`card-upcoming-trackday-${trackday.id}`}>
                        <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-md p-2 min-w-[3rem]">
                          <div className="text-sm font-mono font-semibold">
                            {format(new Date(trackday.startDate), "MMM")}
                          </div>
                          <div className="text-xl font-mono font-bold">
                            {format(new Date(trackday.startDate), "dd")}
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
