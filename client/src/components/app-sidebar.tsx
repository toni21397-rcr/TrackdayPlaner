import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Car,
  Map,
  Settings as SettingsIcon,
  ShoppingCart,
  Building2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Trackdays",
    url: "/trackdays",
    icon: Calendar,
  },
  {
    title: "Booking",
    url: "/booking",
    icon: ShoppingCart,
  },
  {
    title: "Tracks",
    url: "/tracks",
    icon: MapPin,
  },
  {
    title: "Organizers",
    url: "/organizers",
    icon: Building2,
  },
  {
    title: "Vehicles",
    url: "/vehicles",
    icon: Car,
  },
  {
    title: "Map",
    url: "/map",
    icon: Map,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: SettingsIcon,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Trackday Planner</h2>
            <p className="text-xs text-muted-foreground">Plan & Track</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
