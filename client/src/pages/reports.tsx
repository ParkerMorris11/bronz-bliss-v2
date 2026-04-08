import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { DollarSign, UserX, RefreshCcw, CalendarDays, TrendingUp } from "lucide-react";
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

// ─── Chart colors ─────────────────────────────────────────────────────────────

const PRIMARY_COLOR = "hsl(32, 80%, 48%)";
const SECONDARY_COLOR = "hsl(170, 50%, 40%)";

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  testId: string;
  loading?: boolean;
}

function KpiCard({ label, value, icon, testId, loading }: KpiCardProps) {
  return (
    <Card data-testid={`card-${testId}`}>
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
      <Card>
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
        <Card>
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
        <Card>
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
    </div>
  );
}
