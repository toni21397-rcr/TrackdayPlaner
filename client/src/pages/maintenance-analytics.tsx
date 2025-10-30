import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle,
  Car,
  ListChecks,
  XCircle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  dismissedTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  completionRate: number;
  averageCompletionTimeDays: number;
  tasksByStatus: {
    pending: number;
    due: number;
    snoozed: number;
    completed: number;
    dismissed: number;
  };
  tasksByVehicle: Array<{
    vehicleId: string;
    vehicleName: string;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
  }>;
}

const STATUS_COLORS = {
  pending: 'hsl(var(--muted))',
  due: 'hsl(var(--warning))',
  snoozed: 'hsl(var(--info))',
  completed: 'hsl(var(--success))',
  dismissed: 'hsl(var(--destructive))',
};

export default function MaintenanceAnalytics() {
  const { data: analytics, isLoading, isError, error } = useQuery<AnalyticsData>({
    queryKey: ['/api/maintenance/analytics'],
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-semibold">Maintenance Analytics</h1>
            <p className="text-muted-foreground">Track your maintenance performance and metrics</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <div>
            <h1 className="text-3xl font-semibold">Maintenance Analytics</h1>
            <p className="text-muted-foreground">Track your maintenance performance and metrics</p>
          </div>
          <Card className="mt-6 border-destructive" data-testid="card-error">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Failed to Load Analytics</h2>
              <p className="text-muted-foreground text-center max-w-md">
                {error instanceof Error ? error.message : 'Unable to fetch analytics data. Please try refreshing the page or contact support if the issue persists.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <div>
            <h1 className="text-3xl font-semibold">Maintenance Analytics</h1>
            <p className="text-muted-foreground">Track your maintenance performance and metrics</p>
          </div>
          <Card className="mt-6" data-testid="card-empty-state">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Analytics Data</h2>
              <p className="text-muted-foreground text-center">
                Create some maintenance tasks to see analytics
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusChartData = [
    { name: 'Pending', value: analytics.tasksByStatus.pending, fill: STATUS_COLORS.pending },
    { name: 'Due', value: analytics.tasksByStatus.due, fill: STATUS_COLORS.due },
    { name: 'Snoozed', value: analytics.tasksByStatus.snoozed, fill: STATUS_COLORS.snoozed },
    { name: 'Completed', value: analytics.tasksByStatus.completed, fill: STATUS_COLORS.completed },
    { name: 'Dismissed', value: analytics.tasksByStatus.dismissed, fill: STATUS_COLORS.dismissed },
  ].filter(item => item.value > 0);

  const vehicleChartData = analytics.tasksByVehicle.map(v => ({
    name: v.vehicleName,
    total: v.totalTasks,
    completed: v.completedTasks,
    overdue: v.overdueTasks,
  }));

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-analytics-title">Maintenance Analytics</h1>
          <p className="text-muted-foreground">
            Track your maintenance performance and metrics
          </p>
        </div>

        {/* Alerts */}
        {(analytics.overdueTasks > 0 || analytics.dueSoonTasks > 0) && (
          <div className="space-y-3">
            {analytics.overdueTasks > 0 && (
              <Card className="border-destructive" data-testid="card-overdue-alert">
                <CardContent className="flex items-center gap-3 p-4">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <div>
                    <p className="font-medium">
                      {analytics.overdueTasks} {analytics.overdueTasks === 1 ? 'task is' : 'tasks are'} overdue
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Review and complete overdue maintenance tasks
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {analytics.dueSoonTasks > 0 && (
              <Card className="border-warning" data-testid="card-due-soon-alert">
                <CardContent className="flex items-center gap-3 p-4">
                  <Clock className="w-5 h-5 text-warning" />
                  <div>
                    <p className="font-medium">
                      {analytics.dueSoonTasks} {analytics.dueSoonTasks === 1 ? 'task is' : 'tasks are'} due within 7 days
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Plan ahead to stay on schedule
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-kpi-total">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <ListChecks className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono" data-testid="text-total-tasks">
                {analytics.totalTasks}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All maintenance tasks
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-kpi-completion-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono" data-testid="text-completion-rate">
                {analytics.completionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.completedTasks} of {analytics.totalTasks} completed
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-kpi-avg-time">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono" data-testid="text-avg-completion-time">
                {analytics.averageCompletionTimeDays.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                days to complete
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-kpi-overdue">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold font-mono ${analytics.overdueTasks > 0 ? 'text-destructive' : ''}`} data-testid="text-overdue-count">
                {analytics.overdueTasks}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                need immediate attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Tasks by Status */}
          <Card data-testid="card-chart-status">
            <CardHeader>
              <CardTitle>Tasks by Status</CardTitle>
              <CardDescription>Distribution of task statuses</CardDescription>
            </CardHeader>
            <CardContent>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No task data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks by Vehicle */}
          <Card data-testid="card-chart-vehicles">
            <CardHeader>
              <CardTitle>Tasks by Vehicle</CardTitle>
              <CardDescription>Maintenance tasks per vehicle</CardDescription>
            </CardHeader>
            <CardContent>
              {vehicleChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={vehicleChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" />
                    <Bar dataKey="completed" fill="hsl(var(--success))" name="Completed" />
                    <Bar dataKey="overdue" fill="hsl(var(--destructive))" name="Overdue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No vehicle data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vehicle Details Cards */}
        {analytics.tasksByVehicle.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Car className="w-5 h-5" />
              Vehicle Breakdown
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {analytics.tasksByVehicle.map((vehicle) => {
                const completionRate = vehicle.totalTasks > 0
                  ? (vehicle.completedTasks / vehicle.totalTasks) * 100
                  : 0;

                return (
                  <Card key={vehicle.vehicleId} data-testid={`card-vehicle-${vehicle.vehicleId}`}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Car className="w-4 h-4" />
                        {vehicle.vehicleName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total Tasks</span>
                          <span className="font-mono font-medium">{vehicle.totalTasks}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                          <span className="font-mono font-medium">{vehicle.completedTasks}</span>
                        </div>
                        {vehicle.overdueTasks > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-destructive flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Overdue
                            </span>
                            <span className="font-mono font-medium text-destructive">{vehicle.overdueTasks}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Completion</span>
                          <span className="font-mono font-medium">{completionRate.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-success h-2 rounded-full transition-all"
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
