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
import Dashboard from "@/pages/dashboard";
import CalendarPage from "@/pages/calendar";
import ClientsPage from "@/pages/clients";
import ClientDetailPage from "@/pages/client-detail";
import ServicesPage from "@/pages/services";
import PackagesPage from "@/pages/packages";
import CheckInPage from "@/pages/check-in";
import IntakePage from "@/pages/intake";
import ReportsPage from "@/pages/reports";
import InventoryPage from "@/pages/inventory";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle">
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/clients/:id" component={ClientDetailPage} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/packages" component={PackagesPage} />
      <Route path="/check-in/:id" component={CheckInPage} />
      <Route path="/intake" component={IntakePage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SeedOnMount() {
  useEffect(() => {
    apiRequest("POST", "/api/seed").catch(() => {});
  }, []);
  return null;
}

export default function App() {
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full overflow-hidden">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between gap-1 px-4 py-2 border-b shrink-0">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-y-auto">
                  <Router hook={useHashLocation}>
                    <SeedOnMount />
                    <AppRouter />
                  </Router>
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
