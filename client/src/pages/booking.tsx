import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Sun, Clock, DollarSign, CheckCircle, ChevronLeft, ChevronRight, CalendarDays, AlertCircle } from "lucide-react";
import { formatTime } from "@/lib/format";
import type { Service } from "@shared/schema";

// ── Helpers ──────────────────────────────────────────────

function toIso(d: Date) { return d.toISOString().split("T")[0]; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function getMonthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const start = addDays(first, -startDay);
  const weeks: Date[][] = [];
  let cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) { week.push(new Date(cursor)); cursor = addDays(cursor, 1); }
    weeks.push(week);
  }
  return weeks;
}

interface PublicSettings {
  businessName: string;
  address: string | null;
  phone: string | null;
  bookingEnabled: boolean;
  depositRequired: boolean;
  depositAmount: number | null;
  cancellationHours: number;
}

interface AvailabilityResult {
  slots: string[];
  closed: boolean;
}

type Step = "service" | "datetime" | "info" | "done";

// ── Component ────────────────────────────────────────────

export default function BookingPage() {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState(toIso(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [calendarAnchor, setCalendarAnchor] = useState(new Date());
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", notes: "" });
  const [confirmation, setConfirmation] = useState<{ date: string; time: string; serviceName: string } | null>(null);

  const today = toIso(new Date());

  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ["/api/public/settings"],
    queryFn: () => apiRequest("GET", "/api/public/settings").then(r => r.json()),
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/public/services"],
    queryFn: () => apiRequest("GET", "/api/public/services").then(r => r.json()),
  });

  const { data: availability } = useQuery<AvailabilityResult>({
    queryKey: ["/api/public/availability", selectedDate, selectedService?.id],
    queryFn: () => apiRequest("GET", `/api/public/availability?date=${selectedDate}&serviceId=${selectedService!.id}`).then(r => r.json()),
    enabled: !!selectedService && step === "datetime",
  });

  const bookMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/public/book", data).then(r => r.json()),
    onSuccess: (data) => {
      const svc = selectedService!;
      setConfirmation({ date: selectedDate, time: selectedTime!, serviceName: svc.name });
      setStep("done");
    },
  });

  const handleBook = () => {
    if (!selectedService || !selectedDate || !selectedTime || !form.firstName || !form.lastName) return;
    bookMutation.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone || undefined,
      email: form.email || undefined,
      notes: form.notes || undefined,
      serviceId: selectedService.id,
      date: selectedDate,
      time: selectedTime,
    });
  };

  // Calendar grid for date selection
  const grid = useMemo(() =>
    getMonthGrid(calendarAnchor.getFullYear(), calendarAnchor.getMonth()),
    [calendarAnchor.getFullYear(), calendarAnchor.getMonth()]
  );

  const monthLabel = calendarAnchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric"
  });

  const displayTime = selectedTime ? formatTime(selectedTime) : null;

  // ── Step Progress ──

  const steps: Step[] = ["service", "datetime", "info"];
  const stepLabels = ["Service", "Date & Time", "Your Info"];
  const stepIndex = steps.indexOf(step);

  // ── Booking disabled check ──
  if (settings && !settings.bookingEnabled) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-lg font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Online booking is paused
          </h1>
          <p className="text-sm text-stone-950 mt-2">
            {settings.businessName} isn't accepting online bookings right now. Please call or message us directly.
          </p>
          {settings.phone && (
            <a href={`tel:${settings.phone}`} className="mt-4 block text-primary font-medium">
              {settings.phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sun className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {settings?.businessName ?? "Book an Appointment"}
            </p>
            {settings?.address && (
              <p className="text-[10px] text-stone-950 leading-tight mt-0.5">{settings.address}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Progress bar */}
        {step !== "done" && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                    i < stepIndex ? "bg-primary text-white" :
                    i === stepIndex ? "bg-primary text-white" :
                    "bg-stone-200 text-stone-950"
                  }`}>
                    {i < stepIndex ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs ${i === stepIndex ? "font-medium" : "text-stone-950"}`}>
                    {stepLabels[i]}
                  </span>
                  {i < steps.length - 1 && <div className="flex-1 h-px bg-stone-200" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Service Selection */}
        {step === "service" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Pick a service
              </h2>
              <p className="text-sm text-stone-950">Choose the service you'd like to book</p>
            </div>
            <div className="space-y-2">
              {services.map(svc => (
                <button
                  key={svc.id}
                  onClick={() => { setSelectedService(svc); setStep("datetime"); }}
                  className={`w-full text-left rounded-xl border-2 bg-white p-4 transition-all hover:border-primary/60 hover:shadow-sm ${
                    selectedService?.id === svc.id ? "border-primary shadow-sm" : "border-stone-200"
                  }`}
                  data-testid={`service-${svc.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{svc.name}</p>
                      {svc.description && (
                        <p className="text-xs text-stone-950 mt-0.5">{svc.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">${svc.price}</p>
                      <div className="flex items-center gap-1 text-xs text-stone-950 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {svc.duration} min
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === "datetime" && selectedService && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setStep("service")}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-lg font-bold leading-none" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Pick a date & time
                </h2>
                <p className="text-xs text-stone-950 mt-0.5">{selectedService.name} · {selectedService.duration} min · ${selectedService.price}</p>
              </div>
            </div>

            {/* Mini calendar */}
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setCalendarAnchor(d => { const r = new Date(d); r.setMonth(r.getMonth() - 1); return r; })}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold">{monthLabel}</span>
                <button
                  onClick={() => setCalendarAnchor(d => { const r = new Date(d); r.setMonth(r.getMonth() + 1); return r; })}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {["M","T","W","T","F","S","S"].map((d, i) => (
                  <div key={i} className="text-[10px] font-medium text-stone-950 py-1">{d}</div>
                ))}
                {grid.flat().map((d, i) => {
                  const iso = toIso(d);
                  const isPast = iso < today;
                  const isSel = iso === selectedDate;
                  const isThisMonth = d.getMonth() === calendarAnchor.getMonth();
                  return (
                    <button
                      key={i}
                      onClick={() => { if (!isPast && isThisMonth) { setSelectedDate(iso); setSelectedTime(null); }}}
                      disabled={isPast || !isThisMonth}
                      className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                        isSel ? "bg-primary text-white" :
                        isPast || !isThisMonth ? "text-stone-700 cursor-default" :
                        "hover:bg-primary/10 hover:text-primary"
                      }`}
                      data-testid={`cal-day-${iso}`}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-950 mb-2">
                Available times — {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
              {!availability ? (
                <div className="grid grid-cols-4 gap-2">
                  {[1,2,3,4,5,6,7,8].map(i => (
                    <div key={i} className="h-9 rounded-lg bg-stone-200 animate-pulse" />
                  ))}
                </div>
              ) : availability.closed ? (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <CalendarDays className="w-6 h-6 text-stone-700 mx-auto mb-2" />
                  <p className="text-sm text-stone-950">Closed on this day</p>
                </div>
              ) : availability.slots.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <p className="text-sm text-stone-950">No times available</p>
                  <p className="text-xs text-stone-900 mt-1">Try a different date</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availability.slots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                        selectedTime === slot
                          ? "bg-primary text-white border-primary"
                          : "bg-white border-stone-200 hover:border-primary/60 hover:text-primary"
                      }`}
                      data-testid={`slot-${slot}`}
                    >
                      {formatTime(slot)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!selectedTime}
              onClick={() => setStep("info")}
              data-testid="button-continue-to-info"
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 3: Your Info */}
        {step === "info" && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setStep("datetime")}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Your info
              </h2>
            </div>

            {/* Booking summary */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Booking Summary</p>
              <p className="text-sm font-semibold">{selectedService?.name}</p>
              <div className="flex items-center gap-3 text-xs text-stone-950">
                <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{displayDate}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{displayTime}</span>
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${selectedService?.price}</span>
              </div>
              {settings?.depositRequired && settings.depositAmount && (
                <p className="text-xs text-amber-600 mt-1">
                  ${settings.depositAmount} deposit required to confirm
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">First Name *</Label>
                  <Input
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="Emma"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Last Name *</Label>
                  <Input
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Johnson"
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="435-555-0100"
                  data-testid="input-phone"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@email.com"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Allergies, preferences, special requests..."
                  rows={3}
                  data-testid="input-notes"
                />
              </div>
            </div>

            {settings?.cancellationHours && (
              <p className="text-xs text-stone-950">
                Free cancellation up to {settings.cancellationHours} hours before your appointment.
              </p>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!form.firstName || !form.lastName || bookMutation.isPending}
              onClick={handleBook}
              data-testid="button-confirm-booking"
            >
              {bookMutation.isPending ? "Booking..." : "Confirm Booking"}
            </Button>

            {bookMutation.error && (
              <p className="text-sm text-destructive text-center">
                Something went wrong. Please try again.
              </p>
            )}
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && confirmation && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                You're booked!
              </h2>
              <p className="text-sm text-stone-950 mt-1">
                We'll see you soon. Check your phone for a confirmation.
              </p>
            </div>
            <div className="rounded-xl bg-white border p-4 text-left space-y-2 max-w-xs mx-auto">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-950">Your Appointment</p>
              <p className="font-semibold text-sm">{confirmation.serviceName}</p>
              <p className="text-sm text-stone-950">
                {new Date(confirmation.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <p className="text-sm text-stone-950">{formatTime(confirmation.time)}</p>
              {settings?.depositRequired && settings.depositAmount && (
                <Badge variant="outline" className="text-[10px]">
                  ${settings.depositAmount} deposit due at appointment
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => { setStep("service"); setSelectedService(null); setSelectedTime(null); setForm({ firstName: "", lastName: "", phone: "", email: "", notes: "" }); }}
            >
              Book Another
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
