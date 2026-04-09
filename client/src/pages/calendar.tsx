import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, ChevronLeft, ChevronRight, User, Clock, DollarSign, FileText, CalendarDays, AlertTriangle, CheckCircle, MessageSquare, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { formatTime } from "@/lib/format";
import type { Appointment, Client, Service } from "@shared/schema";

// ── Helpers ──────────────────────────────────────────────

type ViewMode = "day" | "week" | "month";

const HOUR_HEIGHT = 56;
const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

function toIso(d: Date) { return d.toISOString().split("T")[0]; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function getWeekDates(anchor: Date): Date[] {
  const day = anchor.getDay();
  const mon = addDays(anchor, -((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

function getMonthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const start = addDays(first, -startDay);
  const weeks: Date[][] = [];
  let cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

const statusBg: Record<string, string> = {
  scheduled: "bg-blue-500/15 border-l-blue-500 hover:bg-blue-500/25",
  checked_in: "bg-amber-500/15 border-l-amber-500 hover:bg-amber-500/25",
  completed: "bg-emerald-500/15 border-l-emerald-500 hover:bg-emerald-500/25",
  cancelled: "bg-red-500/10 border-l-red-400 hover:bg-red-500/20 opacity-50",
  no_show: "bg-gray-500/10 border-l-gray-400 hover:bg-gray-500/20 opacity-60",
};

const statusBadge: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  checked_in: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  completed: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  cancelled: "bg-red-50 text-red-500 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  no_show: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-700",
};

// ── Component ────────────────────────────────────────────

export default function CalendarPage() {
  const today = toIso(new Date());
  const [view, setView] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(today);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const { toast } = useToast();

  // Date ranges for each view
  const dateRange = useMemo(() => {
    const anchor = new Date(selectedDate + "T12:00:00");
    if (view === "day") return { start: selectedDate, end: selectedDate };
    if (view === "week") {
      const wk = getWeekDates(anchor);
      return { start: toIso(wk[0]), end: toIso(wk[6]) };
    }
    const y = anchor.getFullYear(), m = anchor.getMonth();
    const grid = getMonthGrid(y, m);
    return { start: toIso(grid[0][0]), end: toIso(grid[5][6]) };
  }, [selectedDate, view]);

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", dateRange.start, dateRange.end],
    queryFn: () => apiRequest("GET", `/api/appointments?start=${dateRange.start}&end=${dateRange.end}`).then(r => r.json()),
  });

  const { data: allClients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: allServices = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });

  const clientMap = useMemo(() => new Map(allClients.map(c => [c.id, c])), [allClients]);
  const serviceMap = useMemo(() => new Map(allServices.map(s => [s.id, s])), [allServices]);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/appointments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setCreateOpen(false);
      toast({ title: "Appointment created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      apiRequest("PATCH", `/api/appointments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (selectedAppt) {
        apiRequest("GET", `/api/appointments/${selectedAppt.id}`).then(r => r.json()).then(setSelectedAppt);
      }
    },
  });

  // Navigation
  const navigate = (dir: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    if (view === "day") setSelectedDate(toIso(addDays(d, dir)));
    else if (view === "week") setSelectedDate(toIso(addDays(d, dir * 7)));
    else {
      d.setMonth(d.getMonth() + dir);
      setSelectedDate(toIso(d));
    }
  };

  const goToday = () => setSelectedDate(today);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      clientId: Number(fd.get("clientId")),
      serviceId: Number(fd.get("serviceId")),
      date: fd.get("date") as string || selectedDate,
      time: fd.get("time") as string,
      status: "scheduled",
      depositPaid: false,
      notes: (fd.get("notes") as string) || null,
      createdAt: toIso(new Date()),
    });
  };

  const handleReschedule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAppt) return;
    const fd = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: selectedAppt.id,
      date: fd.get("date") as string,
      time: fd.get("time") as string,
    });
    setRescheduleOpen(false);
    toast({ title: "Appointment rescheduled" });
  };

  // Group appointments by date
  const byDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach(a => {
      const arr = map.get(a.date) || [];
      arr.push(a);
      map.set(a.date, arr);
    });
    return map;
  }, [appointments]);

  const anchor = new Date(selectedDate + "T12:00:00");

  // ── Header ──
  const headerLabel = (() => {
    if (view === "day") return anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    if (view === "week") {
      const wk = getWeekDates(anchor);
      const s = wk[0], e = wk[6];
      if (s.getMonth() === e.getMonth()) {
        return `${s.toLocaleDateString("en-US", { month: "long" })} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
      }
      return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  })();

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap shrink-0 mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight mr-2" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Calendar
          </h1>
          <div className="flex items-center border rounded-md overflow-hidden">
            {(["day", "week", "month"] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
                data-testid={`button-view-${v}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(-1)} data-testid="button-prev">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[160px] text-center">{headerLabel}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(1)} data-testid="button-next">
            <ChevronRight className="w-4 h-4" />
          </Button>
          {selectedDate !== today && (
            <Button variant="outline" size="sm" className="h-7 text-xs ml-1" onClick={goToday} data-testid="button-today">
              Today
            </Button>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="ml-2" data-testid="button-new-appointment">
                <Plus className="w-4 h-4 mr-1" /> New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" name="date" defaultValue={selectedDate} data-testid="input-date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input type="time" name="time" required data-testid="input-time" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select name="clientId" required>
                    <SelectTrigger data-testid="select-client"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>{allClients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Service</Label>
                  <Select name="serviceId" required>
                    <SelectTrigger data-testid="select-service"><SelectValue placeholder="Select service" /></SelectTrigger>
                    <SelectContent>{allServices.filter(s => s.isActive).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} — ${s.price}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea name="notes" placeholder="Optional notes..." data-testid="input-notes" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-appointment">
                  {createMutation.isPending ? "Creating..." : "Create Appointment"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Views ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === "day" && (
          <DayView
            date={selectedDate}
            appointments={byDate.get(selectedDate) || []}
            clientMap={clientMap}
            serviceMap={serviceMap}
            onSelect={setSelectedAppt}
            today={today}
          />
        )}
        {view === "week" && (
          <WeekView
            anchor={anchor}
            byDate={byDate}
            clientMap={clientMap}
            serviceMap={serviceMap}
            onSelect={setSelectedAppt}
            today={today}
            onDayClick={(d) => { setSelectedDate(d); setView("day"); }}
          />
        )}
        {view === "month" && (
          <MonthView
            anchor={anchor}
            byDate={byDate}
            today={today}
            onDayClick={(d) => { setSelectedDate(d); setView("day"); }}
          />
        )}
      </div>

      {/* ── Appointment Detail Sheet ── */}
      <Sheet open={!!selectedAppt} onOpenChange={(o) => { if (!o) setSelectedAppt(null); }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedAppt && (() => {
            const client = clientMap.get(selectedAppt.clientId);
            const service = serviceMap.get(selectedAppt.serviceId);
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="text-base" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    Appointment Details
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-5">
                  {/* Status */}
                  <Badge variant="outline" className={`text-xs ${statusBadge[selectedAppt.status] || ""}`}>
                    {selectedAppt.status.replace("_", " ")}
                  </Badge>

                  {/* Client */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/8 shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        <Link href={`/clients/${selectedAppt.clientId}`} className="hover:underline">
                          {client ? `${client.firstName} ${client.lastName}` : `Client #${selectedAppt.clientId}`}
                        </Link>
                      </p>
                      {client?.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                      {client?.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                    </div>
                  </div>

                  {/* Client details card */}
                  {client && (
                    <div className="rounded-xl bg-muted/30 border border-border/50 p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {client.skinType && (
                          <div>
                            <span className="text-muted-foreground">Skin Type</span>
                            <p className="font-medium">{client.skinType}</p>
                          </div>
                        )}
                        {client.preferredFormula && (
                          <div>
                            <span className="text-muted-foreground">Formula</span>
                            <p className="font-medium">{client.preferredFormula}</p>
                          </div>
                        )}
                      </div>
                      {client.allergies && (
                        <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/5 rounded-lg p-2">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{client.allergies}</span>
                        </div>
                      )}
                      {client.notes && (
                        <p className="text-xs text-muted-foreground italic">{client.notes}</p>
                      )}
                      <div className="flex gap-1.5">
                        {client.intakeCompleted ? (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                            Intake Done
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                            No Intake
                          </Badge>
                        )}
                        {client.waiverSigned ? (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                            Waiver Signed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                            No Waiver
                          </Badge>
                        )}
                        {selectedAppt.source === "booking_link" && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">Online Booking</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Service & time */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{formatTime(selectedAppt.time)} &middot; {service?.duration ?? "?"}min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{new Date(selectedAppt.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{service?.name ?? "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>${service?.price ?? 0}</span>
                    </div>
                  </div>

                  {selectedAppt.notes && (
                    <p className="text-xs text-muted-foreground italic border-l-2 pl-3">{selectedAppt.notes}</p>
                  )}

                  {/* Send onboarding link */}
                  {client && (!client.intakeCompleted || !client.waiverSigned) && (
                    <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                      <p className="text-xs font-medium">Client needs to complete onboarding</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">Send them this link to fill out intake form + sign waiver:</p>
                      <code className="text-[10px] bg-background rounded px-2 py-1 border block truncate">
                        {window.location.origin}{window.location.pathname}#/onboard/{client.id}
                      </code>
                    </div>
                  )}

                  <Separator />

                  {/* SMS Automation */}
                  <div className="rounded-xl bg-muted/30 border border-border/50 p-3 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Send SMS
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { type: "booking_confirm", label: "Confirmation" },
                        { type: "prep_reminder", label: "Prep Reminder" },
                        { type: "rinse_reminder", label: "Rinse Reminder" },
                        { type: "aftercare", label: "Aftercare" },
                        { type: "rebooking", label: "Rebooking" },
                      ].map(sms => (
                        <Button
                          key={sms.type}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] justify-start"
                          onClick={() => {
                            apiRequest("POST", `/api/automation/trigger/${selectedAppt.id}`, { type: sms.type })
                              .then(() => {
                                toast({ title: `${sms.label} sent` });
                                queryClient.invalidateQueries({ queryKey: ["/api/message-logs"] });
                              })
                              .catch(() => toast({ title: "Failed to send", variant: "destructive" }));
                          }}
                          data-testid={`button-sms-${sms.type}`}
                        >
                          <Send className="w-3 h-3 mr-1" /> {sms.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    {selectedAppt.status === "scheduled" && (
                      <>
                        <Link href={`/check-in/${selectedAppt.id}`}>
                          <Button className="w-full" size="sm" data-testid="button-detail-checkin">
                            <CheckCircle className="w-4 h-4 mr-2" /> Check In
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setRescheduleOpen(true)}
                          data-testid="button-detail-reschedule"
                        >
                          Reschedule
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-destructive hover:text-destructive"
                            onClick={() => { updateMutation.mutate({ id: selectedAppt.id, status: "no_show" }); toast({ title: "Marked as no-show" }); }}
                            data-testid="button-detail-noshow"
                          >
                            No-Show
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-destructive hover:text-destructive"
                            onClick={() => { updateMutation.mutate({ id: selectedAppt.id, status: "cancelled" }); toast({ title: "Appointment cancelled" }); }}
                            data-testid="button-detail-cancel"
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Reschedule dialog */}
                  <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Reschedule</DialogTitle></DialogHeader>
                      <form onSubmit={handleReschedule} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>New Date</Label>
                            <Input type="date" name="date" defaultValue={selectedAppt.date} required />
                          </div>
                          <div className="space-y-2">
                            <Label>New Time</Label>
                            <Input type="time" name="time" defaultValue={selectedAppt.time} required />
                          </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? "Saving..." : "Confirm Reschedule"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Day View (Time Grid) ─────────────────────────────────

function DayView({
  date, appointments, clientMap, serviceMap, onSelect, today,
}: {
  date: string;
  appointments: Appointment[];
  clientMap: Map<number, Client>;
  serviceMap: Map<number, Service>;
  onSelect: (a: Appointment) => void;
  today: string;
}) {
  const sorted = [...appointments].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="h-full overflow-y-auto border rounded-lg bg-card">
      <div className="relative" style={{ minHeight: HOURS.length * HOUR_HEIGHT }}>
        {/* Hour lines */}
        {HOURS.map((h, i) => (
          <div
            key={h}
            className="absolute left-0 right-0 flex border-b border-border/40"
            style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          >
            <div className="w-16 shrink-0 pr-2 pt-0.5 text-right">
              <span className="text-[10px] text-muted-foreground/70">{formatHour(h)}</span>
            </div>
            <div className="flex-1" />
          </div>
        ))}

        {/* Now indicator */}
        {date === today && (() => {
          const now = new Date();
          const mins = now.getHours() * 60 + now.getMinutes();
          const top = ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
          if (top < 0 || top > HOURS.length * HOUR_HEIGHT) return null;
          return (
            <div className="absolute left-16 right-0 z-20 pointer-events-none" style={{ top }}>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                <div className="flex-1 h-px bg-red-500/60" />
              </div>
            </div>
          );
        })()}

        {/* Appointment blocks */}
        {sorted.map(appt => {
          const mins = timeToMinutes(appt.time);
          const service = serviceMap.get(appt.serviceId);
          const client = clientMap.get(appt.clientId);
          const duration = service?.duration ?? 30;
          const top = ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
          const height = Math.max((duration / 60) * HOUR_HEIGHT, 28);

          return (
            <button
              key={appt.id}
              onClick={() => onSelect(appt)}
              className={`absolute left-[68px] right-3 z-10 rounded-md border-l-3 px-2.5 py-1 text-left cursor-pointer transition-colors overflow-hidden ${statusBg[appt.status] || "bg-muted"}`}
              style={{ top, height, minHeight: 28 }}
              data-testid={`block-appointment-${appt.id}`}
            >
              <p className="text-xs font-medium truncate leading-tight">
                {client ? `${client.firstName} ${client.lastName}` : `Client #${appt.clientId}`}
              </p>
              {height >= 40 && (
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {service?.name} &middot; {formatTime(appt.time)}
                </p>
              )}
            </button>
          );
        })}

        {/* Empty state */}
        {sorted.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <CalendarDays className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground/50">No appointments</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Week View ────────────────────────────────────────────

function WeekView({
  anchor, byDate, clientMap, serviceMap, onSelect, today, onDayClick,
}: {
  anchor: Date;
  byDate: Map<string, Appointment[]>;
  clientMap: Map<number, Client>;
  serviceMap: Map<number, Service>;
  onSelect: (a: Appointment) => void;
  today: string;
  onDayClick: (date: string) => void;
}) {
  const weekDates = useMemo(() => getWeekDates(anchor), [anchor.getTime()]);

  return (
    <div className="h-full overflow-y-auto border rounded-lg bg-card">
      <div className="flex" style={{ minHeight: HOURS.length * HOUR_HEIGHT }}>
        {/* Hour labels column */}
        <div className="w-12 shrink-0">
          <div className="h-10 border-b" /> {/* spacer for header */}
          {HOURS.map((h, i) => (
            <div key={h} className="border-b border-border/30 pr-1 pt-0.5 text-right" style={{ height: HOUR_HEIGHT }}>
              <span className="text-[9px] text-muted-foreground/60">{formatHour(h)}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDates.map(d => {
          const iso = toIso(d);
          const isToday = iso === today;
          const dayAppts = (byDate.get(iso) || []).sort((a, b) => a.time.localeCompare(b.time));
          return (
            <div key={iso} className="flex-1 min-w-0 border-l">
              {/* Day header */}
              <button
                onClick={() => onDayClick(iso)}
                className={`h-10 w-full border-b flex flex-col items-center justify-center hover:bg-muted/30 transition-colors ${isToday ? "bg-primary/5" : ""}`}
                data-testid={`week-day-${iso}`}
              >
                <span className="text-[9px] uppercase text-muted-foreground">
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className={`text-xs font-semibold leading-none ${isToday ? "text-primary" : ""}`}>
                  {d.getDate()}
                </span>
              </button>

              {/* Time grid area */}
              <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
                {HOURS.map((_, i) => (
                  <div key={i} className="border-b border-border/20" style={{ height: HOUR_HEIGHT }} />
                ))}

                {/* Now indicator */}
                {isToday && (() => {
                  const now = new Date();
                  const mins = now.getHours() * 60 + now.getMinutes();
                  const top = ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  if (top < 0 || top > HOURS.length * HOUR_HEIGHT) return null;
                  return <div className="absolute left-0 right-0 z-20 h-px bg-red-500/50" style={{ top }} />;
                })()}

                {/* Appointment blocks */}
                {dayAppts.map(appt => {
                  const mins = timeToMinutes(appt.time);
                  const service = serviceMap.get(appt.serviceId);
                  const client = clientMap.get(appt.clientId);
                  const duration = service?.duration ?? 30;
                  const top = ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  const height = Math.max((duration / 60) * HOUR_HEIGHT, 22);

                  return (
                    <button
                      key={appt.id}
                      onClick={(e) => { e.stopPropagation(); onSelect(appt); }}
                      className={`absolute left-0.5 right-0.5 z-10 rounded border-l-2 px-1 py-0.5 text-left cursor-pointer transition-colors overflow-hidden ${statusBg[appt.status] || "bg-muted"}`}
                      style={{ top, height, minHeight: 22 }}
                      data-testid={`week-block-${appt.id}`}
                    >
                      <p className="text-[10px] font-medium truncate leading-tight">
                        {client ? client.firstName : `#${appt.clientId}`}
                      </p>
                      {height >= 36 && (
                        <p className="text-[9px] text-muted-foreground truncate">{formatTime(appt.time)}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Month View ───────────────────────────────────────────

function MonthView({
  anchor, byDate, today, onDayClick,
}: {
  anchor: Date;
  byDate: Map<string, Appointment[]>;
  today: string;
  onDayClick: (date: string) => void;
}) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  return (
    <div className="h-full border rounded-lg bg-card overflow-hidden flex flex-col">
      {/* Day of week headers */}
      <div className="grid grid-cols-7 border-b">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
          <div key={d} className="text-center py-2 text-[10px] uppercase text-muted-foreground font-medium">
            {d}
          </div>
        ))}
      </div>
      {/* Weeks */}
      <div className="flex-1 grid grid-rows-6">
        {grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map(d => {
              const iso = toIso(d);
              const isCurrentMonth = d.getMonth() === month;
              const isToday = iso === today;
              const appts = byDate.get(iso) || [];
              return (
                <button
                  key={iso}
                  onClick={() => onDayClick(iso)}
                  className={`flex flex-col items-start p-1.5 border-r last:border-r-0 min-h-[4.5rem] hover:bg-muted/30 transition-colors text-left ${
                    !isCurrentMonth ? "opacity-35" : ""
                  } ${isToday ? "bg-primary/5" : ""}`}
                  data-testid={`month-day-${iso}`}
                >
                  <span className={`text-[11px] leading-none font-medium ${
                    isToday ? "text-primary font-bold" : ""
                  }`}>
                    {d.getDate()}
                  </span>
                  {/* Appointment dots / labels */}
                  <div className="mt-1 w-full space-y-0.5 overflow-hidden">
                    {appts.slice(0, 3).map(a => (
                      <div
                        key={a.id}
                        className={`text-[9px] leading-tight truncate rounded px-1 py-px ${
                          a.status === "cancelled" || a.status === "no_show"
                            ? "bg-muted text-muted-foreground line-through"
                            : "bg-primary/10 text-primary dark:text-primary/80"
                        }`}
                      >
                        {formatTime(a.time)}
                      </div>
                    ))}
                    {appts.length > 3 && (
                      <p className="text-[9px] text-muted-foreground">+{appts.length - 3} more</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
