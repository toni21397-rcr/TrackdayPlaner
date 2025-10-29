import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

export function UserMenu() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }

  if (!isAuthenticated) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.location.href = "/api/login"}
        data-testid="button-login"
      >
        <LogIn className="w-4 h-4 mr-2" />
        Login
      </Button>
    );
  }

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  const userName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          data-testid="button-user-menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profileImageUrl || undefined} alt={userName} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none" data-testid="text-user-name">
              {userName}
            </p>
            <p className="text-xs leading-none text-muted-foreground" data-testid="text-user-email">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => window.location.href = "/api/logout"}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
