import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle,
  Car,
  ListChecks,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Filter
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";
import type { MaintenanceTask } from "@shared/schema";

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
    overdue: number;
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

interface EnrichedTask extends MaintenanceTask {
  vehicle: {
    id: string;
    name: string;
  };
  planName: string;
  checklistItemTitle: string;
  maintenanceType: string | null;
  isCritical: boolean;
  effectiveStatus: string;
  isOverdue: boolean;
}

const STATUS_COLORS = {
  pending: 'hsl(var(--muted))',
  due: 'hsl(var(--warning))',
  overdue: 'hsl(var(--destructive))',
  snoozed: 'hsl(var(--info))',
  completed: 'hsl(var(--success))',
  dismissed: 'hsl(var(--destructive))',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  due: 'Due',
  overdue: 'Overdue',
  snoozed: 'Snoozed',
  completed: 'Completed',
  dismissed: 'Dismissed',
};

type SortField = 'dueAt' | 'status' | 'vehicle' | 'plan' | 'task';
type SortDirection = 'asc' | 'desc';

export default function MaintenanceAnalytics() {
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('dueAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: analytics, isLoading: analyticsLoading, isError, error } = useQuery<AnalyticsData>({
    queryKey: ['/api/maintenance/analytics'],
  });

  const { data: enrichedTasks = [], isLoading: tasksLoading } = useQuery<EnrichedTask[]>({
    queryKey: ['/api/maintenance/analytics/tasks'],
  });

  const isLoading = analyticsLoading || tasksLoading;

  const filteredTasks = useMemo(() => {
    let filtered = [...enrichedTasks];

    if (statusFilter) {
      filtered = filtered.filter(task => task.effectiveStatus === statusFilter);
    }

    if (vehicleFilter) {
      filtered = filtered.filter(task => task.vehicle.id === vehicleFilter);
    }

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'dueAt':
          aVal = a.dueAt ? new Date(a.dueAt).getTime() : 0;
          bVal = b.dueAt ? new Date(b.dueAt).getTime() : 0;
          break;
        case 'status':
          aVal = a.effectiveStatus;
          bVal = b.effectiveStatus;
          break;
        case 'vehicle':
          aVal = a.vehicle.name;
          bVal = b.vehicle.name;
          break;
        case 'plan':
          aVal = a.planName;
          bVal = b.planName;
          break;
        case 'task':
          aVal = a.checklistItemTitle;
          bVal = b.checklistItemTitle;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  }, [enrichedTasks, statusFilter, vehicleFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleStatusClick = (status: string) => {
    setStatusFilter(statusFilter === status ? null : status);
    setTasksExpanded(true);
  };

  const handleVehicleClick = (vehicleId: string) => {
    setVehicleFilter(vehicleFilter === vehicleId ? null : vehicleId);
    setTasksExpanded(true);
  };

  const clearFilters = () => {
    setStatusFilter(null);
    setVehicleFilter(null);
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'overdue':
      case 'dismissed':
        return 'destructive';
      case 'due':
        return 'secondary';
      default:
        return 'outline';
    }
  };

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
    { name: 'Pending', value: analytics.tasksByStatus.pending, fill: STATUS_COLORS.pending, status: 'pending' },
    { name: 'Due', value: analytics.tasksByStatus.due, fill: STATUS_COLORS.due, status: 'due' },
    { name: 'Overdue', value: analytics.tasksByStatus.overdue, fill: STATUS_COLORS.overdue, status: 'overdue' },
    { name: 'Snoozed', value: analytics.tasksByStatus.snoozed, fill: STATUS_COLORS.snoozed, status: 'snoozed' },
    { name: 'Completed', value: analytics.tasksByStatus.completed, fill: STATUS_COLORS.completed, status: 'completed' },
    { name: 'Dismissed', value: analytics.tasksByStatus.dismissed, fill: STATUS_COLORS.dismissed, status: 'dismissed' },
  ].filter(item => item.value > 0);

  const vehicleChartData = analytics.tasksByVehicle.map(v => ({
    name: v.vehicleName,
    total: v.totalTasks,
    completed: v.completedTasks,
    overdue: v.overdueTasks,
    vehicleId: v.vehicleId,
  }));

  const hasActiveFilters = statusFilter !== null || vehicleFilter !== null;

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
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
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
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
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
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
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
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
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
              <CardDescription>Click a segment to filter tasks below</CardDescription>
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
                      onClick={(data) => handleStatusClick(data.status)}
                      cursor="pointer"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.fill}
                          opacity={statusFilter && statusFilter !== entry.status ? 0.3 : 1}
                        />
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
              <CardDescription>Click a bar to filter tasks below</CardDescription>
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
                    <Bar 
                      dataKey="total" 
                      fill="hsl(var(--primary))" 
                      name="Total"
                      onClick={(entry: any) => handleVehicleClick(entry.vehicleId)}
                      cursor="pointer"
                    />
                    <Bar 
                      dataKey="completed" 
                      fill="hsl(var(--success))" 
                      name="Completed"
                      onClick={(entry: any) => handleVehicleClick(entry.vehicleId)}
                      cursor="pointer"
                    />
                    <Bar 
                      dataKey="overdue" 
                      fill="hsl(var(--destructive))" 
                      name="Overdue"
                      onClick={(entry: any) => handleVehicleClick(entry.vehicleId)}
                      cursor="pointer"
                    />
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

        {/* Detailed Task Table */}
        <Collapsible open={tasksExpanded} onOpenChange={setTasksExpanded}>
          <Card data-testid="card-task-table">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="w-5 h-5" />
                    Task Details
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-2">
                        <Filter className="w-3 h-3 mr-1" />
                        Filtered
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
                    {hasActiveFilters && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearFilters}
                        className="ml-2 h-auto p-0 text-xs"
                        data-testid="button-clear-filters"
                      >
                        Clear filters
                      </Button>
                    )}
                  </CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-toggle-task-table">
                    {tasksExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                {filteredTasks.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('status')}
                              className="hover-elevate"
                              data-testid="button-sort-status"
                            >
                              Status
                              <ArrowUpDown className="ml-2 w-3 h-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('vehicle')}
                              className="hover-elevate"
                              data-testid="button-sort-vehicle"
                            >
                              Vehicle
                              <ArrowUpDown className="ml-2 w-3 h-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('plan')}
                              className="hover-elevate"
                              data-testid="button-sort-plan"
                            >
                              Plan
                              <ArrowUpDown className="ml-2 w-3 h-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('task')}
                              className="hover-elevate"
                              data-testid="button-sort-task"
                            >
                              Task
                              <ArrowUpDown className="ml-2 w-3 h-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('dueAt')}
                              className="hover-elevate"
                              data-testid="button-sort-due-date"
                            >
                              Due Date
                              <ArrowUpDown className="ml-2 w-3 h-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">Critical</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTasks.map((task) => {
                          return (
                            <TableRow 
                              key={task.id} 
                              className="hover-elevate cursor-pointer"
                              data-testid={`row-task-${task.id}`}
                            >
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(task.effectiveStatus)} data-testid={`badge-status-${task.id}`}>
                                  {STATUS_LABELS[task.effectiveStatus] || task.effectiveStatus}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium" data-testid={`text-vehicle-${task.id}`}>
                                {task.vehicle.name}
                              </TableCell>
                              <TableCell className="text-muted-foreground" data-testid={`text-plan-${task.id}`}>
                                {task.planName}
                              </TableCell>
                              <TableCell data-testid={`text-task-${task.id}`}>
                                {task.checklistItemTitle}
                                {task.maintenanceType && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {task.maintenanceType}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell data-testid={`text-due-date-${task.id}`}>
                                {task.dueAt ? (
                                  <span className={task.isOverdue ? 'text-destructive font-medium' : ''}>
                                    {format(new Date(task.dueAt), 'MMM d, yyyy')}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">No due date</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {task.isCritical && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Critical
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ListChecks className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-lg font-medium">No tasks match the current filters</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try adjusting your filters or clearing them to see all tasks
                    </p>
                    {hasActiveFilters && (
                      <Button 
                        variant="outline" 
                        onClick={clearFilters}
                        className="mt-4"
                        data-testid="button-clear-filters-empty"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

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
                  <Card 
                    key={vehicle.vehicleId} 
                    data-testid={`card-vehicle-${vehicle.vehicleId}`}
                    className={`hover-elevate cursor-pointer ${vehicleFilter === vehicle.vehicleId ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleVehicleClick(vehicle.vehicleId)}
                  >
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
