import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import GlobalSearch from "@/components/global-search";
import Dashboard from "@/pages/dashboard";
import CalendarPage from "@/pages/calendar";
import ClientsPage from "@/pages/clients";
import ClientCardsPage from "@/pages/client-cards";
import ClientDetailPage from "@/pages/client-detail";
import ServicesPage from "@/pages/services";
import PackagesPage from "@/pages/packages";
import CheckInPage from "@/pages/check-in";
import IntakePage from "@/pages/intake";
import ReportsPage from "@/pages/reports";
import InventoryPage from "@/pages/inventory";
import SettingsPage from "@/pages/settings";
import BookingPage from "@/pages/booking";
import OnboardingPage from "@/pages/onboarding";
import LandingPage from "@/pages/landing";
import MessagesPage from "@/pages/messages";
import PromoCodesPage from "@/pages/promo-codes";
import GiftCardsPage from "@/pages/gift-cards";
import WaitlistPage from "@/pages/waitlist-page";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { useEffect, useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle">
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

function SeedOnMount() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      apiRequest("POST", "/api/seed").catch(() => {});
    }
  }, []);
  return null;
}

function AppShell() {
  const [location] = useHashLocation();
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if session is still valid on load
  useEffect(() => {
    apiRequest("GET", "/api/auth/check")
      .then(r => r.json())
      .then(data => { setAuthed(data.authenticated); setAuthChecked(true); })
      .catch(() => setAuthChecked(true));
  }, []);

  // Public routes — no login required
  const isBooking = location === "/book" || location.startsWith("/book/");
  const isOnboarding = location.startsWith("/onboard/");
  const isLanding = location === "/landing";
  if (isBooking) return <BookingPage />;
  if (isOnboarding) return <OnboardingPage />;
  if (isLanding) return <LandingPage />;

  // Wait for auth check before rendering anything
  if (!authChecked) return null;

  // Login gate for admin
  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />;
  }

  const sidebarStyle = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3.5rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border/50 shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <GlobalSearch />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto glass-bg">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/calendar" component={CalendarPage} />
              <Route path="/clients" component={ClientsPage} />
              <Route path="/clients/cards" component={ClientCardsPage} />
              <Route path="/clients/:id" component={ClientDetailPage} />
              <Route path="/services" component={ServicesPage} />
              <Route path="/packages" component={PackagesPage} />
              <Route path="/check-in/:id" component={CheckInPage} />
              <Route path="/intake" component={IntakePage} />
              <Route path="/reports" component={ReportsPage} />
              <Route path="/inventory" component={InventoryPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/messages" component={MessagesPage} />
              <Route path="/promo-codes" component={PromoCodesPage} />
              <Route path="/gift-cards" component={GiftCardsPage} />
              <Route path="/waitlist" component={WaitlistPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Router hook={useHashLocation}>
            <SeedOnMount />
            <AppShell />
          </Router>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
