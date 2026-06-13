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
import { LayoutDashboard, LogOut, PanelLeft, Users, FileText, FilePlus, ClipboardList, HelpCircle } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { NotificationBell } from "./NotificationBell";
import { TourOverlay, type TourStep } from "./TourOverlay";
import { trpc } from "@/lib/trpc";

const croMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/cro-portal", tourId: "cro-nav-dashboard" },
  { icon: Users, label: "My Clients", path: "/cro-portal/clients", tourId: "cro-nav-clients" },
  { icon: FileText, label: "My Cases", path: "/cro-portal/cases", tourId: "cro-nav-cases" },
  { icon: FilePlus, label: "File Intake Inquiry", path: "/cro-portal/intake", tourId: "cro-nav-intake" },
  { icon: ClipboardList, label: "My Inquiries", path: "/cro-portal/inquiries", tourId: "cro-nav-inquiries" },
];

const CRO_TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to the CRO Portal! 🎉",
    description: "This quick tour will walk you through everything you need to know to get started. You can replay it anytime by clicking the Help (?) button in the sidebar.",
    emoji: "🚀",
    placement: "center",
  },
  {
    target: "[data-tour='cro-nav-dashboard']",
    title: "Your Dashboard",
    description: "Your home base. See an overview of your active clients, open cases, and recent intake inquiries all in one place.",
    emoji: "📊",
    placement: "right",
  },
  {
    target: "[data-tour='cro-nav-clients']",
    title: "My Clients",
    description: "View and manage all the clients you've enrolled. You can see their contact details, linked cases, and portal account status here.",
    emoji: "👥",
    placement: "right",
  },
  {
    target: "[data-tour='cro-nav-cases']",
    title: "My Cases",
    description: "Track every case you're responsible for — from intake all the way to settlement. Click any case to view documents, tasks, and comments.",
    emoji: "📁",
    placement: "right",
  },
  {
    target: "[data-tour='cro-nav-intake']",
    title: "File Intake Inquiry",
    description: "Submit a new client inquiry here. Fill in the client's information and credit dispute details to kick off the review process.",
    emoji: "📝",
    placement: "right",
  },
  {
    target: "[data-tour='cro-nav-inquiries']",
    title: "My Inquiries",
    description: "Review all intake inquiries you've submitted. Track their status — pending, accepted, or rejected — and notify clients once accepted.",
    emoji: "📋",
    placement: "right",
  },
  {
    title: "You're All Set! 🌟",
    description: "That's the full CRO Portal tour. Start by filing an intake inquiry for your first client, or check your dashboard for pending items. Good luck!",
    emoji: "🎯",
    placement: "center",
  },
];

const SIDEBAR_WIDTH_KEY = "cro-sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function CROLayout({
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

  // Auto-trigger on first login (when tourSeenCro is false)
  useEffect(() => {
    if (tourStatus && !tourStatus.tourSeenCro) {
      // Small delay so the layout renders first
      const t = setTimeout(() => setShowTour(true), 600);
      return () => clearTimeout(t);
    }
  }, [tourStatus]);

  const handleTourFinish = () => {
    setShowTour(false);
    markTourSeen.mutate({ portal: "cro" });
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
        style={
          {
            "--sidebar-width": `${sidebarWidth}px`,
          } as CSSProperties
        }
      >
        <CROLayoutContent
          setSidebarWidth={setSidebarWidth}
          onStartTour={() => setShowTour(true)}
        />
        <SidebarInset>
          <header className="h-16 flex items-center justify-between gap-2 px-4 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" />
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">CRO Portal</span>
            </div>
            <NotificationBell />
          </header>
          <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>

      {showTour && (
        <TourOverlay
          steps={CRO_TOUR_STEPS}
          onFinish={handleTourFinish}
          onSkip={handleTourFinish}
        />
      )}
    </>
  );
}

function CROLayoutContent({
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
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
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
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">Dispute2Suit</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {croMenuItems.map(item => {
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
              data-tour="cro-help-btn"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Help &amp; Tour</span>
            </SidebarMenuButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                      {user?.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase() || "C"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user?.name || "CRO User"}</p>
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
