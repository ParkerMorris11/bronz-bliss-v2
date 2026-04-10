import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CalendarPlus, MessageSquare, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";

type Membership = "active" | "expired" | "none";

interface ClientCard extends Client {
  visits: number;
  lastVisit: string | null;
  membership: Membership;
}

function Initials({ firstName, lastName }: { firstName: string; lastName: string }) {
  return (
    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-lg font-bold text-primary">
        {firstName[0]?.toUpperCase()}{lastName[0]?.toUpperCase()}
      </span>
    </div>
  );
}

function MembershipBadge({ status }: { status: Membership }) {
  if (status === "active") return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Active Package</Badge>;
  if (status === "expired") return <Badge variant="outline" className="text-[10px] text-stone-400">Expired</Badge>;
  return null;
}

function formatLastVisit(date: string | null) {
  if (!date) return "No visits yet";
  const d = new Date(date + "T12:00:00");
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 30) return `${diff}d ago`;
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`;
  return `${Math.floor(diff / 365)}y ago`;
}

export default function ClientCardsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Membership>("all");
  const [, navigate] = useLocation();

  const { data: clients = [], isLoading } = useQuery<ClientCard[]>({
    queryKey: ["/api/clients/cards"],
    queryFn: () => apiRequest("GET", "/api/clients/cards").then(r => r.json()),
  });

  const filtered = clients.filter(c => {
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || c.membership === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Client Cards
        </h1>
        <Link href="/clients">
          <Button size="sm" variant="outline">List View</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={v => setFilter(v as any)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="active">Active Package</SelectItem>
            <SelectItem value="expired">Expired Package</SelectItem>
            <SelectItem value="none">No Package</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Count */}
      {!isLoading && (
        <p className="text-xs text-muted-foreground">{filtered.length} client{filtered.length !== 1 ? "s" : ""}</p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex gap-3 animate-pulse">
                  <div className="w-14 h-14 rounded-full bg-stone-100 shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-stone-100 rounded w-3/4" />
                    <div className="h-3 bg-stone-100 rounded w-1/2" />
                    <div className="h-3 bg-stone-100 rounded w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <User className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search || filter !== "all" ? "No clients match your filters" : "No clients yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <Initials firstName={client.firstName} lastName={client.lastName} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">
                      {client.firstName} {client.lastName}
                    </p>
                    {client.phone && (
                      <p className="text-xs text-muted-foreground truncate">{client.phone}</p>
                    )}
                    {client.email && (
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                    )}
                    <div className="mt-1.5">
                      <MembershipBadge status={client.membership} />
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center bg-stone-50 rounded-lg p-2.5">
                  <div>
                    <p className="text-base font-bold text-primary">{client.visits}</p>
                    <p className="text-[10px] text-muted-foreground">Sessions</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{formatLastVisit(client.lastVisit)}</p>
                    <p className="text-[10px] text-muted-foreground">Last Visit</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold truncate">{client.skinType ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Skin Type</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1"
                    onClick={() => navigate(`/calendar?clientId=${client.id}`)}
                  >
                    <CalendarPlus className="w-3.5 h-3.5" /> Book
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs gap-1"
                    onClick={() => navigate(`/messages?clientId=${client.id}`)}
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Message
                  </Button>
                  <Link href={`/clients/${client.id}`}>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <User className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
