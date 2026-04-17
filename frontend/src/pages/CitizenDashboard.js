import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { subscribeToComplaints } from "@/lib/firebaseService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Clock, MapPin, ChevronRight, Loader2, AlertTriangle, CheckCircle, BarChart3,
  Construction, Trash2, Droplets, Zap, TreePine, Volume2, HelpCircle, Bug, Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABELS = { submitted: "Submitted", assigned: "Assigned", in_progress: "In Progress", resolved: "Resolved", closed: "Closed" };
const CATEGORY_LABELS = {
  roads_footpaths: "Roads & Footpaths", sanitation_waste: "Sanitation & Waste",
  water_drainage: "Water & Drainage", electricity_lighting: "Electricity & Lighting",
  parks_public_spaces: "Parks & Public Spaces", stray_animals: "Stray Animals",
  noise_pollution: "Noise & Pollution", other: "Other",
};
const CATEGORY_ICONS = {
  roads_footpaths: Construction, sanitation_waste: Trash2, water_drainage: Droplets,
  electricity_lighting: Zap, parks_public_spaces: TreePine, stray_animals: Bug,
  noise_pollution: Volume2, other: HelpCircle,
};
const CATEGORY_COLORS = {
  roads_footpaths: "bg-red-50 text-red-600", sanitation_waste: "bg-amber-50 text-amber-600",
  water_drainage: "bg-blue-50 text-blue-600", electricity_lighting: "bg-violet-50 text-violet-600",
  parks_public_spaces: "bg-emerald-50 text-emerald-600", stray_animals: "bg-pink-50 text-pink-600",
  noise_pollution: "bg-slate-100 text-slate-600", other: "bg-purple-50 text-purple-600",
};
// Removed BACKEND constant - using Firebase Storage URLs now

function SkeletonCard() {
  return (
    <div className="card-premium p-5">
      <div className="flex gap-4">
        <div className="skeleton w-11 h-11 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-3 w-1/2" />
          <div className="skeleton h-1.5 w-full rounded-full mt-3" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accentClass, delay }) {
  return (
    <div className={cn("card-premium p-5 opacity-0 animate-count-up", accentClass, delay)} data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-slate-900 font-['Outfit'] mt-1 tabular-nums">{value}</p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-slate-500" />
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket, idx }) {
  const CatIcon = CATEGORY_ICONS[ticket.category] || HelpCircle;
  const catColor = CATEGORY_COLORS[ticket.category] || "bg-slate-100 text-slate-600";
  
  // Calculate SLA percentage
  const now = new Date();
  const createdAt = new Date(ticket.createdAt);
  const slaDeadline = new Date(ticket.slaDeadline);
  const total = slaDeadline - createdAt;
  const elapsed = now - createdAt;
  const slaPercent = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
  
  const slaColor = slaPercent < 50 ? "bg-emerald-500" : slaPercent < 75 ? "bg-amber-400" : "bg-red-500";

  return (
    <Link
      to={`/ticket/${ticket.ticket_id}`}
      className={cn("block opacity-0 animate-fade-in-up", `animate-delay-${Math.min(idx * 50, 300)}`)}
      data-testid={`ticket-card-${ticket.ticket_id}`}
    >
      <div className="card-premium p-5 group cursor-pointer">
        <div className="flex gap-4">
          {/* Category Icon */}
          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", catColor)}>
            <CatIcon className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase tracking-wider border rounded-lg px-2 py-0.5", `status-${ticket.status}`)}>
                {STATUS_LABELS[ticket.status]}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px] font-bold rounded-lg px-2 py-0.5", `priority-${ticket.priority}`)}>
                {ticket.priority}
              </Badge>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors duration-200">
              {ticket.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span className="truncate">{CATEGORY_LABELS[ticket.category]}</span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-0.5 truncate"><MapPin className="w-3 h-3 shrink-0" />{ticket.address || "Map Location"}</span>
            </div>

            {/* SLA Progress Bar */}
            {ticket.status !== "resolved" && ticket.status !== "closed" && slaPercent > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-slate-400 flex items-center gap-1"><Timer className="w-3 h-3" />SLA</span>
                  <span className={cn("font-bold", slaPercent < 50 ? "text-emerald-600" : slaPercent < 75 ? "text-amber-600" : "text-red-600")}>
                    {Math.round(slaPercent)}%
                  </span>
                </div>
                <div className="sla-track">
                  <div className={cn("sla-bar", slaColor)} style={{ width: `${Math.min(100, slaPercent)}%` }} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[10px] text-slate-400 font-mono">{ticket.ticket_id}</span>
              <span className="text-[10px] text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Photo preview + chevron */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {ticket.imageUrl && (
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                <img
                  src={ticket.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all duration-200" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Paginate tickets client-side
  const paginatedTickets = tickets.slice((page - 1) * 20, page * 20);

  useEffect(() => {
    if (!user?.user_id) return;

    setLoading(true);

    // Build filters for real-time subscription
    const filters = {
      userId: user.user_id,
      limit: 100 // Get all user complaints for client-side filtering
    };

    if (statusFilter !== "all") {
      filters.status = statusFilter;
    }

    // Subscribe to real-time updates
    const unsubscribe = subscribeToComplaints(filters, (complaints) => {
      setTickets(complaints);
      setTotal(complaints.length);
      setTotalPages(Math.ceil(complaints.length / 20));
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [statusFilter, user]);

  const activeCount = tickets.filter(t => !["resolved", "closed"].includes(t.status)).length;
  const breachedCount = tickets.filter(t => {
    if (["resolved", "closed"].includes(t.status)) return false;
    const now = new Date();
    const slaDeadline = new Date(t.slaDeadline);
    return now > slaDeadline;
  }).length;
  const resolvedCount = tickets.filter(t => t.status === "resolved" || t.status === "closed").length;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]" data-testid="citizen-dashboard">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit'] tracking-tight" data-testid="dashboard-heading">
              My Complaints
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Welcome back, {user?.name || "Citizen"}</p>
          </div>
          <Link to="/report">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl h-10 px-5 shadow-sm shadow-blue-200" data-testid="new-report-btn">
              <Plus className="w-4 h-4" /> New Report
            </Button>
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active Issues" value={activeCount} icon={AlertTriangle} accentClass="stat-accent-amber" delay="animate-delay-50" />
          <StatCard label="SLA Breaches" value={breachedCount} icon={Clock} accentClass="stat-accent-red" delay="animate-delay-100" />
          <StatCard label="Resolved" value={resolvedCount} icon={CheckCircle} accentClass="stat-accent-emerald" delay="animate-delay-150" />
          <StatCard label="Total Filed" value={total} icon={BarChart3} accentClass="stat-accent-blue" delay="animate-delay-200" />
        </div>

        {/* Filter Tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }} className="mb-6">
          <TabsList className="bg-white border border-slate-200 h-10 rounded-xl p-1" data-testid="status-filter-tabs">
            <TabsTrigger value="all" className="text-xs rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white">All</TabsTrigger>
            <TabsTrigger value="submitted" className="text-xs rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white">Submitted</TabsTrigger>
            <TabsTrigger value="assigned" className="text-xs rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white">Assigned</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white">In Progress</TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white">Resolved</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Ticket Cards */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="card-premium text-center py-20 px-6" data-testid="empty-state">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center mb-5">
              <MapPin className="w-9 h-9 text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 font-['Outfit']">No issues reported yet</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">Help make your neighborhood better by reporting the first civic issue.</p>
            <Link to="/report">
              <Button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl h-11 px-6 shadow-sm shadow-blue-200" data-testid="empty-report-btn">
                <Plus className="w-4 h-4" /> Report Issue
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4" data-testid="ticket-list">
            {paginatedTickets.map((t, idx) => <TicketCard key={t.ticket_id} ticket={t} idx={idx} />)}
          </div>
        )}

        {/* Pagination - Client-side pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
              Previous
            </Button>
            <span className="text-sm text-slate-500 font-medium">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
