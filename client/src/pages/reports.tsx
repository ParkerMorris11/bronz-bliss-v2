import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  UserX,
  RefreshCcw,
  CalendarDays,
  TrendingUp,
  Users,
  AlertTriangle,
  Trophy,
  Send,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

// ─── Date helpers ────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toISODate(d);
}

function defaultEnd(): string {
  return toISODate(new Date());
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysSince(dateStr: string): number {
  if (!dateStr) return Infinity;
  const then = new Date(dateStr + "T00:00:00").getTime();
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RevenueDataPoint {
  date: string;
  total: number;
}

interface NoShowRate {
  total: number;
  noShows: number;
}

interface RebookingRate {
  total: number;
  rebooked: number;
}

interface PopularService {
  serviceId: number | string;
  name: string;
  count: number;
}

interface CLVClient {
  clientId: number | string;
  name: string;
  totalSpent: number;
  visits: number;
  firstVisit: string;
  lastVisit: string;
  phone?: string;
}

// ─── Chart colors ─────────────────────────────────────────────────────────────

const PRIMARY_COLOR = "hsl(32, 80%, 48%)";
const SECONDARY_COLOR = "hsl(170, 50%, 40%)";

// ─── Medal helpers ─────────────────────────────────────────────────────────────

const MEDAL_STYLES: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Gold",   color: "#B8860B", bg: "rgba(255, 215, 0, 0.15)" },
  2: { label: "Silver", color: "#888",    bg: "rgba(192,192,192,0.15)" },
  3: { label: "Bronze", color: "#A0522D", bg: "rgba(205,127,50,0.15)" },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  testId: string;
  loading?: boolean;
  highlight?: boolean;
}

function KpiCard({ label, value, icon, testId, loading, highlight }: KpiCardProps) {
  return (
    <Card
      data-testid={`card-${testId}`}
      className={highlight ? "border-primary/40 bg-primary/5" : ""}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-6 w-20 mt-1" data-testid={`skeleton-${testId}`} />
            ) : (
              <p className="text-lg font-bold" data-testid={`value-${testId}`}>
                {value}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
  prefix?: string;
}

function CustomTooltip({ active, payload, label, prefix = "" }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          {prefix}
          {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  const queryParams = `start=${startDate}&end=${endDate}`;

  // Revenue data
  const {
    data: revenueData,
    isLoading: revenueLoading,
    isError: revenueError,
  } = useQuery<RevenueDataPoint[]>({
    queryKey: ["/api/reports/revenue", startDate, endDate],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports/revenue?${queryParams}`);
      return res.json();
    },
    enabled: !!startDate && !!endDate,
  });

  // No-show rate data
  const {
    data: noShowData,
    isLoading: noShowLoading,
    isError: noShowError,
  } = useQuery<NoShowRate>({
    queryKey: ["/api/reports/no-show-rate", startDate, endDate],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports/no-show-rate?${queryParams}`);
      return res.json();
    },
    enabled: !!startDate && !!endDate,
  });

  // Rebooking rate data
  const {
    data: rebookingData,
    isLoading: rebookingLoading,
    isError: rebookingError,
  } = useQuery<RebookingRate>({
    queryKey: ["/api/reports/rebooking-rate", startDate, endDate],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports/rebooking-rate?${queryParams}`);
      return res.json();
    },
    enabled: !!startDate && !!endDate,
  });

  // Popular services data
  const {
    data: servicesData,
    isLoading: servicesLoading,
    isError: servicesError,
  } = useQuery<PopularService[]>({
    queryKey: ["/api/reports/popular-services", startDate, endDate],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports/popular-services?${queryParams}`);
      return res.json();
    },
    enabled: !!startDate && !!endDate,
  });

  // CLV data
  const {
    data: clvData,
    isLoading: clvLoading,
    isError: clvError,
  } = useQuery<CLVClient[]>({
    queryKey: ["/api/analytics/clv"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/clv");
      return res.json();
    },
  });

  // ── Send rebooking SMS mutation ──
  const rebookMutation = useMutation({
    mutationFn: async (client: CLVClient) => {
      await apiRequest("POST", "/api/sms/send", {
        clientId: client.clientId,
        type: "rebooking",
        to: client.phone ?? "",
        body: `Hi ${client.name.split(" ")[0]}! We miss you at Bronz Bliss. Book your next session and glow again — use this link to schedule: https://bronzbliss.com/book`,
      });
    },
    onSuccess: (_, client) => {
      toast({
        title: "Rebooking message sent",
        description: `A rebooking SMS was queued for ${client.name}.`,
      });
    },
    onError: (_, client) => {
      toast({
        title: "Message failed",
        description: `Could not send SMS to ${client.name}. Please try again.`,
        variant: "destructive",
      });
    },
  });

  // ── Derived KPI values ──

  const totalRevenue =
    revenueData && revenueData.length > 0
      ? revenueData.reduce((sum, d) => sum + (d.total ?? 0), 0)
      : 0;

  const noShowRate =
    noShowData && noShowData.total > 0
      ? ((noShowData.noShows / noShowData.total) * 100).toFixed(1)
      : "0.0";

  const rebookingRate =
    rebookingData && rebookingData.total > 0
      ? ((rebookingData.rebooked / rebookingData.total) * 100).toFixed(1)
      : "0.0";

  const totalAppointments = noShowData?.total ?? 0;

  const kpiLoading = revenueLoading || noShowLoading || rebookingLoading;

  // ── Revenue forecast ──
  const forecastedRevenue: number | null = (() => {
    if (!revenueData || revenueData.length === 0) return null;
    const start = new Date(startDate + "T00:00:00").getTime();
    const end = new Date(endDate + "T00:00:00").getTime();
    const rangeDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    const avgDaily = totalRevenue / rangeDays;
    return avgDaily * 30;
  })();

  // ── Churn classification ──
  const atRiskClients = clvData
    ? clvData.filter((c) => {
        const d = daysSince(c.lastVisit);
        return d >= 30 && d < 60;
      })
    : [];

  const churnedClients = clvData
    ? clvData.filter((c) => daysSince(c.lastVisit) >= 60)
    : [];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
        >
          Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Analyze performance over a custom date range.
        </p>
      </div>

      {/* Date range picker */}
      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="start-date" className="text-xs text-muted-foreground">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                className="w-40"
                data-testid="input-start-date"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end-date" className="text-xs text-muted-foreground">
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={toISODate(new Date())}
                className="w-40"
                data-testid="input-end-date"
              />
            </div>
            <p className="text-xs text-muted-foreground pb-2">
              Showing data from{" "}
              <span className="font-medium text-foreground">{startDate}</span> to{" "}
              <span className="font-medium text-foreground">{endDate}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={
            revenueLoading
              ? "—"
              : revenueError
              ? "Error"
              : `$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          }
          icon={<DollarSign className="w-5 h-5 text-primary" />}
          testId="total-revenue"
          loading={revenueLoading}
        />
        <KpiCard
          label="No-Show Rate"
          value={
            noShowLoading
              ? "—"
              : noShowError
              ? "Error"
              : `${noShowRate}%`
          }
          icon={<UserX className="w-5 h-5 text-primary" />}
          testId="no-show-rate"
          loading={noShowLoading}
        />
        <KpiCard
          label="Rebooking Rate"
          value={
            rebookingLoading
              ? "—"
              : rebookingError
              ? "Error"
              : `${rebookingRate}%`
          }
          icon={<RefreshCcw className="w-5 h-5 text-primary" />}
          testId="rebooking-rate"
          loading={rebookingLoading}
        />
        <KpiCard
          label="Total Appointments"
          value={
            noShowLoading
              ? "—"
              : noShowError
              ? "Error"
              : totalAppointments.toLocaleString()
          }
          icon={<CalendarDays className="w-5 h-5 text-primary" />}
          testId="total-appointments"
          loading={noShowLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="w-4 h-4 text-primary" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {revenueLoading ? (
              <div className="flex flex-col gap-2 mt-2" data-testid="skeleton-revenue-chart">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : revenueError ? (
              <div
                className="flex items-center justify-center h-48 text-sm text-muted-foreground"
                data-testid="error-revenue-chart"
              >
                Failed to load revenue data.
              </div>
            ) : !revenueData || revenueData.length === 0 ? (
              <div
                className="flex items-center justify-center h-48 text-sm text-muted-foreground"
                data-testid="empty-revenue-chart"
              >
                No revenue data for this period.
              </div>
            ) : (
              <div data-testid="chart-revenue">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={revenueData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v: string) => {
                        const d = new Date(v + "T00:00:00");
                        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                      width={64}
                    />
                    <Tooltip
                      content={
                        <CustomTooltip
                          prefix="$"
                        />
                      }
                      formatter={(value: number) => [
                        `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        "Revenue",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke={PRIMARY_COLOR}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: PRIMARY_COLOR }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Services Chart */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarDays className="w-4 h-4 text-primary" />
              Popular Services
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {servicesLoading ? (
              <div className="flex flex-col gap-2 mt-2" data-testid="skeleton-services-chart">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : servicesError ? (
              <div
                className="flex items-center justify-center h-48 text-sm text-muted-foreground"
                data-testid="error-services-chart"
              >
                Failed to load services data.
              </div>
            ) : !servicesData || servicesData.length === 0 ? (
              <div
                className="flex items-center justify-center h-48 text-sm text-muted-foreground"
                data-testid="empty-services-chart"
              >
                No service data for this period.
              </div>
            ) : (
              <div data-testid="chart-services">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={servicesData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      width={110}
                    />
                    <Tooltip
                      formatter={(value: number) => [value.toLocaleString(), "Bookings"]}
                      cursor={{ fill: "hsl(var(--accent) / 0.1)" }}
                    />
                    <Bar
                      dataKey="count"
                      fill={SECONDARY_COLOR}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════
          NEW SECTIONS — Analytics V2
          ═══════════════════════════════════════════════════════ */}

      {/* Revenue Forecast KPI */}
      <div>
        <h2
          className="text-base font-semibold mb-3"
          style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
        >
          Forecast
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Projected 30-Day Revenue"
            value={
              revenueLoading
                ? "—"
                : forecastedRevenue === null
                ? "No data"
                : `$${forecastedRevenue.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
            }
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
            testId="forecast-30-day"
            loading={revenueLoading}
            highlight
          />
        </div>
        {!revenueLoading && forecastedRevenue !== null && (
          <p className="text-xs text-muted-foreground mt-2" data-testid="text-forecast-note">
            Based on avg. daily revenue across the selected{" "}
            <span className="font-medium text-foreground">{startDate} – {endDate}</span> range.
          </p>
        )}
      </div>

      {/* Client Lifetime Value Table */}
      <Card className="rounded-2xl" data-testid="card-clv-table">
        <CardHeader className="pb-2">
          <CardTitle
            className="flex items-center gap-2 text-base font-semibold"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            <Trophy className="w-4 h-4 text-primary" />
            Client Lifetime Value
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {clvLoading ? (
            <div className="flex flex-col gap-3 mt-2" data-testid="skeleton-clv-table">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : clvError ? (
            <div
              className="flex items-center justify-center h-32 text-sm text-muted-foreground"
              data-testid="error-clv-table"
            >
              Failed to load lifetime value data.
            </div>
          ) : !clvData || clvData.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 h-32 text-sm text-muted-foreground"
              data-testid="empty-clv-table"
            >
              <Users className="w-8 h-8 opacity-30" />
              <span>No client data available yet.</span>
            </div>
          ) : (
            <div className="overflow-x-auto" data-testid="table-clv">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground w-12">Rank</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Client</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-right">Total Spent</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-right">Visits</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground hidden md:table-cell">First Visit</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Last Visit</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-right">Avg / Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {clvData.map((client, idx) => {
                    const rank = idx + 1;
                    const medal = MEDAL_STYLES[rank];
                    const avgPerVisit =
                      client.visits > 0
                        ? client.totalSpent / client.visits
                        : 0;

                    return (
                      <tr
                        key={String(client.clientId)}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        data-testid={`row-clv-${client.clientId}`}
                        style={medal ? { background: medal.bg } : undefined}
                      >
                        {/* Rank */}
                        <td className="py-2.5 px-3">
                          {medal ? (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                              style={{ color: medal.color, border: `1.5px solid ${medal.color}` }}
                              title={`${medal.label} — #${rank}`}
                              data-testid={`badge-medal-${rank}`}
                            >
                              {rank}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs pl-1">{rank}</span>
                          )}
                        </td>

                        {/* Client Name → link */}
                        <td className="py-2.5 px-3 font-medium">
                          <a
                            href={`/#/clients/${client.clientId}`}
                            className="hover:underline hover:text-primary transition-colors"
                            data-testid={`link-client-${client.clientId}`}
                          >
                            {client.name}
                          </a>
                        </td>

                        {/* Total Spent */}
                        <td className="py-2.5 px-3 text-right tabular-nums" data-testid={`text-spent-${client.clientId}`}>
                          ${client.totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Visits */}
                        <td className="py-2.5 px-3 text-right tabular-nums" data-testid={`text-visits-${client.clientId}`}>
                          {client.visits.toLocaleString()}
                        </td>

                        {/* First Visit */}
                        <td className="py-2.5 px-3 text-muted-foreground hidden md:table-cell" data-testid={`text-first-visit-${client.clientId}`}>
                          {formatDate(client.firstVisit)}
                        </td>

                        {/* Last Visit */}
                        <td className="py-2.5 px-3 text-muted-foreground hidden md:table-cell" data-testid={`text-last-visit-${client.clientId}`}>
                          {formatDate(client.lastVisit)}
                        </td>

                        {/* Avg per Visit */}
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground" data-testid={`text-avg-${client.clientId}`}>
                          ${avgPerVisit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Churn Risk Indicators */}
      <div data-testid="section-churn">
        <h2
          className="text-base font-semibold mb-3"
          style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
        >
          Churn Risk
        </h2>

        {/* Summary badges */}
        {clvLoading ? (
          <div className="flex gap-3 mb-4" data-testid="skeleton-churn-summary">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-7 w-36" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 mb-4" data-testid="churn-summary">
            <Badge
              variant="outline"
              className="gap-1.5 px-3 py-1 text-sm border-amber-400 text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40"
              data-testid="badge-at-risk-count"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {atRiskClients.length} client{atRiskClients.length !== 1 ? "s" : ""} at risk
            </Badge>
            <Badge
              variant="outline"
              className="gap-1.5 px-3 py-1 text-sm border-red-400 text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40"
              data-testid="badge-churned-count"
            >
              <UserX className="w-3.5 h-3.5" />
              {churnedClients.length} churned
            </Badge>
          </div>
        )}

        {/* At-Risk clients list */}
        {!clvLoading && atRiskClients.length === 0 && churnedClients.length === 0 ? (
          <Card className="rounded-2xl" data-testid="card-churn-empty">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Users className="w-8 h-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">All clients are active — no churn risk detected.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* At-Risk (30–59 days) */}
            {atRiskClients.length > 0 && (
              <Card className="rounded-2xl border-amber-300/50" data-testid="card-at-risk">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    At Risk — Last visit 30–59 days ago
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 flex flex-col gap-2">
                  {atRiskClients.map((client) => (
                    <div
                      key={String(client.clientId)}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-amber-50 dark:bg-amber-950/30"
                      data-testid={`row-at-risk-${client.clientId}`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <a
                          href={`/#/clients/${client.clientId}`}
                          className="font-medium text-sm hover:underline hover:text-primary transition-colors truncate"
                          data-testid={`link-at-risk-client-${client.clientId}`}
                        >
                          {client.name}
                        </a>
                        <span className="text-xs text-muted-foreground">
                          Last visit: {formatDate(client.lastVisit)}
                          {" · "}
                          {daysSince(client.lastVisit)} days ago
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-3 shrink-0 gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-600 dark:hover:bg-amber-950/50"
                        onClick={() => rebookMutation.mutate(client)}
                        disabled={rebookMutation.isPending}
                        data-testid={`button-rebook-${client.clientId}`}
                      >
                        <Send className="w-3 h-3" />
                        Send Rebooking
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Churned (60+ days) */}
            {churnedClients.length > 0 && (
              <Card className="rounded-2xl border-red-300/50" data-testid="card-churned">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                    <UserX className="w-4 h-4" />
                    Churned — Last visit 60+ days ago
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 flex flex-col gap-2">
                  {churnedClients.map((client) => (
                    <div
                      key={String(client.clientId)}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-red-50 dark:bg-red-950/30"
                      data-testid={`row-churned-${client.clientId}`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <a
                          href={`/#/clients/${client.clientId}`}
                          className="font-medium text-sm hover:underline hover:text-primary transition-colors truncate"
                          data-testid={`link-churned-client-${client.clientId}`}
                        >
                          {client.name}
                        </a>
                        <span className="text-xs text-muted-foreground">
                          Last visit: {formatDate(client.lastVisit)}
                          {" · "}
                          {daysSince(client.lastVisit)} days ago
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-3 shrink-0 gap-1.5 border-red-400 text-red-700 hover:bg-red-100 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-950/50"
                        onClick={() => rebookMutation.mutate(client)}
                        disabled={rebookMutation.isPending}
                        data-testid={`button-rebook-churned-${client.clientId}`}
                      >
                        <Send className="w-3 h-3" />
                        Send Rebooking
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
