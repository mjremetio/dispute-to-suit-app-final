import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  FileText,
  MessageSquare,
  Clock,
  Briefcase,
  Settings,
  HelpCircle,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { NotificationBell } from "./NotificationBell";
import { TourOverlay, type TourStep } from "./TourOverlay";
import { trpc } from "@/lib/trpc";

const clientMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/client-portal", tourId: "client-nav-dashboard" },
  { icon: Briefcase, label: "My Cases", path: "/client-portal/cases", tourId: "client-nav-cases" },
  { icon: FileText, label: "Documents", path: "/client-portal/documents", tourId: "client-nav-documents" },
  { icon: MessageSquare, label: "Comments", path: "/client-portal/comments", tourId: "client-nav-comments" },
  { icon: Clock, label: "Activity Log", path: "/client-portal/timeline", tourId: "client-nav-timeline" },
  { icon: Settings, label: "Account Settings", path: "/client-portal/settings", tourId: "client-nav-settings" },
];

const CLIENT_TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Your Client Portal! 🎉",
    description: "We're so glad you're here! This quick tour will show you how to track your case, view documents, and stay connected with your legal team.",
    emoji: "🌟",
    placement: "center",
  },
  {
    target: "[data-tour='client-nav-dashboard']",
    title: "Your Dashboard",
    description: "Your personal home page. See a summary of your active cases, recent activity, and important updates from your legal team at a glance.",
    emoji: "🏠",
    placement: "right",
  },
  {
    target: "[data-tour='client-nav-cases']",
    title: "My Cases",
    description: "View all your active and past cases. Click any case to see its current status, assigned team, settlement amount, and full history.",
    emoji: "📁",
    placement: "right",
  },
  {
    target: "[data-tour='client-nav-documents']",
    title: "Documents",
    description: "Access all documents related to your cases — dispute letters, agreements, FCRA filings, and more. Download or preview them anytime.",
    emoji: "📄",
    placement: "right",
  },
  {
    target: "[data-tour='client-nav-comments']",
    title: "Comments",
    description: "Read messages and updates from your legal team. This is where your attorneys and paralegals will communicate important case notes with you.",
    emoji: "💬",
    placement: "right",
  },
  {
    target: "[data-tour='client-nav-timeline']",
    title: "Activity Log",
    description: "A full chronological timeline of everything that has happened on your cases — status changes, document uploads, team assignments, and more.",
    emoji: "🕐",
    placement: "right",
  },
  {
    target: "[data-tour='client-nav-settings']",
    title: "Account Settings",
    description: "Update your password and view your account information here. We recommend changing your password after your first login.",
    emoji: "⚙️",
    placement: "right",
  },
  {
    title: "You're Ready to Go! 🚀",
    description: "That's everything! Your legal team is working hard on your behalf. Check your dashboard regularly for updates, and don't hesitate to reach out.",
    emoji: "🎯",
    placement: "center",
  },
];

const SIDEBAR_WIDTH_KEY = "client-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved) : DEFAULT_WIDTH;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  const { user, loading } = useAuth();
  const [showTour, setShowTour] = useState(false);

  const { data: tourStatus } = trpc.system.getTourStatus.useQuery(undefined, {
    enabled: !!user,
  });
  const markTourSeen = trpc.system.markTourSeen.useMutation();

  // Auto-trigger on first login (when tourSeenClient is false)
  useEffect(() => {
    if (tourStatus && !tourStatus.tourSeenClient) {
      const t = setTimeout(() => setShowTour(true), 600);
      return () => clearTimeout(t);
    }
  }, [tourStatus]);

  const handleTourFinish = () => {
    setShowTour(false);
    markTourSeen.mutate({ portal: "client" });
  };

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Please sign in to continue</p>
          <Button onClick={() => (window.location.href = "/login")}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (user.mustChangePassword) {
    window.location.href = "/change-password";
    return null;
  }

  return (
    <>
      <SidebarProvider
        style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
      >
        <ClientLayoutContent
          setSidebarWidth={setSidebarWidth}
          onStartTour={() => setShowTour(true)}
        />
        <SidebarInset>
          <header className="h-16 flex items-center gap-2 px-4 border-b">
            <SidebarTrigger className="md:hidden" />
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                Client Portal
              </span>
            </div>
            <NotificationBell />
          </header>
          <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>

      {showTour && (
        <TourOverlay
          steps={CLIENT_TOUR_STEPS}
          onFinish={handleTourFinish}
          onSkip={handleTourFinish}
        />
      )}
    </>
  );
}

function ClientLayoutContent({
  setSidebarWidth,
  onStartTour,
}: {
  setSidebarWidth: (width: number) => void;
  onStartTour: () => void;
}) {
  const auth = useAuth();
  const user = auth.user;
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <span className="font-semibold tracking-tight truncate">Dispute2Suit</span>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {clientMenuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                      data-tour={item.tourId}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 space-y-2">
            {/* Help / Tour button */}
            <SidebarMenuButton
              onClick={onStartTour}
              tooltip="Take a tour"
              className="h-9 transition-all font-normal text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
              data-tour="client-help-btn"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Help &amp; Tour</span>
            </SidebarMenuButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                      {user?.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase() || "C"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user?.name || "Client"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    auth.logout().then(() => setLocation("/login"));
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {!isCollapsed && !isMobile && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-50 hover:bg-primary/20 active:bg-primary/30 transition-colors"
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>
    </>
  );
}
