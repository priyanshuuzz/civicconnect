import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Clock, AlertTriangle, CheckCircle, ChevronRight, Loader2, BarChart3, Timer,
  Construction, Trash2, Droplets, Zap, TreePine, Bug, Volume2, HelpCircle, UserCheck, MapPin,
} from "lucide-react";
import { toast } from "sonner";
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

function OfficerTicketCard({ ticket, onAssign, onStatusChange }) {
  const CatIcon = CATEGORY_ICONS[ticket.category] || HelpCircle;
  const catColor = CATEGORY_COLORS[ticket.category] || "bg-slate-100 text-slate-600";
  const slaPercent = ticket.sla_percentage || 0;
  const slaColor = slaPercent < 50 ? "bg-emerald-500" : slaPercent < 75 ? "bg-amber-400" : "bg-red-500";
  const isOpen = !["resolved", "closed"].includes(ticket.status);

  return (
    <div className="card-premium p-5 group" data-testid={`officer-row-${ticket.ticket_id}`}>
      <div className="flex gap-4">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", catColor)}>
          <CatIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase tracking-wider border rounded-lg px-2 py-0.5", `status-${ticket.status}`)}>
              {STATUS_LABELS[ticket.status]}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px] font-bold rounded-lg px-2 py-0.5", `priority-${ticket.priority}`)}>
              {ticket.priority}
            </Badge>
          </div>
          <Link to={`/ticket/${ticket.ticket_id}`} className="hover:text-blue-600 transition-colors">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{ticket.title}</h3>
          </Link>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <span className="truncate">{CATEGORY_LABELS[ticket.category]}</span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-0.5 truncate"><MapPin className="w-3 h-3 shrink-0" />{ticket.address || "Map"}</span>
          </div>

          {/* SLA bar */}
          {isOpen && slaPercent > 0 && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-slate-400 flex items-center gap-1"><Timer className="w-3 h-3" />SLA</span>
                <span className={cn("font-bold", slaPercent < 50 ? "text-emerald-600" : slaPercent < 75 ? "text-amber-600" : "text-red-600")}>
                  {Math.round(slaPercent)}%
                </span>
              </div>
              <div className="sla-track"><div className={cn("sla-bar", slaColor)} style={{ width: `${Math.min(100, slaPercent)}%` }} /></div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-400">
            <span className="font-mono">{ticket.ticket_id}</span>
            {ticket.assigned_to_name && (
              <span className="flex items-center gap-0.5 text-blue-600 font-medium"><UserCheck className="w-3 h-3" />{ticket.assigned_to_name}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {ticket.status === "submitted" && (
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => onAssign(ticket.ticket_id)} data-testid={`assign-btn-${ticket.ticket_id}`}>
              Assign
            </Button>
          )}
          {ticket.status === "assigned" && (
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg text-amber-600 border-amber-200 hover:bg-amber-50"
              onClick={() => onStatusChange(ticket.ticket_id, "in_progress")} data-testid={`start-btn-${ticket.ticket_id}`}>
              Start Work
            </Button>
          )}
          {ticket.status === "in_progress" && (
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              onClick={() => onStatusChange(ticket.ticket_id, "resolved")} data-testid={`resolve-btn-${ticket.ticket_id}`}>
              Resolve
            </Button>
          )}
          <Link to={`/ticket/${ticket.ticket_id}`}>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [dashData, setDashData] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ticketsRes, dashRes] = await Promise.all([
        api.get("/tickets", { params: statusFilter !== "all" ? { status: statusFilter } : {} }),
        api.get("/admin/dashboard"),
      ]);
      setTickets(ticketsRes.data.tickets);
      setDashData(dashRes.data);
      if (user?.role === "admin") {
        const usersRes = await api.get("/admin/users", { params: { role: "officer" } });
        setOfficers(usersRes.data.users);
      }
    } catch { toast.error("Failed to load dashboard"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [statusFilter, user]);

  const handleAssign = async () => {
    if (!selectedTicket || !selectedOfficer) return;
    try {
      await api.post(`/tickets/${selectedTicket}/assign`, { assigned_to: selectedOfficer });
      toast.success("Ticket assigned");
      setAssignDialogOpen(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to assign"); }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await api.patch(`/tickets/${ticketId}/status`, { status: newStatus });
      toast.success("Status updated");
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to update"); }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const openCount = dashData ? (dashData.by_status.submitted + dashData.by_status.assigned + dashData.by_status.in_progress) : 0;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]" data-testid="officer-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit'] tracking-tight" data-testid="officer-heading">
            Officer Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and resolve citizen complaints</p>
        </div>

        {/* Stats */}
        {dashData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Open Issues" value={openCount} icon={AlertTriangle} accentClass="stat-accent-amber" delay="animate-delay-50" />
            <StatCard label="Resolved" value={dashData.by_status.resolved} icon={CheckCircle} accentClass="stat-accent-emerald" delay="animate-delay-100" />
            <StatCard label="SLA Breached" value={dashData.sla_breached} icon={Clock} accentClass="stat-accent-red" delay="animate-delay-150" />
            <StatCard label="Total" value={dashData.total_tickets} icon={BarChart3} accentClass="stat-accent-blue" delay="animate-delay-200" />
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-3 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-10 text-sm rounded-xl bg-white" data-testid="officer-status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-slate-400">{tickets.length} tickets</span>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="officer-tickets-table">
          {tickets.map((t) => (
            <OfficerTicketCard
              key={t.ticket_id}
              ticket={t}
              onAssign={(id) => { setSelectedTicket(id); setAssignDialogOpen(true); }}
              onStatusChange={handleStatusChange}
            />
          ))}
          {tickets.length === 0 && (
            <div className="col-span-2 card-premium text-center py-16">
              <CheckCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No tickets found</p>
            </div>
          )}
        </div>

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Assign Ticket</DialogTitle>
            </DialogHeader>
            <div className="py-3">
              <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
                <SelectTrigger className="rounded-xl" data-testid="assign-officer-select">
                  <SelectValue placeholder="Select officer" />
                </SelectTrigger>
                <SelectContent>
                  {officers.map((o) => (
                    <SelectItem key={o.user_id} value={o.user_id}>{o.name} ({o.email})</SelectItem>
                  ))}
                  {officers.length === 0 && (
                    <SelectItem value={user?.user_id || "self"}>Self ({user?.name})</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={handleAssign} disabled={!selectedOfficer} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl" data-testid="confirm-assign-btn">
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
