import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, User, CheckCircle, AlertTriangle, Upload } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Client } from "@shared/schema";

const skinTypes = ["Type I", "Type II", "Type III", "Type IV", "Type V", "Type VI"];

// Maps common CSV column header variations to our field names
const COLUMN_MAP: Record<string, string> = {
  "first name": "firstName", firstname: "firstName", "first_name": "firstName",
  "last name": "lastName", lastname: "lastName", "last_name": "lastName",
  phone: "phone", "phone number": "phone", mobile: "phone", cell: "phone",
  email: "email", "email address": "email",
  "skin type": "skinType", skintype: "skinType", skin: "skinType",
  allergies: "allergies", sensitivities: "allergies",
  notes: "notes", note: "notes", comments: "notes",
  formula: "preferredFormula", "preferred formula": "preferredFormula",
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
  const mapped = headers.map(h => COLUMN_MAP[h] ?? h);
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) ?? line.split(",");
    const row: Record<string, string> = {};
    mapped.forEach((key, i) => {
      row[key] = (vals[i] ?? "").replace(/^"|"$/g, "").trim();
    });
    return row;
  }).filter(row => row.firstName || row.lastName);
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/clients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setOpen(false);
      toast({ title: "Client added" });
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target?.result as string);
      setPreview(rows);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!preview.length) return;
    setImporting(true);
    try {
      const res = await apiRequest("POST", "/api/clients/import", { rows: preview });
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: `Imported ${result.imported} client${result.imported !== 1 ? "s" : ""}`,
        description: result.skipped > 0 ? `${result.skipped} row${result.skipped !== 1 ? "s" : ""} skipped` : undefined,
      });
      setImportOpen(false);
      setPreview([]);
    } catch {
      toast({ title: "Import failed", description: "Check your CSV and try again.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      firstName: fd.get("firstName") as string,
      lastName: fd.get("lastName") as string,
      email: (fd.get("email") as string) || null,
      phone: (fd.get("phone") as string) || null,
      skinType: (fd.get("skinType") as string) || null,
      allergies: (fd.get("allergies") as string) || null,
      notes: (fd.get("notes") as string) || null,
      preferredFormula: null,
      createdAt: new Date().toISOString().split("T")[0],
    });
  };

  const filtered = clients.filter((c) => {
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Clients
        </h1>
        <div className="flex gap-2">
          {/* Import CSV */}
          <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) setPreview([]); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Upload className="w-4 h-4 mr-1" /> Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Import Clients from CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Your CSV should have columns like <span className="font-mono bg-muted px-1 rounded">First Name</span>, <span className="font-mono bg-muted px-1 rounded">Last Name</span>, <span className="font-mono bg-muted px-1 rounded">Phone</span>, <span className="font-mono bg-muted px-1 rounded">Email</span>. Column names are flexible.
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-input file:text-xs file:font-medium file:bg-background hover:file:bg-muted cursor-pointer"
                />
                {preview.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{preview.length} client{preview.length !== 1 ? "s" : ""} ready to import — preview:</p>
                    <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                      {preview.slice(0, 5).map((row, i) => (
                        <div key={i} className="px-3 py-2 text-xs">
                          <span className="font-medium">{row.firstName} {row.lastName}</span>
                          {row.phone && <span className="text-muted-foreground ml-2">{row.phone}</span>}
                          {row.email && <span className="text-muted-foreground ml-2">{row.email}</span>}
                        </div>
                      ))}
                      {preview.length > 5 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">+ {preview.length - 5} more</div>
                      )}
                    </div>
                    <Button className="w-full" onClick={handleImport} disabled={importing}>
                      {importing ? "Importing..." : `Import ${preview.length} Client${preview.length !== 1 ? "s" : ""}`}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-new-client">
                <Plus className="w-4 h-4 mr-1" /> New Client
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Client</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input name="firstName" required data-testid="input-first-name" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input name="lastName" required data-testid="input-last-name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input name="email" type="email" data-testid="input-email" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input name="phone" data-testid="input-phone" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Skin Type</Label>
                <Select name="skinType">
                  <SelectTrigger data-testid="select-skin-type">
                    <SelectValue placeholder="Select skin type" />
                  </SelectTrigger>
                  <SelectContent>
                    {skinTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Allergies / Sensitivities</Label>
                <Input name="allergies" data-testid="input-allergies" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea name="notes" data-testid="input-client-notes" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-client">
                {createMutation.isPending ? "Adding..." : "Add Client"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-clients"
        />
      </div>

      <div className="space-y-1.5">
        {isLoading ? (
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-4"><div className="h-10 bg-muted/30 rounded animate-pulse" /></CardContent></Card>)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {search ? "No clients match your search" : "No clients yet"}
              </p>
              {!search && <p className="text-xs text-muted-foreground/60 mt-1">Add your first client to get started</p>}
            </CardContent>
          </Card>
        ) : (
          filtered.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="cursor-pointer hover:bg-muted/20 transition-colors" data-testid={`card-client-${client.id}`}>
                <CardContent className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{client.firstName} {client.lastName}</p>
                        {client.waiverSigned && client.intakeCompleted && (
                          <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                        )}
                        {(!client.waiverSigned || !client.intakeCompleted) && (
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {[client.phone, client.email, client.skinType].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {client.preferredFormula && (
                        <span className="text-[11px] text-muted-foreground">{client.preferredFormula}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
