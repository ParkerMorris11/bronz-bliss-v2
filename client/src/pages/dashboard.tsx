import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, DollarSign, Package, Clock, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";

interface DashboardStats {
  todayAppointments: number;
  totalClients: number;
  monthRevenue: number;
  activePackages: number;
  recentAppointments: {
    id: number;
    clientId: number;
    serviceId: number;
    date: string;
    time: string;
    status: string;
    clientName: string;
    serviceName: string;
  }[];
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  checked_in: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  completed: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  cancelled: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  no_show: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-700",
};

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Dashboard
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Today", value: data?.todayAppointments ?? 0, sub: "appointments", icon: CalendarDays },
          { label: "Clients", value: data?.totalClients ?? 0, sub: "total", icon: Users },
          { label: "Revenue", value: `$${data?.monthRevenue?.toFixed(0) ?? 0}`, sub: "this month", icon: DollarSign },
          { label: "Active", value: data?.activePackages ?? 0, sub: "packages", icon: Package },
        ].map((kpi, i) => (
          <Card key={i} data-testid={`card-kpi-${i}`} className="relative overflow-hidden">
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold tabular-nums mt-0.5">{kpi.value}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/8">
                  <kpi.icon className="w-4.5 h-4.5 text-primary/60" />
                </div>
              </div>
            </CardContent>
            {/* Subtle gradient orb */}
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-primary/[0.04] blur-2xl" />
          </Card>
        ))}
      </div>

      {/* Recent Appointments */}
      <Card>
        <CardHeader className="pb-2 px-5 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Appointments</CardTitle>
            <Link href="/calendar" className="text-xs text-primary flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {data?.recentAppointments?.length === 0 && (
                <p className="p-6 text-sm text-center text-muted-foreground">No appointments yet</p>
              )}
              {data?.recentAppointments?.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-muted/30 transition-colors"
                  data-testid={`row-appointment-${appt.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-md bg-muted/60 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        <Link href={`/clients/${appt.clientId}`} className="hover:underline">
                          {appt.clientName}
                        </Link>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {appt.serviceName} &middot; {formatDateTime(appt.date, appt.time)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] font-medium px-2 py-0.5 ${statusColors[appt.status] || ""}`}
                    data-testid={`badge-status-${appt.id}`}
                  >
                    {appt.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
