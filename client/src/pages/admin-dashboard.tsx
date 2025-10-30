import { useQuery } from "@tanstack/react-query";
import { Users, Database, MapPin, Building2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminStats {
  totalUsers: number;
  adminUsers: number;
  totalTracks: number;
  systemTracks: number;
  userTracks: number;
  totalOrganizers: number;
  systemOrganizers: number;
  userOrganizers: number;
  totalTrackdays: number;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const kpiCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      subtitle: `${stats?.adminUsers || 0} admins`,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Tracks",
      value: stats?.totalTracks || 0,
      subtitle: `${stats?.systemTracks || 0} system, ${stats?.userTracks || 0} user`,
      icon: MapPin,
      color: "text-green-600",
    },
    {
      title: "Organizers",
      value: stats?.totalOrganizers || 0,
      subtitle: `${stats?.systemOrganizers || 0} system, ${stats?.userOrganizers || 0} user`,
      icon: Building2,
      color: "text-purple-600",
    },
    {
      title: "Total Trackdays",
      value: stats?.totalTrackdays || 0,
      subtitle: "All users combined",
      icon: Calendar,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System overview and management
          </p>
        </div>

        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.subtitle}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/admin/users"
              className="block p-3 rounded-md hover-elevate active-elevate-2"
              data-testid="link-admin-users"
            >
              <div className="font-medium">Manage Users</div>
              <div className="text-sm text-muted-foreground">
                View and manage user accounts and permissions
              </div>
            </a>
            <a
              href="/admin/tracks"
              className="block p-3 rounded-md hover-elevate active-elevate-2"
              data-testid="link-admin-tracks"
            >
              <div className="font-medium">Manage System Tracks</div>
              <div className="text-sm text-muted-foreground">
                View and manage the global track database
              </div>
            </a>
            <a
              href="/admin/organizers"
              className="block p-3 rounded-md hover-elevate active-elevate-2"
              data-testid="link-admin-organizers"
            >
              <div className="font-medium">Manage System Organizers</div>
              <div className="text-sm text-muted-foreground">
                View and manage the global organizer database
              </div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
