import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import Dashboard from "@/pages/dashboard";
import Trackdays from "@/pages/trackdays";
import TrackdayDetail from "@/pages/trackday-detail";
import Tracks from "@/pages/tracks";
import Vehicles from "@/pages/vehicles";
import MapPage from "@/pages/map";
import SettingsPage from "@/pages/settings";
import Booking from "@/pages/booking";
import BookingDetail from "@/pages/booking-detail";
import Organizers from "@/pages/organizers";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/trackdays" component={Trackdays} />
      <Route path="/trackdays/:id" component={TrackdayDetail} />
      <Route path="/tracks" component={Tracks} />
      <Route path="/organizers" component={Organizers} />
      <Route path="/vehicles" component={Vehicles} />
      <Route path="/booking" component={Booking} />
      <Route path="/booking/:trackId" component={BookingDetail} />
      <Route path="/map" component={MapPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between p-2 border-b shrink-0">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="flex items-center gap-2">
                    <UserMenu />
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
