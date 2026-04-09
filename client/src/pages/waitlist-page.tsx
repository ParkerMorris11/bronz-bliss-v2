import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Bell, CheckCircle, Trash2, Clock, ListChecks } from "lucide-react";
import { useState } from "react";
import type { Waitlist, Service } from "@shared/schema";

const statusConfig: Record<string, { label: string; className: string }> = {
  waiting: { label: "Waiting", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  notified: { label: "Notified", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  booked: { label: "Booked", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  expired: { label: "Expired", className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" };
  return (
    <Badge variant="outline" className={`text-xs font-medium border ${config.className}`}>
      {config.label}
    </Badge>
  );
}

function WaitlistTableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg bg-white/5" />
      ))}
    </div>
  );
}

interface AddEntryFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  serviceId: string;
  preferredDate: string;
  notes: string;
}

const defaultForm: AddEntryFormData = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  serviceId: "",
  preferredDate: "",
  notes: "",
};

function AddEntryDialog({ services }: { services: Service[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddEntryFormData>(defaultForm);
  const { toast } = useToast();

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/waitlist", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waitlist"] });
      toast({ title: "Added to waitlist", description: "The entry has been added successfully." });
      setForm(defaultForm);
      setOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add entry. Please try again.", variant: "destructive" });
    },
  });

  function handleChange(field: keyof AddEntryFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.serviceId || !form.preferredDate) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    addMutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      serviceId: parseInt(form.serviceId, 10),
      preferredDate: form.preferredDate,
      notes: form.notes.trim() || null,
      status: "waiting",
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          data-testid="button-add-waitlist"
          className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus size={16} />
          Add to Waitlist
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            className="text-xl font-bold text-white"
          >
            Add to Waitlist
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-zinc-300 text-sm">First Name <span className="text-amber-400">*</span></Label>
              <Input
                id="firstName"
                data-testid="input-firstName"
                value={form.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                placeholder="Jane"
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-zinc-300 text-sm">Last Name <span className="text-amber-400">*</span></Label>
              <Input
                id="lastName"
                data-testid="input-lastName"
                value={form.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                placeholder="Doe"
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-zinc-300 text-sm">Phone</Label>
              <Input
                id="phone"
                data-testid="input-phone"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-300 text-sm">Email</Label>
              <Input
                id="email"
                data-testid="input-email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="jane@example.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="serviceId" className="text-zinc-300 text-sm">Service <span className="text-amber-400">*</span></Label>
            <Select
              value={form.serviceId}
              onValueChange={(val) => handleChange("serviceId", val)}
            >
              <SelectTrigger
                data-testid="select-service"
                className="bg-white/5 border-white/10 text-white focus:border-amber-500/50"
              >
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                {services.filter((s) => s.isActive).map((service) => (
                  <SelectItem key={service.id} value={String(service.id)} className="focus:bg-white/10">
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preferredDate" className="text-zinc-300 text-sm">Preferred Date <span className="text-amber-400">*</span></Label>
            <Input
              id="preferredDate"
              data-testid="input-preferredDate"
              type="date"
              value={form.preferredDate}
              onChange={(e) => handleChange("preferredDate", e.target.value)}
              className="bg-white/5 border-white/10 text-white focus:border-amber-500/50 [color-scheme:dark]"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-zinc-300 text-sm">Notes</Label>
            <Textarea
              id="notes"
              data-testid="input-notes"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Any special requests or notes…"
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              data-testid="button-cancel-add"
              variant="ghost"
              onClick={() => { setOpen(false); setForm(defaultForm); }}
              className="text-zinc-400 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="button-submit-add"
              disabled={addMutation.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold"
            >
              {addMutation.isPending ? "Adding…" : "Add Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface WaitlistTableProps {
  entries: Waitlist[];
  services: Service[];
  section: "active" | "resolved";
}

function WaitlistTable({ entries, services, section }: WaitlistTableProps) {
  const { toast } = useToast();

  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s.name]));

  const notifyMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/waitlist/${id}`, { status: "notified" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waitlist"] });
      toast({ title: "Client notified", description: "Status updated to Notified." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to notify client.", variant: "destructive" });
    },
  });

  const bookMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/waitlist/${id}`, { status: "booked" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waitlist"] });
      toast({ title: "Appointment booked", description: "Status updated to Booked." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to book appointment.", variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/waitlist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waitlist"] });
      toast({ title: "Entry removed", description: "Waitlist entry has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove entry.", variant: "destructive" });
    },
  });

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
        <ListChecks size={32} className="mb-3 opacity-40" />
        <p className="text-sm">
          {section === "active" ? "No one is waiting right now." : "No resolved entries yet."}
        </p>
      </div>
    );
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-white/10 hover:bg-transparent">
          <TableHead className="text-zinc-400 font-medium text-xs uppercase tracking-wider">Name</TableHead>
          <TableHead className="text-zinc-400 font-medium text-xs uppercase tracking-wider">Phone</TableHead>
          <TableHead className="text-zinc-400 font-medium text-xs uppercase tracking-wider">Service</TableHead>
          <TableHead className="text-zinc-400 font-medium text-xs uppercase tracking-wider">Preferred Date</TableHead>
          <TableHead className="text-zinc-400 font-medium text-xs uppercase tracking-wider">Status</TableHead>
          <TableHead className="text-zinc-400 font-medium text-xs uppercase tracking-wider text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow
            key={entry.id}
            data-testid={`row-waitlist-${entry.id}`}
            className="border-white/5 hover:bg-white/5 transition-colors"
          >
            <TableCell className="text-white font-medium">
              {entry.firstName} {entry.lastName}
              {entry.email && (
                <div className="text-xs text-zinc-500 mt-0.5">{entry.email}</div>
              )}
            </TableCell>
            <TableCell className="text-zinc-300 text-sm">
              {entry.phone || <span className="text-zinc-600">—</span>}
            </TableCell>
            <TableCell className="text-zinc-300 text-sm">
              {serviceMap[entry.serviceId] || <span className="text-zinc-600">Unknown</span>}
            </TableCell>
            <TableCell className="text-zinc-300 text-sm">
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-amber-500/70" />
                {formatDate(entry.preferredDate)}
              </div>
            </TableCell>
            <TableCell>
              <StatusBadge status={entry.status} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                {entry.status === "waiting" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    data-testid={`button-notify-${entry.id}`}
                    disabled={notifyMutation.isPending}
                    onClick={() => notifyMutation.mutate(entry.id)}
                    className="h-8 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-1 text-xs"
                    title="Mark as Notified"
                  >
                    <Bell size={13} />
                    Notify
                  </Button>
                )}
                {(entry.status === "waiting" || entry.status === "notified") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    data-testid={`button-book-${entry.id}`}
                    disabled={bookMutation.isPending}
                    onClick={() => bookMutation.mutate(entry.id)}
                    className="h-8 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 gap-1 text-xs"
                    title="Mark as Booked"
                  >
                    <CheckCircle size={13} />
                    Book
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid={`button-remove-${entry.id}`}
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate(entry.id)}
                  className="h-8 px-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 gap-1 text-xs"
                  title="Remove entry"
                >
                  <Trash2 size={13} />
                  Remove
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function WaitlistPage() {
  const { data: waitlist = [], isLoading: waitlistLoading } = useQuery<Waitlist[]>({
    queryKey: ["/api/waitlist"],
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const activeEntries = waitlist.filter((e) => e.status === "waiting" || e.status === "notified");
  const resolvedEntries = waitlist.filter((e) => e.status === "booked" || e.status === "expired");
  const waitingCount = waitlist.filter((e) => e.status === "waiting").length;

  const isLoading = waitlistLoading || servicesLoading;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            className="text-xl font-bold text-white tracking-tight"
            data-testid="text-page-title"
          >
            Waitlist
          </h1>
          {waitingCount > 0 && (
            <Badge
              data-testid="badge-waiting-count"
              className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold px-2"
            >
              {waitingCount} waiting
            </Badge>
          )}
        </div>
        <AddEntryDialog services={services} />
      </div>

      {/* Waiting Section */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-xl">
        <CardHeader className="pb-3 border-b border-white/10">
          <CardTitle
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            className="text-base font-semibold text-white flex items-center gap-2"
            data-testid="text-waiting-section-title"
          >
            <Clock size={16} className="text-amber-400" />
            Waiting
            {activeEntries.length > 0 && (
              <span className="ml-1 text-xs font-medium text-zinc-500">({activeEntries.length})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 px-0 pb-0">
          {isLoading ? (
            <div className="px-6 pb-6">
              <WaitlistTableSkeleton />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <WaitlistTable entries={activeEntries} services={services} section="active" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved Section */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-xl">
        <CardHeader className="pb-3 border-b border-white/10">
          <CardTitle
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            className="text-base font-semibold text-white flex items-center gap-2"
            data-testid="text-resolved-section-title"
          >
            <ListChecks size={16} className="text-zinc-400" />
            Resolved
            {resolvedEntries.length > 0 && (
              <span className="ml-1 text-xs font-medium text-zinc-500">({resolvedEntries.length})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 px-0 pb-0">
          {isLoading ? (
            <div className="px-6 pb-6">
              <WaitlistTableSkeleton />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <WaitlistTable entries={resolvedEntries} services={services} section="resolved" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
