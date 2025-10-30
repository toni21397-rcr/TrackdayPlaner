import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Shield, ShieldOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface UserWithStats {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  trackdayCount: number;
  lastActive: string;
}

export default function AdminUsers() {
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<UserWithStats[]>({
    queryKey: ["/api/admin/users"],
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/toggle-admin`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "Admin status has been changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : users && users.length > 0 ? (
          <div className="space-y-4">
            {users.map((user) => (
              <Card key={user.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.email}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                    {user.isAdmin && (
                      <Badge variant="default" className="gap-1">
                        <Shield className="w-3 h-3" />
                        Admin
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAdminMutation.mutate(user.id)}
                    disabled={toggleAdminMutation.isPending}
                    data-testid={`button-toggle-admin-${user.id}`}
                  >
                    {user.isAdmin ? (
                      <>
                        <ShieldOff className="w-4 h-4 mr-2" />
                        Remove Admin
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Make Admin
                      </>
                    )}
                  </Button>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Trackdays</div>
                    <div className="font-medium">{user.trackdayCount}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Joined</div>
                    <div className="font-medium">
                      {format(new Date(user.createdAt), "MMM dd, yyyy")}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Last Active</div>
                    <div className="font-medium">
                      {format(new Date(user.lastActive), "MMM dd, yyyy")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center p-12">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  The system has no registered users yet.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
