import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, CheckCircle, Package, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import type { Appointment, Client, Service, ClientPackage } from "@shared/schema";

export default function CheckInPage() {
  const [, params] = useRoute("/check-in/:id");
  const [, navigate] = useLocation();
  const id = Number(params?.id);
  const { toast } = useToast();
  const [usePackage, setUsePackage] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");

  const { data: appointment, isLoading } = useQuery<Appointment>({
    queryKey: ["/api/appointments", id],
    queryFn: () => apiRequest("GET", `/api/appointments/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", appointment?.clientId],
    queryFn: () => apiRequest("GET", `/api/clients/${appointment!.clientId}`).then((r) => r.json()),
    enabled: !!appointment?.clientId,
  });

  const { data: service } = useQuery<Service>({
    queryKey: ["/api/services", appointment?.serviceId],
    queryFn: () => apiRequest("GET", `/api/services/${appointment!.serviceId}`).then((r) => r.json()),
    enabled: !!appointment?.serviceId,
  });

  const { data: clientPackages } = useQuery<ClientPackage[]>({
    queryKey: ["/api/client-packages", appointment?.clientId],
    queryFn: () => apiRequest("GET", `/api/client-packages?clientId=${appointment!.clientId}`).then((r) => r.json()),
    enabled: !!appointment?.clientId,
  });

  const activePackages = (clientPackages || []).filter(
    (p) => p.status === "active" && p.sessionsRemaining > 0
  );

  // Auto-select first active package if available
  useEffect(() => {
    if (activePackages.length > 0 && !selectedPackageId) {
      setSelectedPackageId(String(activePackages[0].id));
      setUsePackage(true);
    }
  }, [activePackages.length]);

  const completeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Update appointment status
      await apiRequest("PATCH", `/api/appointments/${id}`, { status: "completed" });

      // Create session record
      await apiRequest("POST", "/api/sessions", {
        appointmentId: id,
        clientId: appointment!.clientId,
        formula: (formData.get("formula") as string) || null,
        shade: (formData.get("shade") as string) || null,
        rinseTime: formData.get("rinseTime") ? Number(formData.get("rinseTime")) : null,
        aftercareNotes: (formData.get("aftercareNotes") as string) || null,
        sessionNotes: (formData.get("sessionNotes") as string) || null,
        createdAt: new Date().toISOString().split("T")[0],
      });

      // Handle payment — either deduct from package or charge normally
      if (usePackage && selectedPackageId) {
        const pkg = activePackages.find((p) => p.id === Number(selectedPackageId));
        if (pkg) {
          // Deduct session from package
          await apiRequest("PATCH", `/api/client-packages/${pkg.id}`, {
            sessionsRemaining: pkg.sessionsRemaining - 1,
            status: pkg.sessionsRemaining - 1 <= 0 ? "used" : "active",
          });
          // Record $0 payment (covered by package)
          await apiRequest("POST", "/api/payments", {
            clientId: appointment!.clientId,
            appointmentId: id,
            amount: 0,
            type: "package_session",
            method: "package",
            createdAt: new Date().toISOString().split("T")[0],
          });
        }
      } else if (service) {
        // Normal payment
        await apiRequest("POST", "/api/payments", {
          clientId: appointment!.clientId,
          appointmentId: id,
          amount: service.price,
          type: "service",
          method: (formData.get("paymentMethod") as string) || "card",
          createdAt: new Date().toISOString().split("T")[0],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-packages"] });
      toast({ title: "Session completed and recorded" });
      navigate("/calendar");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    completeMutation.mutate(new FormData(e.currentTarget));
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!appointment) {
    return <div className="p-6"><p className="text-sm text-muted-foreground">Appointment not found</p></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/calendar">
          <Button size="icon" variant="ghost" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Session Check-In
          </h1>
          <p className="text-xs text-muted-foreground">
            {client ? `${client.firstName} ${client.lastName}` : "Loading..."} — {service?.name} — {appointment.time}
          </p>
        </div>
      </div>

      {/* Client quick info */}
      {client && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {client.skinType && <div><span className="text-muted-foreground">Skin type:</span> {client.skinType}</div>}
              {client.preferredFormula && <div><span className="text-muted-foreground">Preferred formula:</span> {client.preferredFormula}</div>}
              {client.allergies && <div className="col-span-2 text-amber-600 dark:text-amber-400">Allergies: {client.allergies}</div>}
              {client.notes && <div className="col-span-2 text-muted-foreground">{client.notes}</div>}
            </div>
            {/* Intake / Waiver status */}
            <div className="flex gap-2 mt-3">
              {client.intakeCompleted ? (
                <Badge variant="secondary" className="text-xs">Intake Complete</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" /> No Intake</Badge>
              )}
              {client.waiverSigned ? (
                <Badge variant="secondary" className="text-xs">Waiver Signed</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" /> No Waiver</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Tan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Formula / Solution</Label>
                <Input
                  name="formula"
                  placeholder="e.g. SunFX Medium"
                  defaultValue={client?.preferredFormula || ""}
                  data-testid="input-formula"
                />
              </div>
              <div className="space-y-2">
                <Label>Shade</Label>
                <Select name="shade">
                  <SelectTrigger data-testid="select-shade">
                    <SelectValue placeholder="Select shade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="extra_dark">Extra Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rinse Time (hours)</Label>
              <Input name="rinseTime" type="number" min="1" max="24" placeholder="e.g. 8" data-testid="input-rinse-time" />
            </div>
            <div className="space-y-2">
              <Label>Session Notes</Label>
              <Textarea name="sessionNotes" placeholder="Application notes, coverage, etc." data-testid="input-session-notes" />
            </div>
            <div className="space-y-2">
              <Label>Aftercare Instructions</Label>
              <Textarea
                name="aftercareNotes"
                placeholder="e.g. Avoid water for 8 hours, moisturize after first rinse..."
                defaultValue="Avoid water for 8 hours. Moisturize after first rinse. Wear loose dark clothing."
                data-testid="input-aftercare"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Package auto-deduction toggle */}
            {activePackages.length > 0 && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Use Package Session</p>
                    <p className="text-xs text-muted-foreground">
                      {activePackages.length} active package{activePackages.length > 1 ? "s" : ""} available
                    </p>
                  </div>
                </div>
                <Switch
                  checked={usePackage}
                  onCheckedChange={setUsePackage}
                  data-testid="switch-use-package"
                />
              </div>
            )}

            {usePackage && activePackages.length > 0 ? (
              <div className="space-y-3">
                {activePackages.length > 1 && (
                  <div className="space-y-2">
                    <Label>Select Package</Label>
                    <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                      <SelectTrigger data-testid="select-package">
                        <SelectValue placeholder="Choose package" />
                      </SelectTrigger>
                      <SelectContent>
                        {activePackages.map((pkg) => (
                          <SelectItem key={pkg.id} value={String(pkg.id)}>
                            Package #{pkg.id} — {pkg.sessionsRemaining} sessions left (expires {pkg.expiryDate})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {selectedPackageId && (() => {
                  const pkg = activePackages.find((p) => p.id === Number(selectedPackageId));
                  return pkg ? (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sessions remaining</span>
                        <span className="font-semibold">{pkg.sessionsRemaining} → {pkg.sessionsRemaining - 1}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-muted-foreground">Expires</span>
                        <span>{pkg.expiryDate}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-muted-foreground">Charge</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">$0 (covered)</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span>{service?.name}</span>
                  <span className="font-semibold">${service?.price}</span>
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select name="paymentMethod" defaultValue="card">
                    <SelectTrigger data-testid="select-payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full"
          disabled={completeMutation.isPending}
          data-testid="button-complete-session"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {completeMutation.isPending ? "Completing..." : usePackage ? "Complete Session (Package)" : "Complete Session & Checkout"}
        </Button>
      </form>
    </div>
  );
}
