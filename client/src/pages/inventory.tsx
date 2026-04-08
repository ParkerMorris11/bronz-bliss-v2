import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle, Package, Minus, Edit } from "lucide-react";
import { useState } from "react";
import type { InventoryItem } from "@shared/schema";

// ─── Category Badge ──────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    solution: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    product: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    supply: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };
  const className = styles[category] ?? styles.supply;
  return (
    <Badge variant="outline" className={`capitalize text-xs ${className}`}>
      {category}
    </Badge>
  );
}

// ─── Stock Cell ───────────────────────────────────────────────────────────────

function StockCell({ item }: { item: InventoryItem }) {
  const isLow = item.currentStock <= item.reorderLevel;
  const isCritical = item.currentStock === 0;
  const colorClass = isCritical
    ? "text-red-400 font-semibold"
    : isLow
    ? "text-amber-400 font-semibold"
    : "text-foreground";
  return (
    <span className={colorClass} data-testid={`stock-value-${item.id}`}>
      {item.currentStock} <span className="text-muted-foreground text-xs font-normal">{item.unit}</span>
    </span>
  );
}

// ─── Item Form ────────────────────────────────────────────────────────────────

interface ItemFormData {
  name: string;
  category: string;
  brand: string;
  currentStock: string;
  unit: string;
  reorderLevel: string;
  costPerUnit: string;
  notes: string;
}

const emptyForm: ItemFormData = {
  name: "",
  category: "supply",
  brand: "",
  currentStock: "",
  unit: "",
  reorderLevel: "",
  costPerUnit: "",
  notes: "",
};

function itemToForm(item: InventoryItem): ItemFormData {
  return {
    name: item.name,
    category: item.category,
    brand: item.brand ?? "",
    currentStock: String(item.currentStock),
    unit: item.unit,
    reorderLevel: String(item.reorderLevel),
    costPerUnit: item.costPerUnit != null ? String(item.costPerUnit) : "",
    notes: item.notes ?? "",
  };
}

interface ItemDialogProps {
  mode: "add" | "edit";
  item?: InventoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ItemDialog({ mode, item, open, onOpenChange }: ItemDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<ItemFormData>(
    mode === "edit" && item ? itemToForm(item) : emptyForm
  );

  // Reset when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) setForm(mode === "edit" && item ? itemToForm(item) : emptyForm);
    onOpenChange(v);
  };

  const mutation = useMutation({
    mutationFn: async (data: ItemFormData) => {
      const payload = {
        name: data.name.trim(),
        category: data.category,
        brand: data.brand.trim() || null,
        currentStock: Number(data.currentStock),
        unit: data.unit.trim(),
        reorderLevel: Number(data.reorderLevel),
        costPerUnit: data.costPerUnit !== "" ? Number(data.costPerUnit) : null,
        notes: data.notes.trim() || null,
      };
      if (mode === "add") {
        return apiRequest("POST", "/api/inventory", payload);
      } else {
        return apiRequest("PATCH", `/api/inventory/${item!.id}`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      toast({
        title: mode === "add" ? "Item added" : "Item updated",
        description:
          mode === "add"
            ? `${form.name} has been added to inventory.`
            : `${form.name} has been updated.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${mode === "add" ? "add" : "update"} item.`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.unit.trim()) {
      toast({ title: "Missing fields", description: "Name and unit are required.", variant: "destructive" });
      return;
    }
    mutation.mutate(form);
  };

  const set = (field: keyof ItemFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            {mode === "add" ? "Add Inventory Item" : "Edit Inventory Item"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              data-testid="input-item-name"
              placeholder="e.g. Dark Bronzer Solution"
              value={form.name}
              onChange={set("name")}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="item-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger id="item-category" data-testid="select-item-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solution">Solution</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="supply">Supply</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Brand */}
            <div className="space-y-1.5">
              <Label htmlFor="item-brand">Brand</Label>
              <Input
                id="item-brand"
                data-testid="input-item-brand"
                placeholder="e.g. Norvell"
                value={form.brand}
                onChange={set("brand")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Current Stock */}
            <div className="space-y-1.5">
              <Label htmlFor="item-stock">Stock</Label>
              <Input
                id="item-stock"
                data-testid="input-item-stock"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.currentStock}
                onChange={set("currentStock")}
                required
              />
            </div>

            {/* Unit */}
            <div className="space-y-1.5">
              <Label htmlFor="item-unit">Unit</Label>
              <Input
                id="item-unit"
                data-testid="input-item-unit"
                placeholder="e.g. oz, ml"
                value={form.unit}
                onChange={set("unit")}
                required
              />
            </div>

            {/* Reorder Level */}
            <div className="space-y-1.5">
              <Label htmlFor="item-reorder">Reorder At</Label>
              <Input
                id="item-reorder"
                data-testid="input-item-reorder"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.reorderLevel}
                onChange={set("reorderLevel")}
                required
              />
            </div>
          </div>

          {/* Cost per Unit */}
          <div className="space-y-1.5">
            <Label htmlFor="item-cost">Cost / Unit ($)</Label>
            <Input
              id="item-cost"
              data-testid="input-item-cost"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.costPerUnit}
              onChange={set("costPerUnit")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="item-notes">Notes</Label>
            <Textarea
              id="item-notes"
              data-testid="input-item-notes"
              placeholder="Optional notes..."
              value={form.notes}
              onChange={set("notes")}
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              data-testid="button-cancel-item"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="button-save-item"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving…" : mode === "add" ? "Add Item" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Log Usage Dialog ─────────────────────────────────────────────────────────

interface LogUsageDialogProps {
  item: InventoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function LogUsageDialog({ item, open, onOpenChange }: LogUsageDialogProps) {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState("");
  const [sessionRef, setSessionRef] = useState("");

  const handleOpenChange = (v: boolean) => {
    if (v) { setQuantity(""); setSessionRef(""); }
    onOpenChange(v);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/inventory-usage", {
        itemId: item.id,
        quantity: Number(quantity),
        sessionReference: sessionRef.trim() || null,
        usedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      toast({
        title: "Usage logged",
        description: `Used ${quantity} ${item.unit} of ${item.name}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log usage.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!quantity || qty <= 0) {
      toast({ title: "Invalid quantity", description: "Enter a quantity greater than 0.", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Log Usage — {item.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="usage-quantity">
              Quantity Used <span className="text-muted-foreground text-xs">({item.unit})</span>
            </Label>
            <Input
              id="usage-quantity"
              data-testid="input-usage-quantity"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Current stock: {item.currentStock} {item.unit}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="usage-session">Session Reference <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="usage-session"
              data-testid="input-usage-session"
              placeholder="e.g. booking #1234"
              value={sessionRef}
              onChange={(e) => setSessionRef(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              data-testid="button-cancel-usage"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="button-log-usage"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Logging…" : "Log Usage"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Skeleton Rows ────────────────────────────────────────────────────────────

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-8 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [usageItem, setUsageItem] = useState<InventoryItem | null>(null);

  const {
    data: inventory,
    isLoading,
    isError,
  } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: lowStockItems } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/low-stock"],
  });

  const hasLowStock = lowStockItems && lowStockItems.length > 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400">
            <Package className="w-5 h-5" />
          </div>
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            Inventory
          </h1>
        </div>
        <Button
          data-testid="button-add-item"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Item
        </Button>
      </div>

      {/* ── Low Stock Alert Banner ── */}
      {hasLowStock && (
        <div
          className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/25 px-4 py-3"
          data-testid="banner-low-stock"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-400">
              {lowStockItems!.length} {lowStockItems!.length === 1 ? "item" : "items"} below reorder level
            </p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              {lowStockItems!.map((i) => i.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* ── Inventory Table ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle
            className="text-base font-semibold"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            All Items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-8">
              <Package className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">Failed to load inventory</p>
              <p className="text-xs text-muted-foreground mt-1">
                Check your connection and try refreshing.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Reorder At</TableHead>
                  <TableHead>Cost / Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeletonRows />
                ) : !inventory || inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium">No inventory items yet</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">
                          Add your first item to start tracking stock.
                        </p>
                        <Button
                          size="sm"
                          data-testid="button-add-first-item"
                          onClick={() => setAddOpen(true)}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          Add Item
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item) => {
                    const isLow = item.currentStock <= item.reorderLevel;
                    return (
                      <TableRow
                        key={item.id}
                        data-testid={`row-inventory-${item.id}`}
                        className="cursor-pointer"
                        onClick={() => setEditItem(item)}
                      >
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell>
                          <CategoryBadge category={item.category} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.brand ?? <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell>
                          <StockCell item={item} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.reorderLevel} <span className="text-xs">{item.unit}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.costPerUnit != null
                            ? `$${Number(item.costPerUnit).toFixed(2)}`
                            : <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell>
                          {item.isActive ? (
                            isLow ? (
                              <Badge
                                variant="outline"
                                className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/25"
                                data-testid={`status-${item.id}`}
                              >
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                data-testid={`status-${item.id}`}
                              >
                                In Stock
                              </Badge>
                            )
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs bg-zinc-500/10 text-zinc-400 border-zinc-500/25"
                              data-testid={`status-${item.id}`}
                            >
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              data-testid={`button-edit-${item.id}`}
                              onClick={() => setEditItem(item)}
                              title="Edit item"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`button-log-usage-${item.id}`}
                              onClick={() => setUsageItem(item)}
                              className="text-xs gap-1"
                            >
                              <Minus className="w-3 h-3" />
                              Use
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Add Dialog ── */}
      <ItemDialog
        mode="add"
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      {/* ── Edit Dialog ── */}
      {editItem && (
        <ItemDialog
          mode="edit"
          item={editItem}
          open={!!editItem}
          onOpenChange={(v) => { if (!v) setEditItem(null); }}
        />
      )}

      {/* ── Log Usage Dialog ── */}
      {usageItem && (
        <LogUsageDialog
          item={usageItem}
          open={!!usageItem}
          onOpenChange={(v) => { if (!v) setUsageItem(null); }}
        />
      )}
    </div>
  );
}
