import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, FileText, ClipboardCheck, Edit } from "lucide-react";
import { useState } from "react";
import type { IntakeQuestion, WaiverTemplate } from "@shared/schema";

// ─── Form Builder ────────────────────────────────────────────────────────────

type QuestionType = "text" | "select" | "checkbox" | "textarea";

interface QuestionFormState {
  question: string;
  type: QuestionType;
  options: string; // comma-separated raw string
  required: boolean;
  sortOrder: string;
}

const emptyQuestionForm = (): QuestionFormState => ({
  question: "",
  type: "text",
  options: "",
  required: false,
  sortOrder: "0",
});

function optionsFromForm(form: QuestionFormState): string | null {
  if (form.type !== "select" && form.type !== "checkbox") return null;
  const opts = form.options
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return opts.length > 0 ? JSON.stringify(opts) : null;
}

function optionsToDisplay(raw: string | null): string {
  if (!raw) return "";
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.join(", ");
  } catch {}
  return raw;
}

function QuestionFormFields({
  form,
  onChange,
}: {
  form: QuestionFormState;
  onChange: (updated: Partial<QuestionFormState>) => void;
}) {
  const needsOptions = form.type === "select" || form.type === "checkbox";
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="q-question">Question</Label>
        <Input
          id="q-question"
          data-testid="input-question-text"
          placeholder="e.g. Do you have any skin conditions?"
          value={form.question}
          onChange={(e) => onChange({ question: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="q-type">Type</Label>
        <Select
          value={form.type}
          onValueChange={(v) => onChange({ type: v as QuestionType, options: "" })}
        >
          <SelectTrigger id="q-type" data-testid="select-question-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="textarea">Textarea</SelectItem>
            <SelectItem value="select">Select (dropdown)</SelectItem>
            <SelectItem value="checkbox">Checkbox</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {needsOptions && (
        <div className="space-y-1.5">
          <Label htmlFor="q-options">Options <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
          <Input
            id="q-options"
            data-testid="input-question-options"
            placeholder="Option 1, Option 2, Option 3"
            value={form.options}
            onChange={(e) => onChange({ options: e.target.value })}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="q-sort-order">Sort Order</Label>
        <Input
          id="q-sort-order"
          data-testid="input-question-sort-order"
          type="number"
          min={0}
          value={form.sortOrder}
          onChange={(e) => onChange({ sortOrder: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="q-required"
          data-testid="switch-question-required"
          checked={form.required}
          onCheckedChange={(v) => onChange({ required: v })}
        />
        <Label htmlFor="q-required">Required</Label>
      </div>
    </div>
  );
}

function AddQuestionDialog({ onAdded }: { onAdded: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<QuestionFormState>(emptyQuestionForm());

  const mutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/intake-questions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intake-questions"] });
      toast({ title: "Question added" });
      setOpen(false);
      setForm(emptyQuestionForm());
      onAdded();
    },
    onError: () => {
      toast({ title: "Failed to add question", variant: "destructive" });
    },
  });

  function handleSubmit() {
    if (!form.question.trim()) {
      toast({ title: "Question text is required", variant: "destructive" });
      return;
    }
    mutation.mutate({
      question: form.question.trim(),
      type: form.type,
      options: optionsFromForm(form),
      required: form.required,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
      isActive: true,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-question">
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Add Intake Question
          </DialogTitle>
        </DialogHeader>
        <QuestionFormFields
          form={form}
          onChange={(updated) => setForm((prev) => ({ ...prev, ...updated }))}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" data-testid="button-cancel-add-question" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            data-testid="button-submit-add-question"
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Adding…" : "Add Question"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditQuestionDialog({
  question,
  onClose,
}: {
  question: IntakeQuestion;
  onClose: () => void;
}) {
  const { toast } = useToast();

  function initialForm(): QuestionFormState {
    const needsOptions = question.type === "select" || question.type === "checkbox";
    return {
      question: question.question,
      type: question.type as QuestionType,
      options: needsOptions ? optionsToDisplay(question.options) : "",
      required: question.required,
      sortOrder: String(question.sortOrder),
    };
  }

  const [form, setForm] = useState<QuestionFormState>(initialForm);

  const mutation = useMutation({
    mutationFn: (data: object) =>
      apiRequest("PATCH", `/api/intake-questions/${question.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intake-questions"] });
      toast({ title: "Question updated" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to update question", variant: "destructive" });
    },
  });

  function handleSubmit() {
    if (!form.question.trim()) {
      toast({ title: "Question text is required", variant: "destructive" });
      return;
    }
    mutation.mutate({
      question: form.question.trim(),
      type: form.type,
      options: optionsFromForm(form),
      required: form.required,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
    });
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Edit Question
        </DialogTitle>
      </DialogHeader>
      <QuestionFormFields
        form={form}
        onChange={(updated) => setForm((prev) => ({ ...prev, ...updated }))}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" data-testid="button-cancel-edit-question" onClick={onClose}>
          Cancel
        </Button>
        <Button
          data-testid="button-submit-edit-question"
          onClick={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </DialogContent>
  );
}

function QuestionCard({ question }: { question: IntakeQuestion }) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/intake-questions/${question.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intake-questions"] });
      toast({ title: "Question deleted" });
      setDeleteConfirmOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to delete question", variant: "destructive" });
    },
  });

  const typeColorMap: Record<string, string> = {
    text: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    textarea: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    select: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    checkbox: "bg-green-500/15 text-green-400 border-green-500/20",
  };

  const typeClass = typeColorMap[question.type] ?? "bg-muted text-muted-foreground";

  return (
    <Card
      data-testid={`card-question-${question.id}`}
      className="group"
    >
      <CardContent className="flex items-start gap-3 py-4 px-4">
        {/* Drag handle — visual only */}
        <div className="flex-shrink-0 mt-0.5 text-muted-foreground/40 cursor-grab">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Question content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-medium leading-snug">{question.question}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${typeClass}`}
            >
              {question.type}
            </span>
            {question.required && (
              <Badge variant="secondary" className="text-xs">
                Required
              </Badge>
            )}
            {!question.isActive && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Inactive
              </Badge>
            )}
            {question.options && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {optionsToDisplay(question.options)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" data-testid={`button-edit-question-${question.id}`}>
                <Edit className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <EditQuestionDialog question={question} onClose={() => setEditOpen(false)} />
          </Dialog>

          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                data-testid={`button-delete-question-${question.id}`}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Delete Question?
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                This will permanently remove the question from your intake form.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  data-testid={`button-cancel-delete-question-${question.id}`}
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  data-testid={`button-confirm-delete-question-${question.id}`}
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

function FormBuilderTab() {
  const { data: questions, isLoading } = useQuery<IntakeQuestion[]>({
    queryKey: ["/api/intake-questions"],
  });

  const sorted = questions
    ? [...questions].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-semibold"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            Intake Questions
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Questions shown to clients before their appointment
          </p>
        </div>
        <AddQuestionDialog onAdded={() => {}} />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <ClipboardCheck className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No intake questions yet. Add your first question to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      )}

      {sorted.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {sorted.length} question{sorted.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

// ─── Waiver Template ─────────────────────────────────────────────────────────

interface WaiverFormState {
  title: string;
  content: string;
}

function WaiverTab() {
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery<WaiverTemplate[]>({
    queryKey: ["/api/waiver-templates"],
  });

  const activeWaiver = templates?.find((t) => t.isActive) ?? templates?.[0] ?? null;

  const [form, setForm] = useState<WaiverFormState>({ title: "", content: "" });
  const [editInitialized, setEditInitialized] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Sync form when active waiver loads/changes
  if (activeWaiver && editInitialized !== activeWaiver.id) {
    setForm({ title: activeWaiver.title, content: activeWaiver.content });
    setEditInitialized(activeWaiver.id);
  }

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/waiver-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waiver-templates"] });
      toast({ title: "Waiver template created" });
    },
    onError: () => {
      toast({ title: "Failed to create waiver", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      apiRequest("PATCH", `/api/waiver-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waiver-templates"] });
      toast({ title: "Waiver template saved" });
    },
    onError: () => {
      toast({ title: "Failed to save waiver", variant: "destructive" });
    },
  });

  function handleSave() {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!form.content.trim()) {
      toast({ title: "Content is required", variant: "destructive" });
      return;
    }
    if (activeWaiver) {
      updateMutation.mutate({
        id: activeWaiver.id,
        data: { title: form.title.trim(), content: form.content.trim() },
      });
    } else {
      createMutation.mutate({
        title: form.title.trim(),
        content: form.content.trim(),
        isActive: true,
      });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-semibold"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            {activeWaiver ? "Edit Waiver Template" : "Create Waiver Template"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Clients will be asked to sign this before their first appointment
          </p>
        </div>
        {activeWaiver && (
          <Button
            variant="outline"
            data-testid="button-preview-waiver"
            onClick={() => setPreviewOpen(true)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Preview
          </Button>
        )}
      </div>

      {/* Editor Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Template Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="waiver-title">Title</Label>
            <Input
              id="waiver-title"
              data-testid="input-waiver-title"
              placeholder="e.g. Tanning Liability Waiver"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waiver-content">Content</Label>
            <Textarea
              id="waiver-content"
              data-testid="textarea-waiver-content"
              placeholder="Enter the full waiver text here…"
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              className="min-h-[280px] resize-y text-sm leading-relaxed"
            />
          </div>
          <div className="flex justify-end">
            <Button
              data-testid="button-save-waiver"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : activeWaiver ? "Save Changes" : "Create Waiver"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {form.title || "Waiver Preview"}
            </DialogTitle>
          </DialogHeader>
          <div
            data-testid="waiver-preview-content"
            className="text-sm text-foreground leading-relaxed whitespace-pre-wrap border rounded-lg p-4 bg-muted/30 font-mono"
          >
            {form.content || (
              <span className="text-muted-foreground italic">No content yet.</span>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              data-testid="button-close-preview"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline preview when saved */}
      {activeWaiver && form.content && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              data-testid="waiver-live-preview"
              className="text-sm text-foreground leading-relaxed whitespace-pre-wrap"
            >
              {form.content}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntakePage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto w-full">
      {/* Page heading */}
      <div>
        <h1
          className="text-xl font-bold"
          style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
        >
          Intake Forms &amp; Waivers
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage client intake questions and liability waiver templates
        </p>
      </div>

      <Tabs defaultValue="form-builder" className="w-full">
        <TabsList data-testid="tabs-intake">
          <TabsTrigger value="form-builder" data-testid="tab-form-builder">
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Form Builder
          </TabsTrigger>
          <TabsTrigger value="waiver-template" data-testid="tab-waiver-template">
            <FileText className="w-4 h-4 mr-2" />
            Waiver Template
          </TabsTrigger>
        </TabsList>

        <TabsContent value="form-builder" className="mt-6">
          <FormBuilderTab />
        </TabsContent>

        <TabsContent value="waiver-template" className="mt-6">
          <WaiverTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
