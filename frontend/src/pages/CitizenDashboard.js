import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Clock, MapPin, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  submitted: "Submitted", assigned: "Assigned", in_progress: "In Progress",
  resolved: "Resolved", closed: "Closed",
};
const CATEGORY_LABELS = {
  roads_footpaths: "Roads & Footpaths", sanitation_waste: "Sanitation & Waste",
  water_drainage: "Water & Drainage", electricity_lighting: "Electricity & Lighting",
  parks_public_spaces: "Parks & Public Spaces", stray_animals: "Stray Animals",
  noise_pollution: "Noise & Pollution", other: "Other",
};

function SLABadge({ percentage }) {
  if (percentage === 0) return null;
  const cls = percentage < 50 ? "sla-safe" : percentage < 75 ? "sla-warning" : "sla-danger";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border", cls)} data-testid="sla-badge">
      <Clock className="w-3 h-3 mr-1" /> SLA {Math.round(percentage)}%
    </span>
  );
}

function TicketCard({ ticket }) {
  const statusClass = `status-${ticket.status}`;
  return (
    <Link to={`/ticket/${ticket.ticket_id}`} className="block" data-testid={`ticket-card-${ticket.ticket_id}`}>
      <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 group">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="secondary" className={cn("text-[10px] font-semibold uppercase tracking-wider", statusClass)}>
                {STATUS_LABELS[ticket.status]}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px] font-bold", `priority-${ticket.priority}`)}>
                {ticket.priority}
              </Badge>
              <SLABadge percentage={ticket.sla_percentage} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
              {ticket.title}
            </h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
              <span>{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
              <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{ticket.address || "Map Location"}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {ticket.ticket_id} &middot; {new Date(ticket.created_at).toLocaleDateString()}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 mt-2" />
        </div>
      </div>
    </Link>
  );
}

export default function CitizenDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 20 };
        if (statusFilter !== "all") params.status = statusFilter;
        const res = await api.get("/tickets", { params });
        setTickets(res.data.tickets);
        setTotalPages(res.data.pages);
      } catch {
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [statusFilter, page]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]" data-testid="citizen-dashboard">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit'] tracking-tight" data-testid="dashboard-heading">
              My Complaints
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Track and manage your reported issues</p>
          </div>
          <Link to="/report">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" data-testid="new-report-btn">
              <Plus className="w-4 h-4" /> Report
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }} className="mb-6">
          <TabsList className="bg-white border border-slate-200 h-9" data-testid="status-filter-tabs">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="submitted" className="text-xs">Submitted</TabsTrigger>
            <TabsTrigger value="assigned" className="text-xs">Assigned</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs">In Progress</TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs">Resolved</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Ticket list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-state">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-700 font-['Outfit']">No complaints yet</h3>
            <p className="text-sm text-slate-500 mt-1">Report your first civic issue to get started</p>
            <Link to="/report">
              <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                <Plus className="w-4 h-4" /> Report Issue
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3" data-testid="ticket-list">
            {tickets.map((t) => <TicketCard key={t.ticket_id} ticket={t} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
              Previous
            </Button>
            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
