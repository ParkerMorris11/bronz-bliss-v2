import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Phone,
  Mail,
  Droplets,
  AlertTriangle,
  FileText,
  Clock,
  Package,
  ShieldCheck,
  ShieldAlert,
  ClipboardList,
  MessageSquare,
  Star,
  CheckCircle2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Appointment, SessionRecord, ClientPackage, Service } from "@shared/schema";

// ─── Local types for new sections ────────────────────────────────────────────

type IntakeResponse = {
  id: number;
  clientId: number;
  questionId: number;
  answer: string | null;
  submittedAt: string;
};

type IntakeQuestion = {
  id: number;
  question: string;
  type: string;
  options: string | null;
  required: boolean;
  sortOrder: number;
  isActive: boolean;
};

type MessageLog = {
  id: number;
  clientId: number;
  appointmentId: number | null;
  type: string;
  channel: string;
  to: string;
  body: string;
  status: string;
  sentAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  checked_in: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  no_show: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
};

const messageTypeColors: Record<string, string> = {
  booking_confirm: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  prep_reminder: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  follow_up: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  review_request: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancellation: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function formatDate(raw: string | null | undefined): string {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

function formatDateTime(raw: string | null | undefined): string {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
}

function humanizeType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WaiverBadge({ client }: { client: Client }) {
  const signed = !!(client as any).waiverSignedAt;
  const signedAt: string | undefined = (client as any).waiverSignedAt;

  if (signed) {
    return (
      <div
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800/50"
        data-testid="badge-waiver-signed"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Waiver Signed</span>
        {signedAt && (
          <span className="text-green-600/70 dark:text-green-400/70 ml-1">
            · {formatDate(signedAt)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50"
      data-testid="badge-waiver-pending"
    >
      <ShieldAlert className="w-3.5 h-3.5" />
      <span>Waiver Pending</span>
    </div>
  );
}

function IntakeResponsesSection({
  clientId,
}: {
  clientId: number;
}) {
  const { data: responses = [], isLoading: loadingResponses } = useQuery<IntakeResponse[]>({
    queryKey: ["/api/intake-responses", clientId],
    queryFn: () =>
      apiRequest("GET", `/api/intake-responses/${clientId}`).then((r) => r.json()),
    enabled: !!clientId,
  });

  const { data: questions = [], isLoading: loadingQuestions } = useQuery<IntakeQuestion[]>({
    queryKey: ["/api/intake-questions"],
    queryFn: () => apiRequest("GET", `/api/intake-questions`).then((r) => r.json()),
  });

  const isLoading = loadingResponses || loadingQuestions;

  const sortedQuestions = [...questions]
    .filter((q) => q.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const responseMap = new Map(responses.map((r) => [r.questionId, r]));

  return (
    <Card className="rounded-2xl" data-testid="card-intake-responses">
      <CardHeader className="pb-3">
        <CardTitle
          className="text-sm font-semibold flex items-center gap-2"
          style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
        >
          <ClipboardList className="w-4 h-4 text-amber-500" />
          Intake Form
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : responses.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-4 text-center" data-testid="text-intake-empty">
            <ClipboardList className="w-8 h-8 text-muted-foreground/30 mb-1" />
            <p className="text-sm font-medium text-muted-foreground">No intake form completed</p>
            <p className="text-xs text-muted-foreground/70">
              This client hasn't submitted their intake form yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4" data-testid="list-intake-responses">
            {sortedQuestions.map((q) => {
              const response = responseMap.get(q.id);
              if (!response) return null;
              return (
                <div key={q.id} className="space-y-1" data-testid={`intake-item-${q.id}`}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {q.question}
                  </p>
                  <p className="text-sm text-foreground">
                    {response.answer ?? (
                      <span className="text-muted-foreground italic">No answer provided</span>
                    )}
                  </p>
                </div>
              );
            })}
            {responses.length > 0 && sortedQuestions.length > 0 && (
              <p className="text-xs text-muted-foreground pt-1">
                Submitted {formatDate(responses[0]?.submittedAt)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MessageHistorySection({ clientId }: { clientId: number }) {
  const { data: messages = [], isLoading } = useQuery<MessageLog[]>({
    queryKey: ["/api/message-logs/client", clientId],
    queryFn: () =>
      apiRequest("GET", `/api/message-logs/client/${clientId}`).then((r) => r.json()),
    enabled: !!clientId,
  });

  const sorted = [...messages].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  );

  return (
    <Card className="rounded-2xl" data-testid="card-message-history">
      <CardHeader className="pb-3">
        <CardTitle
          className="text-sm font-semibold flex items-center gap-2"
          style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
        >
          <MessageSquare className="w-4 h-4 text-amber-500" />
          Message History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-4 py-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div
            className="flex flex-col items-center gap-1 py-6 text-center px-4"
            data-testid="text-messages-empty"
          >
            <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-1" />
            <p className="text-sm font-medium text-muted-foreground">No messages sent yet</p>
            <p className="text-xs text-muted-foreground/70">
              Messages and notifications to this client will appear here.
            </p>
          </div>
        ) : (
          <div className="relative" data-testid="list-message-history">
            {/* Timeline line */}
            <div className="absolute left-[28px] top-0 bottom-0 w-px bg-border/60 pointer-events-none" />
            <div className="divide-y">
              {sorted.map((msg) => (
                <div
                  key={msg.id}
                  className="flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                  data-testid={`message-item-${msg.id}`}
                >
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mt-0.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${messageTypeColors[msg.type] ?? "bg-gray-100 text-gray-600"}`}
                        data-testid={`badge-msg-type-${msg.id}`}
                      >
                        {humanizeType(msg.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">{msg.channel}</span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {formatDateTime(msg.sentAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{msg.body}</p>
                    {msg.status && (
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                        Status: {msg.status}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewRequestButton({ appointmentId }: { appointmentId: number }) {
  const { toast } = useToast();

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/review-request/${appointmentId}`).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "Review request sent" });
      queryClient.invalidateQueries({ queryKey: ["/api/message-logs"] });
    },
    onError: () => {
      toast({
        title: "Failed to send review request",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-xs h-7 gap-1 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/20"
      onClick={() => mutate()}
      disabled={isPending}
      data-testid={`button-review-request-${appointmentId}`}
    >
      <Star className="w-3 h-3" />
      {isPending ? "Sending…" : "Request Review"}
    </Button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const [, params] = useRoute("/clients/:id");
  const id = Number(params?.id);

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ["/api/clients", id],
    queryFn: () => apiRequest("GET", `/api/clients/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", "client", id],
    queryFn: () =>
      apiRequest("GET", `/api/appointments?clientId=${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: sessions = [] } = useQuery<SessionRecord[]>({
    queryKey: ["/api/sessions/client", id],
    queryFn: () =>
      apiRequest("GET", `/api/sessions/client/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: clientPackages = [] } = useQuery<ClientPackage[]>({
    queryKey: ["/api/client-packages", id],
    queryFn: () =>
      apiRequest("GET", `/api/client-packages?clientId=${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Client not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <Link href="/clients">
          <Button size="icon" variant="ghost" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            data-testid="text-client-name"
          >
            {client.firstName} {client.lastName}
          </h1>
          <p className="text-xs text-muted-foreground" data-testid="text-client-since">
            Client since {formatDate(client.createdAt)}
          </p>
        </div>
        {/* Waiver status — floated to the right of the header */}
        <div className="shrink-0 mt-0.5">
          <WaiverBadge client={client} />
        </div>
      </div>

      {/* ── Contact + Preferences ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-2xl" data-testid="card-contact">
          <CardHeader className="pb-3">
            <CardTitle
              className="text-sm font-semibold"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span data-testid="text-client-phone">{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span data-testid="text-client-email">{client.email}</span>
              </div>
            )}
            {client.skinType && (
              <div className="flex items-center gap-2 text-sm">
                <Droplets className="w-3.5 h-3.5 text-muted-foreground" />
                <span data-testid="text-client-skin-type">{client.skinType}</span>
              </div>
            )}
            {client.allergies && (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span data-testid="text-client-allergies">{client.allergies}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl" data-testid="card-preferences">
          <CardHeader className="pb-3">
            <CardTitle
              className="text-sm font-semibold"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.preferredFormula && (
              <div className="flex items-center gap-2 text-sm">
                <Droplets className="w-3.5 h-3.5 text-muted-foreground" />
                <span data-testid="text-client-formula">Formula: {client.preferredFormula}</span>
              </div>
            )}
            {client.notes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                <span data-testid="text-client-notes">{client.notes}</span>
              </div>
            )}
            {!client.preferredFormula && !client.notes && (
              <p className="text-xs text-muted-foreground">No preferences recorded yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Intake Responses (NEW) ─────────────────────────────────────────── */}
      <IntakeResponsesSection clientId={id} />

      {/* ── Active Packages ────────────────────────────────────────────────── */}
      {clientPackages.length > 0 && (
        <Card className="rounded-2xl" data-testid="card-packages">
          <CardHeader className="pb-3">
            <CardTitle
              className="text-sm font-semibold flex items-center gap-2"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              <Package className="w-4 h-4 text-amber-500" /> Active Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clientPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-center justify-between text-sm"
                  data-testid={`package-item-${pkg.id}`}
                >
                  <span>
                    <span className="font-medium">{pkg.sessionsRemaining}</span> sessions remaining
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Expires {formatDate(pkg.expiryDate)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {pkg.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Session History ────────────────────────────────────────────────── */}
      <Card className="rounded-2xl" data-testid="card-sessions">
        <CardHeader className="pb-3">
          <CardTitle
            className="text-sm font-semibold"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            Session History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground" data-testid="text-sessions-empty">
              No session records yet
            </p>
          ) : (
            <div className="space-y-3" data-testid="list-sessions">
              {sessions.map((s) => (
                <div key={s.id} className="border-b last:border-0 pb-3 last:pb-0" data-testid={`session-item-${s.id}`}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{formatDate(s.createdAt)}</span>
                    {s.shade && (
                      <Badge variant="secondary" className="text-xs">
                        {s.shade}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {s.formula && <p>Formula: {s.formula}</p>}
                    {s.rinseTime && <p>Rinse time: {s.rinseTime} hours</p>}
                    {s.sessionNotes && <p>{s.sessionNotes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Appointments ───────────────────────────────────────────────────── */}
      <Card className="rounded-2xl" data-testid="card-appointments">
        <CardHeader className="pb-3">
          <CardTitle
            className="text-sm font-semibold"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            Appointments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {appointments.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4" data-testid="text-appointments-empty">
              No appointments
            </p>
          ) : (
            <div className="divide-y" data-testid="list-appointments">
              {appointments.map((appt) => {
                const svc = services.find((s) => s.id === appt.serviceId);
                const isCompleted = appt.status === "completed";
                return (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between gap-2 px-4 py-3"
                    data-testid={`appointment-item-${appt.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm">
                          {appt.date} at {appt.time}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{svc?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${statusColors[appt.status] ?? ""}`}
                        data-testid={`badge-appt-status-${appt.id}`}
                      >
                        {isCompleted && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {appt.status.replace(/_/g, " ")}
                      </Badge>
                      {isCompleted && <ReviewRequestButton appointmentId={appt.id} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Message History (NEW) ─────────────────────────────────────────── */}
      <MessageHistorySection clientId={id} />
    </div>
  );
}
