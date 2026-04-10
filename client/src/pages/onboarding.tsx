import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest } from "@/lib/queryClient";
import { Sun, CheckCircle, FileText, Shield } from "lucide-react";
import { useRoute } from "wouter";
import type { IntakeQuestion, WaiverTemplate } from "@shared/schema";

// ── Types ──────────────────────────────────────────────

interface PublicSettings {
  businessName: string;
  address: string | null;
  phone: string | null;
}

type WizardStep = "intake" | "waiver" | "done";

// ── Progress Bar ────────────────────────────────────────

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "intake", label: "Intake Form" },
  { key: "waiver", label: "Waiver" },
  { key: "done", label: "Complete" },
];

function ProgressBar({ current }: { current: WizardStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  isCompleted
                    ? "bg-primary text-white shadow-sm"
                    : isActive
                    ? "bg-primary text-white shadow-md ring-4 ring-primary/20"
                    : "bg-stone-200 dark:bg-stone-700 text-muted-foreground"
                }`}
              >
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${
                  isCompleted ? "bg-primary" : "bg-stone-200 dark:bg-stone-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Intake Step ─────────────────────────────────────────

function IntakeStep({
  clientId,
  onComplete,
}: {
  clientId: number;
  onComplete: () => void;
}) {
  const { data: questions = [], isLoading } = useQuery<IntakeQuestion[]>({
    queryKey: ["/api/intake-questions"],
    queryFn: () => apiRequest("GET", "/api/intake-questions").then((r) => r.json()),
  });

  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});

  const setAnswer = (id: number, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const submitMutation = useMutation({
    mutationFn: (data: { clientId: number; responses: { questionId: number; answer: string }[] }) =>
      apiRequest("POST", "/api/intake-responses", data).then((r) => r.json()),
    onSuccess: () => onComplete(),
  });

  const activeQuestions = questions.filter((q) => q.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  const handleSubmit = () => {
    const responses = activeQuestions.map((q) => {
      const raw = answers[q.id];
      let answer = "";
      if (Array.isArray(raw)) {
        answer = JSON.stringify(raw);
      } else {
        answer = raw ?? "";
      }
      return { questionId: q.id, answer };
    });
    submitMutation.mutate({ clientId, responses });
  };

  const isValid = activeQuestions
    .filter((q) => q.required)
    .every((q) => {
      const val = answers[q.id];
      if (Array.isArray(val)) return val.length > 0;
      return !!val && val.toString().trim().length > 0;
    });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-1/3 rounded bg-stone-200 dark:bg-stone-700 animate-pulse" />
            <div className="h-10 rounded-lg bg-stone-200 dark:bg-stone-700 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Intake Form
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Please answer a few questions before your first visit.
        </p>
      </div>

      {activeQuestions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No intake questions to answer. Continue to the next step.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {activeQuestions.map((q) => {
            let parsedOptions: string[] = [];
            try {
              if (q.options) parsedOptions = JSON.parse(q.options);
            } catch {
              parsedOptions = [];
            }

            return (
              <div key={q.id} className="space-y-2">
                <Label className="text-sm font-medium flex items-start gap-0.5">
                  {q.question}
                  {q.required && <span className="text-red-500 ml-0.5">*</span>}
                </Label>

                {q.type === "text" && (
                  <Input
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Your answer..."
                    data-testid={`input-question-${q.id}`}
                  />
                )}

                {q.type === "textarea" && (
                  <Textarea
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Your answer..."
                    rows={3}
                    data-testid={`textarea-question-${q.id}`}
                  />
                )}

                {q.type === "select" && parsedOptions.length > 0 && (
                  <RadioGroup
                    value={(answers[q.id] as string) ?? ""}
                    onValueChange={(val) => setAnswer(q.id, val)}
                    data-testid={`radio-group-question-${q.id}`}
                  >
                    <div className="space-y-2">
                      {parsedOptions.map((opt) => (
                        <div key={opt} className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={opt}
                            id={`q${q.id}-opt-${opt}`}
                            data-testid={`radio-question-${q.id}-${opt}`}
                          />
                          <Label
                            htmlFor={`q${q.id}-opt-${opt}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                )}

                {q.type === "checkbox" && parsedOptions.length > 0 && (
                  <div className="space-y-2" data-testid={`checkbox-group-question-${q.id}`}>
                    {parsedOptions.map((opt) => {
                      const selected = (answers[q.id] as string[]) ?? [];
                      const checked = selected.includes(opt);
                      return (
                        <div key={opt} className="flex items-center space-x-2">
                          <Checkbox
                            id={`q${q.id}-check-${opt}`}
                            checked={checked}
                            onCheckedChange={(val) => {
                              const current = (answers[q.id] as string[]) ?? [];
                              if (val) {
                                setAnswer(q.id, [...current, opt]);
                              } else {
                                setAnswer(q.id, current.filter((v) => v !== opt));
                              }
                            }}
                            data-testid={`checkbox-question-${q.id}-${opt}`}
                          />
                          <Label
                            htmlFor={`q${q.id}-check-${opt}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {opt}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {submitMutation.isError && (
        <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={!isValid || submitMutation.isPending}
        onClick={handleSubmit}
        data-testid="button-continue-intake"
      >
        {submitMutation.isPending ? "Saving..." : "Continue"}
      </Button>
    </div>
  );
}

// ── Waiver Step ─────────────────────────────────────────

function WaiverStep({
  clientId,
  onComplete,
}: {
  clientId: number;
  onComplete: () => void;
}) {
  const { data: waiver, isLoading } = useQuery<WaiverTemplate | null>({
    queryKey: ["/api/waiver-templates/active"],
    queryFn: () =>
      apiRequest("GET", "/api/waiver-templates/active")
        .then((r) => r.json())
        .catch(() => null),
  });

  const [agreed, setAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState("");

  const signMutation = useMutation({
    mutationFn: (data: { signatureName: string }) =>
      apiRequest("POST", `/api/public/sign-waiver/${clientId}`, data).then((r) => r.json()),
    onSuccess: () => onComplete(),
  });

  const handleSign = () => {
    if (!agreed || !signatureName.trim()) return;
    signMutation.mutate({ signatureName: signatureName.trim() });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-1/2 rounded bg-stone-200 dark:bg-stone-700 animate-pulse" />
        <div className="h-48 rounded-xl bg-stone-200 dark:bg-stone-700 animate-pulse" />
        <div className="h-10 rounded-lg bg-stone-200 dark:bg-stone-700 animate-pulse" />
      </div>
    );
  }

  if (!waiver) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Waiver
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">No waiver is currently required. You're all set!</p>
        </div>
        <Button className="w-full" size="lg" onClick={onComplete} data-testid="button-skip-waiver">
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            {waiver.title}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">Please read and sign the waiver below.</p>
      </div>

      {/* Waiver content */}
      <div
        className="rounded-xl border bg-white dark:bg-stone-900 p-4 max-h-64 overflow-y-auto space-y-3"
        data-testid="waiver-content"
      >
        {waiver.content.split(/\n{2,}/).map((para, i) => (
          <p key={i} className="text-sm text-foreground leading-relaxed">
            {para.replace(/\n/g, " ")}
          </p>
        ))}
      </div>

      {/* Agreement checkbox */}
      <div className="flex items-start space-x-3">
        <Checkbox
          id="waiver-agree"
          checked={agreed}
          onCheckedChange={(val) => setAgreed(!!val)}
          data-testid="checkbox-waiver-agree"
        />
        <Label
          htmlFor="waiver-agree"
          className="text-sm font-normal leading-snug cursor-pointer"
        >
          I have read and agree to these terms
        </Label>
      </div>

      {/* Signature name */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Full Name (Signature) <span className="text-red-500">*</span>
        </Label>
        <Input
          value={signatureName}
          onChange={(e) => setSignatureName(e.target.value)}
          placeholder="Your full legal name"
          data-testid="input-signature-name"
        />
        <p className="text-xs text-muted-foreground">
          By typing your name, you agree this serves as your electronic signature.
        </p>
      </div>

      {signMutation.isError && (
        <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={!agreed || !signatureName.trim() || signMutation.isPending}
        onClick={handleSign}
        data-testid="button-sign-complete"
      >
        {signMutation.isPending ? "Signing..." : "Sign & Complete"}
      </Button>
    </div>
  );
}

// ── Done Step ────────────────────────────────────────────

function DoneStep() {
  return (
    <div className="text-center py-10 space-y-5" data-testid="step-done">
      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto shadow-lg">
        <CheckCircle className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <h2
          className="text-xl font-bold"
          style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          data-testid="text-done-heading"
        >
          You're all set!
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          Your intake form and waiver are complete. See you at your appointment!
        </p>
      </div>
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 max-w-xs mx-auto">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
          What's next?
        </p>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          We'll reach out to confirm your appointment details. We look forward to seeing you!
        </p>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────

export default function OnboardingPage() {
  const [, params] = useRoute("/onboard/:clientId");
  const clientId = Number(params?.clientId);

  const [step, setStep] = useState<WizardStep>("intake");

  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ["/api/public/settings"],
    queryFn: () => apiRequest("GET", "/api/public/settings").then((r) => r.json()),
  });

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 border-b">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sun className="w-4 h-4 text-white" />
          </div>
          <div>
            <p
              className="text-sm font-bold leading-none"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              {settings?.businessName ?? "Bronz Bliss"}
            </p>
            {settings?.address && (
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {settings.address}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Progress bar — hidden on done */}
        {step !== "done" && <ProgressBar current={step} />}

        {/* Glassmorphism card */}
        <div className="rounded-2xl bg-white/80 dark:bg-stone-900/80 backdrop-blur border border-stone-200 dark:border-stone-700 shadow-sm p-6">
          {step === "intake" && (
            <IntakeStep
              clientId={clientId}
              onComplete={() => setStep("waiver")}
            />
          )}
          {step === "waiver" && (
            <WaiverStep
              clientId={clientId}
              onComplete={() => setStep("done")}
            />
          )}
          {step === "done" && <DoneStep />}
        </div>
      </div>
    </div>
  );
}
