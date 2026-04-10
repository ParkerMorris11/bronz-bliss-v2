import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Sun, Clock, DollarSign, CheckCircle, ChevronLeft, ChevronRight, CalendarDays, AlertCircle, Phone, CalendarPlus } from "lucide-react";
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

function makeCalendarLink(date: string, time: string, serviceName: string, businessName: string, duration: number) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const start = new Date(year, month - 1, day, hour, minute);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0];
  const title = encodeURIComponent(`${serviceName} @ ${businessName}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}`;
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

// ── Time slot grouping ────────────────────────────────────

function groupSlots(slots: string[]) {
  const morning = slots.filter(s => parseInt(s) < 12);
  const afternoon = slots.filter(s => parseInt(s) >= 12 && parseInt(s) < 17);
  const evening = slots.filter(s => parseInt(s) >= 17);
  return { morning, afternoon, evening };
}

function SlotGroup({ label, slots, selected, onSelect }: {
  label: string;
  slots: string[];
  selected: string | null;
  onSelect: (slot: string) => void;
}) {
  if (slots.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">{label}</p>
      <div className="grid grid-cols-4 gap-2">
        {slots.map(slot => (
          <button
            key={slot}
            onClick={() => onSelect(slot)}
            className={`py-2 rounded-lg text-xs font-medium border-2 transition-all ${
              selected === slot
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white border-stone-200 hover:border-primary/60 hover:text-primary"
            }`}
            data-testid={`slot-${slot}`}
          >
            {formatTime(slot)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────

export default function BookingPage() {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState(toIso(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [calendarAnchor, setCalendarAnchor] = useState(new Date());
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", notes: "" });
  const [confirmation, setConfirmation] = useState<{ date: string; time: string; serviceName: string; duration: number } | null>(null);

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
    onSuccess: () => {
      setConfirmation({
        date: selectedDate,
        time: selectedTime!,
        serviceName: selectedService!.name,
        duration: selectedService!.duration,
      });
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

  const grid = useMemo(() =>
    getMonthGrid(calendarAnchor.getFullYear(), calendarAnchor.getMonth()),
    [calendarAnchor.getFullYear(), calendarAnchor.getMonth()]
  );

  const monthLabel = calendarAnchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric"
  });

  const displayTime = selectedTime ? formatTime(selectedTime) : null;

  const steps: Step[] = ["service", "datetime", "info"];
  const stepLabels = ["Service", "Date & Time", "Your Info"];
  const stepIndex = steps.indexOf(step);

  // ── Booking disabled ──────────────────────────────────
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
          <p className="text-sm text-stone-500 mt-2">
            {settings.businessName} isn't accepting online bookings right now. Please call or message us directly.
          </p>
          {settings.phone && (
            <a href={`tel:${settings.phone}`} className="mt-4 inline-flex items-center gap-2 text-primary font-medium text-sm">
              <Phone className="w-4 h-4" /> {settings.phone}
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
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm">
            <Sun className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {settings?.businessName ?? "Book an Appointment"}
            </p>
            <p className="text-[11px] text-stone-400 leading-tight mt-0.5">
              {settings?.address ?? "Book your appointment in minutes"}
            </p>
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
                    i <= stepIndex ? "bg-primary text-white" : "bg-stone-200 text-stone-400"
                  }`}>
                    {i < stepIndex ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs ${i === stepIndex ? "font-semibold text-stone-800" : "text-stone-400"}`}>
                    {stepLabels[i]}
                  </span>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-px transition-colors ${i < stepIndex ? "bg-primary" : "bg-stone-200"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Service */}
        {step === "service" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                What can we do for you?
              </h2>
              <p className="text-sm text-stone-400 mt-0.5">Select a service to get started</p>
            </div>
            <div className="space-y-2.5">
              {services.map(svc => (
                <button
                  key={svc.id}
                  onClick={() => { setSelectedService(svc); setStep("datetime"); }}
                  className={`w-full text-left rounded-xl border-2 bg-white p-4 transition-all hover:border-primary/50 hover:shadow-sm active:scale-[0.99] ${
                    selectedService?.id === svc.id ? "border-primary shadow-sm" : "border-stone-200"
                  }`}
                  data-testid={`service-${svc.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{svc.name}</p>
                      {svc.description && (
                        <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{svc.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">${svc.price}</p>
                      <div className="flex items-center gap-1 text-xs text-stone-400 mt-0.5 justify-end">
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
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-full" onClick={() => setStep("service")}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-xl font-bold leading-none" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Pick a date & time
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  {selectedService.name} · {selectedService.duration} min · ${selectedService.price}
                </p>
              </div>
            </div>

            {/* Calendar */}
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setCalendarAnchor(d => { const r = new Date(d); r.setMonth(r.getMonth() - 1); return r; })}
                  className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold">{monthLabel}</span>
                <button
                  onClick={() => setCalendarAnchor(d => { const r = new Date(d); r.setMonth(r.getMonth() + 1); return r; })}
                  className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {["M","T","W","T","F","S","S"].map((d, i) => (
                  <div key={i} className="text-[10px] font-semibold text-stone-400 py-1">{d}</div>
                ))}
                {grid.flat().map((d, i) => {
                  const iso = toIso(d);
                  const isPast = iso < today;
                  const isSel = iso === selectedDate;
                  const isToday = iso === today;
                  const isThisMonth = d.getMonth() === calendarAnchor.getMonth();
                  return (
                    <button
                      key={i}
                      onClick={() => { if (!isPast && isThisMonth) { setSelectedDate(iso); setSelectedTime(null); }}}
                      disabled={isPast || !isThisMonth}
                      className={`rounded-lg py-1.5 text-xs font-medium transition-colors relative ${
                        isSel ? "bg-primary text-white shadow-sm" :
                        isPast || !isThisMonth ? "text-stone-300 cursor-default" :
                        isToday ? "text-primary font-bold hover:bg-primary/10" :
                        "hover:bg-primary/10 hover:text-primary text-stone-700"
                      }`}
                      data-testid={`cal-day-${iso}`}
                    >
                      {d.getDate()}
                      {isToday && !isSel && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            <div>
              <p className="text-xs font-semibold text-stone-500 mb-3">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
              {!availability ? (
                <div className="grid grid-cols-4 gap-2">
                  {[1,2,3,4,5,6,7,8].map(i => (
                    <div key={i} className="h-9 rounded-lg bg-stone-100 animate-pulse" />
                  ))}
                </div>
              ) : availability.closed ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <CalendarDays className="w-6 h-6 text-stone-300 mx-auto mb-2" />
                  <p className="text-sm text-stone-400">Closed on this day</p>
                  <p className="text-xs text-stone-300 mt-1">Try selecting a different date</p>
                </div>
              ) : availability.slots.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <p className="text-sm text-stone-400">No times available</p>
                  <p className="text-xs text-stone-300 mt-1">Try a different date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const { morning, afternoon, evening } = groupSlots(availability.slots);
                    return (
                      <>
                        <SlotGroup label="Morning" slots={morning} selected={selectedTime} onSelect={setSelectedTime} />
                        <SlotGroup label="Afternoon" slots={afternoon} selected={selectedTime} onSelect={setSelectedTime} />
                        <SlotGroup label="Evening" slots={evening} selected={selectedTime} onSelect={setSelectedTime} />
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={!selectedTime}
              onClick={() => setStep("info")}
              data-testid="button-continue-to-info"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 3: Your Info */}
        {step === "info" && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-full" onClick={() => setStep("datetime")}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Almost there
              </h2>
            </div>

            {/* Booking summary */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Your Booking</p>
              <p className="text-base font-bold">{selectedService?.name}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-primary/60" />{displayDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary/60" />{displayTime}
                </span>
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary/60" />${selectedService?.price}
                </span>
              </div>
              {settings?.depositRequired && settings.depositAmount && (
                <p className="text-xs text-amber-600 font-medium">
                  ${settings.depositAmount} deposit due at appointment
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">First Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="Emma"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Last Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Johnson"
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Phone <span className="text-stone-400 font-normal">(for appointment reminders)</span>
                </Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="435-555-0100"
                  data-testid="input-phone"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@email.com"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Special requests <span className="text-stone-400 font-normal">(optional)</span></Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Allergies, preferences, anything we should know..."
                  rows={3}
                  data-testid="input-notes"
                />
              </div>
            </div>

            {settings?.cancellationHours && (
              <p className="text-xs text-stone-400">
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
                That time was just taken. Please go back and choose another.
              </p>
            )}
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && confirmation && (
          <div className="text-center py-8 space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                You're all booked!
              </h2>
              <p className="text-sm text-stone-400 mt-1.5">
                {form.phone
                  ? "We'll send a reminder to your phone before your appointment."
                  : "We look forward to seeing you!"}
              </p>
            </div>

            {/* Appointment card */}
            <div className="rounded-2xl bg-white border shadow-sm p-5 text-left space-y-3 max-w-xs mx-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Appointment Details</p>
              <div className="space-y-2">
                <p className="font-bold text-base">{confirmation.serviceName}</p>
                <div className="space-y-1.5 text-sm text-stone-600">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary/60 shrink-0" />
                    {new Date(confirmation.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary/60 shrink-0" />
                    {formatTime(confirmation.time)}
                  </div>
                  {settings?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary/60 shrink-0" />
                      <a href={`tel:${settings.phone}`} className="text-primary underline-offset-2 hover:underline">
                        {settings.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              {settings?.depositRequired && settings.depositAmount && (
                <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                  ${settings.depositAmount} deposit due at appointment
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <a
                href={makeCalendarLink(
                  confirmation.date,
                  confirmation.time,
                  confirmation.serviceName,
                  settings?.businessName ?? "Bronz Bliss",
                  confirmation.duration
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
              >
                <CalendarPlus className="w-4 h-4 text-primary" />
                Add to Google Calendar
              </a>
              <Button
                variant="ghost"
                className="text-stone-400 hover:text-stone-600"
                onClick={() => {
                  setStep("service");
                  setSelectedService(null);
                  setSelectedTime(null);
                  setForm({ firstName: "", lastName: "", phone: "", email: "", notes: "" });
                }}
              >
                Book another appointment
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
