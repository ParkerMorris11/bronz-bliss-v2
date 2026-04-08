import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Save, Building2, Clock, Bell, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import type { BusinessSettings } from "@shared/schema";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type DayKey = (typeof DAYS)[number];

type DaySchedule = {
  enabled: boolean;
  open: string;
  close: string;
};

type OperatingHoursMap = Record<DayKey, DaySchedule>;

const DEFAULT_HOURS: OperatingHoursMap = {
  Monday:    { enabled: true,  open: "09:00", close: "18:00" },
  Tuesday:   { enabled: true,  open: "09:00", close: "18:00" },
  Wednesday: { enabled: true,  open: "09:00", close: "18:00" },
  Thursday:  { enabled: true,  open: "09:00", close: "18:00" },
  Friday:    { enabled: true,  open: "09:00", close: "18:00" },
  Saturday:  { enabled: true,  open: "09:00", close: "17:00" },
  Sunday:    { enabled: false, open: "10:00", close: "16:00" },
};

function parseOperatingHours(raw: string | null): OperatingHoursMap {
  if (!raw) return DEFAULT_HOURS;
  try {
    const parsed = JSON.parse(raw);
    const result: OperatingHoursMap = { ...DEFAULT_HOURS };
    for (const day of DAYS) {
      if (parsed[day] !== undefined) {
        if (parsed[day] === null) {
          result[day] = { enabled: false, open: "09:00", close: "18:00" };
        } else {
          result[day] = {
            enabled: parsed[day].enabled ?? true,
            open: parsed[day].open ?? "09:00",
            close: parsed[day].close ?? "18:00",
          };
        }
      }
    }
    return result;
  } catch {
    return DEFAULT_HOURS;
  }
}

function serializeOperatingHours(hours: OperatingHoursMap): string {
  const out: Record<string, DaySchedule | null> = {};
  for (const day of DAYS) {
    out[day] = hours[day].enabled ? { enabled: true, open: hours[day].open, close: hours[day].close } : null;
  }
  return JSON.stringify(out);
}

const PLACEHOLDER_TAGS = ["{name}", "{service}", "{date}", "{time}", "{hours}", "{link}"];

export default function SettingsPage() {
  const { toast } = useToast();

  // Section 1: Business Info
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  // Section 2: Booking Rules
  const [depositRequired, setDepositRequired] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [cancellationHours, setCancellationHours] = useState<string>("24");
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [bookingNotice, setBookingNotice] = useState<string>("60");

  // Section 3: Operating Hours
  const [operatingHours, setOperatingHours] = useState<OperatingHoursMap>(DEFAULT_HOURS);

  // Section 4: Notification Templates
  const [confirmationTemplate, setConfirmationTemplate] = useState("");
  const [prepTemplate, setPrepTemplate] = useState("");
  const [rinseTemplate, setRinseTemplate] = useState("");
  const [aftercareTemplate, setAftercareTemplate] = useState("");
  const [rebookingTemplate, setRebookingTemplate] = useState("");

  const { data: settings, isLoading } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (!settings) return;
    setBusinessName(settings.businessName ?? "");
    setPhone(settings.phone ?? "");
    setEmail(settings.email ?? "");
    setAddress(settings.address ?? "");
    setDepositRequired(settings.depositRequired ?? false);
    setDepositAmount(settings.depositAmount != null ? String(settings.depositAmount) : "");
    setCancellationHours(String(settings.cancellationHours ?? 24));
    setBookingEnabled(settings.bookingEnabled ?? true);
    setBookingNotice(String(settings.bookingNotice ?? 60));
    setOperatingHours(parseOperatingHours(settings.operatingHours ?? null));
    setConfirmationTemplate(settings.confirmationTemplate ?? "");
    setPrepTemplate(settings.prepTemplate ?? "");
    setRinseTemplate(settings.rinseTemplate ?? "");
    setAftercareTemplate(settings.aftercareTemplate ?? "");
    setRebookingTemplate(settings.rebookingTemplate ?? "");
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (payload: Partial<BusinessSettings>) =>
      apiRequest("PATCH", "/api/settings", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved", description: "Your changes have been applied." });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save settings. Please try again.", variant: "destructive" });
    },
  });

  function handleSave() {
    mutation.mutate({
      businessName,
      phone: phone || null,
      email: email || null,
      address: address || null,
      depositRequired,
      depositAmount: depositAmount !== "" ? Number(depositAmount) : null,
      cancellationHours: Number(cancellationHours),
      bookingEnabled,
      bookingNotice: Number(bookingNotice),
      operatingHours: serializeOperatingHours(operatingHours),
      confirmationTemplate: confirmationTemplate || null,
      prepTemplate: prepTemplate || null,
      rinseTemplate: rinseTemplate || null,
      aftercareTemplate: aftercareTemplate || null,
      rebookingTemplate: rebookingTemplate || null,
    });
  }

  function updateDayField(day: DayKey, field: keyof DaySchedule, value: boolean | string) {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Section 1: Business Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }} className="text-xl">
              Business Info
            </CardTitle>
          </div>
          <CardDescription>Your salon's public-facing details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              data-testid="input-businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Glow Studio"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              data-testid="input-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              type="tel"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              data-testid="input-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@glowstudio.com"
              type="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              data-testid="input-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Sunshine Blvd, Miami, FL 33101"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Booking Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <CardTitle style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }} className="text-xl">
              Booking Rules
            </CardTitle>
          </div>
          <CardDescription>Control how clients book appointments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Booking Enabled */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="bookingEnabled" className="text-sm font-medium">
                Online Booking
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">Allow clients to book via your booking link.</p>
            </div>
            <Switch
              id="bookingEnabled"
              data-testid="switch-bookingEnabled"
              checked={bookingEnabled}
              onCheckedChange={setBookingEnabled}
            />
          </div>

          {/* Booking Notice */}
          <div className="space-y-1.5">
            <Label htmlFor="bookingNotice">Minimum Booking Notice (minutes)</Label>
            <Input
              id="bookingNotice"
              data-testid="input-bookingNotice"
              type="number"
              min={0}
              value={bookingNotice}
              onChange={(e) => setBookingNotice(e.target.value)}
              placeholder="60"
            />
            <p className="text-xs text-muted-foreground">How far in advance a booking must be made.</p>
          </div>

          {/* Cancellation Hours */}
          <div className="space-y-1.5">
            <Label htmlFor="cancellationHours">Cancellation Window (hours)</Label>
            <Input
              id="cancellationHours"
              data-testid="input-cancellationHours"
              type="number"
              min={0}
              value={cancellationHours}
              onChange={(e) => setCancellationHours(e.target.value)}
              placeholder="24"
            />
            <p className="text-xs text-muted-foreground">Clients cannot cancel within this many hours of their appointment.</p>
          </div>

          {/* Deposit Required */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="depositRequired" className="text-sm font-medium">
                Require Deposit
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">Collect a deposit when booking.</p>
            </div>
            <Switch
              id="depositRequired"
              data-testid="switch-depositRequired"
              checked={depositRequired}
              onCheckedChange={setDepositRequired}
            />
          </div>

          {/* Deposit Amount — only shown when depositRequired */}
          {depositRequired && (
            <div className="space-y-1.5 pl-0">
              <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
              <Input
                id="depositAmount"
                data-testid="input-depositAmount"
                type="number"
                min={0}
                step={0.01}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="25.00"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Operating Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <CardTitle style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }} className="text-xl">
              Operating Hours
            </CardTitle>
          </div>
          <CardDescription>Set your open and close times for each day.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {DAYS.map((day) => {
            const schedule = operatingHours[day];
            return (
              <div key={day} className="flex items-center gap-3">
                {/* Day toggle */}
                <div className="flex items-center gap-2 w-32 shrink-0">
                  <Checkbox
                    id={`day-${day}`}
                    data-testid={`checkbox-day-${day}`}
                    checked={schedule.enabled}
                    onCheckedChange={(checked) => updateDayField(day, "enabled", Boolean(checked))}
                  />
                  <Label
                    htmlFor={`day-${day}`}
                    className={`text-sm cursor-pointer select-none ${!schedule.enabled ? "text-muted-foreground" : ""}`}
                  >
                    {day.slice(0, 3)}
                  </Label>
                </div>

                {/* Time inputs */}
                {schedule.enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      data-testid={`input-open-${day}`}
                      value={schedule.open}
                      onChange={(e) => updateDayField(day, "open", e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <span className="text-muted-foreground text-xs shrink-0">to</span>
                    <Input
                      type="time"
                      data-testid={`input-close-${day}`}
                      value={schedule.close}
                      onChange={(e) => updateDayField(day, "close", e.target.value)}
                      className="flex-1 text-sm"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Closed</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Section 4: Notification Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <CardTitle style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }} className="text-xl">
              Notification Templates
            </CardTitle>
          </div>
          <CardDescription>Customize the SMS messages sent to your clients.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Available tags */}
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDER_TAGS.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Confirmation Template */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmationTemplate" className="font-medium">
              Booking Confirmation
            </Label>
            <Textarea
              id="confirmationTemplate"
              data-testid="textarea-confirmationTemplate"
              value={confirmationTemplate}
              onChange={(e) => setConfirmationTemplate(e.target.value)}
              placeholder="Hi {name}, your {service} is confirmed for {date} at {time}. See you soon!"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Sent immediately after a booking is created.</p>
          </div>

          {/* Prep Reminder Template */}
          <div className="space-y-1.5">
            <Label htmlFor="prepTemplate" className="font-medium">
              Prep Reminder
            </Label>
            <Textarea
              id="prepTemplate"
              data-testid="textarea-prepTemplate"
              value={prepTemplate}
              onChange={(e) => setPrepTemplate(e.target.value)}
              placeholder="Hi {name}, your {service} is tomorrow at {time}. Remember to exfoliate and come moisturizer-free!"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Sent the day before the appointment.</p>
          </div>

          {/* Rinse Reminder Template */}
          <div className="space-y-1.5">
            <Label htmlFor="rinseTemplate" className="font-medium">
              Rinse Reminder
            </Label>
            <Textarea
              id="rinseTemplate"
              data-testid="textarea-rinseTemplate"
              value={rinseTemplate}
              onChange={(e) => setRinseTemplate(e.target.value)}
              placeholder="Hi {name}, it's time to rinse your tan! After {hours} hours you're good to go. Enjoy your glow!"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Sent {"{hours}"} after the appointment to prompt rinsing.</p>
          </div>

          {/* Aftercare Template */}
          <div className="space-y-1.5">
            <Label htmlFor="aftercareTemplate" className="font-medium">
              Aftercare
            </Label>
            <Textarea
              id="aftercareTemplate"
              data-testid="textarea-aftercareTemplate"
              value={aftercareTemplate}
              onChange={(e) => setAftercareTemplate(e.target.value)}
              placeholder="Hi {name}, hope you're loving your glow! Moisturize daily and avoid long soaks to extend your tan."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Sent 24–48 hours post-appointment with care tips.</p>
          </div>

          {/* Rebooking Template */}
          <div className="space-y-1.5">
            <Label htmlFor="rebookingTemplate" className="font-medium">
              Rebooking Nudge
            </Label>
            <Textarea
              id="rebookingTemplate"
              data-testid="textarea-rebookingTemplate"
              value={rebookingTemplate}
              onChange={(e) => setRebookingTemplate(e.target.value)}
              placeholder="Hi {name}, your tan is starting to fade! Ready for a refresh? Book here: {link}"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Sent ~7–10 days after the appointment to encourage rebooking.</p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pb-8">
        <Button
          data-testid="button-save-settings"
          onClick={handleSave}
          disabled={mutation.isPending}
          size="lg"
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {mutation.isPending ? "Saving…" : "Save All"}
        </Button>
      </div>
    </div>
  );
}
