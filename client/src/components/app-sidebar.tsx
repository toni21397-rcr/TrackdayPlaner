import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Car,
  Map,
  Settings as SettingsIcon,
  ShoppingCart,
  Building2,
  Shield,
  ChevronDown,
  ListChecks,
  ClipboardCheck,
  BarChart3,
  Wrench,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const mainMenuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Trackday Bookings",
    url: "/booking",
    icon: ShoppingCart,
  },
  {
    title: "My Trackdays",
    url: "/trackdays",
    icon: Calendar,
  },
  {
    title: "My Bike",
    url: "/vehicles",
    icon: Car,
  },
  {
    title: "My Map",
    url: "/map",
    icon: Map,
  },
];

const maintenanceMenuItems = [
  {
    title: "Plans",
    url: "/maintenance-plans",
    icon: ListChecks,
  },
  {
    title: "Tasks",
    url: "/maintenance-tasks",
    icon: ClipboardCheck,
  },
  {
    title: "Analytics",
    url: "/maintenance-analytics",
    icon: BarChart3,
  },
];

const optionsMenuItems = [
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
];

const adminMenuItems = [
  {
    title: "Admin Dashboard",
    url: "/admin",
    icon: Shield,
  },
  {
    title: "Manage Users",
    url: "/admin/users",
    icon: Shield,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;

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
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              <Collapsible asChild defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton data-testid="button-maintenance-toggle">
                      <Wrench className="w-4 h-4" />
                      <span>Maintenance</span>
                      <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180 w-4 h-4" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {maintenanceMenuItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={location === item.url}>
                            <Link href={item.url} data-testid={`link-maintenance-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                              <item.icon className="w-4 h-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              
              <Collapsible asChild defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton data-testid="button-options-toggle">
                      <SettingsIcon className="w-4 h-4" />
                      <span>Options</span>
                      <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180 w-4 h-4" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {optionsMenuItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={location === item.url}>
                            <Link href={item.url} data-testid={`link-options-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                              <item.icon className="w-4 h-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/settings"}>
                  <Link href="/settings" data-testid="link-nav-settings">
                    <SettingsIcon className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url} data-testid={`link-admin-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
