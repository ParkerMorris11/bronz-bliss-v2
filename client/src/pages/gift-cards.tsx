import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Gift, CreditCard, DollarSign } from "lucide-react";
import { useState } from "react";
import type { GiftCard } from "@shared/schema";

function GiftCardVisual({ card }: { card: GiftCard }) {
  const usedPercent = card.initialAmount > 0
    ? Math.round(((card.initialAmount - card.balance) / card.initialAmount) * 100)
    : 0;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #d97706 0%, #b45309 40%, #92400e 100%)",
        borderRadius: "16px",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        minHeight: "160px",
        boxShadow: "0 8px 32px rgba(217, 119, 6, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -20,
          left: -20,
          width: 90,
          height: 90,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
        }}
      />

      {/* Branding */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div
            style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontWeight: 800,
              fontSize: "15px",
              color: "rgba(255,255,255,0.95)",
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            BRONZ BLISS
          </div>
          <div
            style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: "10px",
              color: "rgba(255,255,255,0.55)",
              letterSpacing: "0.12em",
              marginTop: 2,
            }}
          >
            GIFT CARD
          </div>
        </div>
        <Gift size={20} style={{ color: "rgba(255,255,255,0.6)" }} />
      </div>

      {/* Code */}
      <div
        style={{
          fontFamily: "'Courier New', monospace",
          fontWeight: 700,
          fontSize: "18px",
          color: "#fff",
          letterSpacing: "0.18em",
          marginBottom: 14,
          textShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      >
        {card.code}
      </div>

      {/* Balance */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: 2 }}>
            BALANCE
          </div>
          <div
            style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontWeight: 800,
              fontSize: "22px",
              color: "#fff",
              lineHeight: 1,
            }}
          >
            ${card.balance.toFixed(2)}
          </div>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
            of ${card.initialAmount.toFixed(2)}
          </div>
        </div>
        {card.expiresAt && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: 2 }}>
              EXPIRES
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
              {new Date(card.expiresAt).toLocaleDateString("en-US", { month: "2-digit", year: "2-digit" })}
            </div>
          </div>
        )}
      </div>

      {/* Shimmer line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
        }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">
        Active
      </Badge>
    );
  }
  if (status === "used") {
    return (
      <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/20">
        Used
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/20">
      Expired
    </Badge>
  );
}

function StatCard({
  icon,
  label,
  value,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  testId: string;
}) {
  return (
    <Card className="rounded-2xl border border-white/8 bg-white/5 backdrop-blur-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400">{icon}</div>
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">{label}</div>
          <div
            data-testid={testId}
            className="text-xl font-bold text-white"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateGiftCardDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    initialAmount: "",
    purchaserName: "",
    recipientName: "",
    recipientEmail: "",
    expiresAt: "",
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest("POST", "/api/gift-cards", {
        ...data,
        initialAmount: parseFloat(data.initialAmount),
        expiresAt: data.expiresAt || null,
        purchaserName: data.purchaserName || null,
        recipientName: data.recipientName || null,
        recipientEmail: data.recipientEmail || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gift-cards"] });
      toast({ title: "Gift card created", description: "The gift card has been created successfully." });
      setOpen(false);
      setForm({ initialAmount: "", purchaserName: "", recipientName: "", recipientEmail: "", expiresAt: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create gift card.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.initialAmount || isNaN(parseFloat(form.initialAmount)) || parseFloat(form.initialAmount) <= 0) {
      toast({ title: "Validation error", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          data-testid="button-create-gift-card"
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl gap-2"
        >
          <Plus size={16} />
          Create Gift Card
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border border-white/10 rounded-2xl text-white max-w-md">
        <DialogHeader>
          <DialogTitle
            className="text-xl font-bold"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            Create Gift Card
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="initialAmount" className="text-zinc-300 text-sm">
              Amount ($) <span className="text-red-400">*</span>
            </Label>
            <Input
              id="initialAmount"
              data-testid="input-initial-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="50.00"
              value={form.initialAmount}
              onChange={(e) => setForm((f) => ({ ...f, initialAmount: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purchaserName" className="text-zinc-300 text-sm">
              Purchaser Name
            </Label>
            <Input
              id="purchaserName"
              data-testid="input-purchaser-name"
              placeholder="Jane Smith"
              value={form.purchaserName}
              onChange={(e) => setForm((f) => ({ ...f, purchaserName: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipientName" className="text-zinc-300 text-sm">
              Recipient Name
            </Label>
            <Input
              id="recipientName"
              data-testid="input-recipient-name"
              placeholder="Alex Johnson"
              value={form.recipientName}
              onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipientEmail" className="text-zinc-300 text-sm">
              Recipient Email
            </Label>
            <Input
              id="recipientEmail"
              data-testid="input-recipient-email"
              type="email"
              placeholder="alex@example.com"
              value={form.recipientEmail}
              onChange={(e) => setForm((f) => ({ ...f, recipientEmail: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expiresAt" className="text-zinc-300 text-sm">
              Expiry Date (optional)
            </Label>
            <Input
              id="expiresAt"
              data-testid="input-expires-at"
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 rounded-xl [color-scheme:dark]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              data-testid="button-cancel-create"
              variant="ghost"
              className="flex-1 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="button-submit-create"
              disabled={mutation.isPending}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl"
            >
              {mutation.isPending ? "Creating..." : "Create Card"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RedeemDialog({ card, onClose }: { card: GiftCard; onClose: () => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(true);

  const usedPercent =
    card.initialAmount > 0
      ? Math.round(((card.initialAmount - card.balance) / card.initialAmount) * 100)
      : 0;

  const mutation = useMutation({
    mutationFn: (amt: number) =>
      apiRequest("POST", `/api/gift-cards/${card.id}/redeem`, { amount: amt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gift-cards"] });
      toast({ title: "Redeemed", description: `$${parseFloat(amount).toFixed(2)} redeemed from gift card.` });
      setOpen(false);
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to redeem gift card.", variant: "destructive" });
    },
  });

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: "Validation error", description: "Enter a valid amount.", variant: "destructive" });
      return;
    }
    if (amt > card.balance) {
      toast({ title: "Insufficient balance", description: "Amount exceeds remaining balance.", variant: "destructive" });
      return;
    }
    mutation.mutate(amt);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) onClose();
      }}
    >
      <DialogContent className="bg-zinc-900 border border-white/10 rounded-2xl text-white max-w-md">
        <DialogHeader>
          <DialogTitle
            className="text-xl font-bold"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            Gift Card Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <GiftCardVisual card={card} />

          <div className="grid grid-cols-2 gap-3">
            {card.purchaserName && (
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">From</div>
                <div className="text-sm text-white font-medium">{card.purchaserName}</div>
              </div>
            )}
            {card.recipientName && (
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">To</div>
                <div className="text-sm text-white font-medium">{card.recipientName}</div>
              </div>
            )}
            {card.recipientEmail && (
              <div className="bg-white/5 rounded-xl p-3 col-span-2">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Email</div>
                <div className="text-sm text-white font-medium">{card.recipientEmail}</div>
              </div>
            )}
          </div>

          <div className="bg-white/5 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Balance used</span>
              <span className="text-white font-semibold">{usedPercent}%</span>
            </div>
            <Progress value={usedPercent} className="h-1.5 bg-white/10 [&>div]:bg-amber-500" />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>${(card.initialAmount - card.balance).toFixed(2)} used</span>
              <span>${card.balance.toFixed(2)} remaining</span>
            </div>
          </div>

          {card.status === "active" && (
            <form onSubmit={handleRedeem} className="space-y-3 border-t border-white/8 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="redeemAmount" className="text-zinc-300 text-sm">
                  Redeem Amount ($)
                </Label>
                <Input
                  id="redeemAmount"
                  data-testid="input-redeem-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={card.balance}
                  placeholder={`Up to $${card.balance.toFixed(2)}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 rounded-xl"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  data-testid="button-cancel-redeem"
                  variant="ghost"
                  className="flex-1 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                  onClick={() => {
                    setOpen(false);
                    onClose();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="button-submit-redeem"
                  disabled={mutation.isPending}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl"
                >
                  {mutation.isPending ? "Redeeming..." : "Redeem"}
                </Button>
              </div>
            </form>
          )}

          {card.status !== "active" && (
            <div className="border-t border-white/8 pt-4">
              <Button
                data-testid="button-close-redeem"
                variant="ghost"
                className="w-full rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                onClick={() => {
                  setOpen(false);
                  onClose();
                }}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GiftCardCard({ card }: { card: GiftCard }) {
  const [showRedeem, setShowRedeem] = useState(false);

  const usedPercent =
    card.initialAmount > 0
      ? Math.round(((card.initialAmount - card.balance) / card.initialAmount) * 100)
      : 0;

  return (
    <>
      <Card
        data-testid={`card-gift-card-${card.id}`}
        className="rounded-2xl border border-white/8 bg-white/5 backdrop-blur-sm overflow-hidden cursor-pointer hover:border-amber-500/30 hover:bg-white/8 transition-all duration-200 group"
        onClick={() => setShowRedeem(true)}
      >
        <CardContent className="p-0">
          <div className="p-4">
            <GiftCardVisual card={card} />
          </div>

          <div className="px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <StatusBadge status={card.status} />
              {card.expiresAt && (
                <span className="text-xs text-zinc-500">
                  Exp {new Date(card.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Balance remaining</span>
                <span className="text-zinc-400 font-medium">{100 - usedPercent}%</span>
              </div>
              <Progress value={100 - usedPercent} className="h-1.5 bg-white/10 [&>div]:bg-amber-500" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {card.purchaserName && (
                <div>
                  <div className="text-zinc-600 mb-0.5">From</div>
                  <div className="text-zinc-300 font-medium truncate">{card.purchaserName}</div>
                </div>
              )}
              {card.recipientName && (
                <div>
                  <div className="text-zinc-600 mb-0.5">To</div>
                  <div className="text-zinc-300 font-medium truncate">{card.recipientName}</div>
                </div>
              )}
            </div>

            <div className="text-xs text-zinc-600">
              Created {new Date(card.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </CardContent>
      </Card>

      {showRedeem && <RedeemDialog card={card} onClose={() => setShowRedeem(false)} />}
    </>
  );
}

function GiftCardSkeletonCard() {
  return (
    <Card className="rounded-2xl border border-white/8 bg-white/5">
      <CardContent className="p-4 space-y-4">
        <Skeleton className="h-40 rounded-xl bg-white/8" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded bg-white/8" />
          <Skeleton className="h-2 rounded bg-white/8" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-8 rounded bg-white/8" />
            <Skeleton className="h-8 rounded bg-white/8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GiftCardsPage() {
  const { data: giftCards, isLoading } = useQuery<GiftCard[]>({
    queryKey: ["/api/gift-cards"],
  });

  const totalCards = giftCards?.length ?? 0;
  const totalValue = giftCards?.reduce((sum, c) => sum + c.initialAmount, 0) ?? 0;
  const activeCards = giftCards?.filter((c) => c.status === "active").length ?? 0;

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold text-white"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            data-testid="heading-gift-cards"
          >
            Gift Cards
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage and redeem Bronz Bliss gift cards</p>
        </div>
        <CreateGiftCardDialog />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<CreditCard size={18} />}
          label="Total Cards"
          value={isLoading ? "—" : totalCards}
          testId="stat-total-cards"
        />
        <StatCard
          icon={<DollarSign size={18} />}
          label="Total Value"
          value={isLoading ? "—" : `$${totalValue.toFixed(2)}`}
          testId="stat-total-value"
        />
        <StatCard
          icon={<Gift size={18} />}
          label="Active Cards"
          value={isLoading ? "—" : activeCards}
          testId="stat-active-cards"
        />
      </div>

      {/* Gift Card Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <GiftCardSkeletonCard key={i} />
          ))}
        </div>
      ) : !giftCards || giftCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="p-5 rounded-2xl bg-amber-500/10 text-amber-400">
            <Gift size={36} />
          </div>
          <div className="text-center space-y-1">
            <h2
              className="text-lg font-semibold text-white"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              No gift cards yet
            </h2>
            <p className="text-sm text-zinc-500 max-w-xs">
              Create your first gift card to start rewarding your clients.
            </p>
          </div>
          <CreateGiftCardDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {giftCards.map((card) => (
            <GiftCardCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
