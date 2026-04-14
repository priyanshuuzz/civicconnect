import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Clock, AlertTriangle, CheckCircle, User, ChevronRight, Loader2, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
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

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 font-['Outfit'] mt-1">{value}</p>
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-5 h-5 text-white" />
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

  useEffect(() => {
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
      } catch {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [statusFilter, user]);

  const handleAssign = async () => {
    if (!selectedTicket || !selectedOfficer) return;
    try {
      await api.post(`/tickets/${selectedTicket}/assign`, { assigned_to: selectedOfficer });
      toast.success("Ticket assigned");
      setAssignDialogOpen(false);
      // Refresh
      const res = await api.get("/tickets", { params: statusFilter !== "all" ? { status: statusFilter } : {} });
      setTickets(res.data.tickets);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to assign");
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await api.patch(`/tickets/${ticketId}/status`, { status: newStatus });
      toast.success("Status updated");
      const res = await api.get("/tickets", { params: statusFilter !== "all" ? { status: statusFilter } : {} });
      setTickets(res.data.tickets);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  const openCount = dashData ? (dashData.by_status.submitted + dashData.by_status.assigned + dashData.by_status.in_progress) : 0;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]" data-testid="officer-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit'] tracking-tight" data-testid="officer-heading">
            Officer Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and resolve citizen complaints</p>
        </div>

        {/* Stats */}
        {dashData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Open Issues" value={openCount} icon={AlertTriangle} color="bg-amber-500" />
            <StatCard label="Resolved" value={dashData.by_status.resolved} icon={CheckCircle} color="bg-emerald-500" />
            <StatCard label="SLA Breached" value={dashData.sla_breached} icon={Clock} color="bg-red-500" />
            <StatCard label="Total" value={dashData.total_tickets} icon={BarChart3} color="bg-blue-600" />
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-3 mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm" data-testid="officer-status-filter">
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
        </div>

        {/* Tickets table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid="officer-tickets-table">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Ticket</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Category</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">SLA</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Assigned</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const slaCls = t.sla_percentage < 50 ? "sla-safe" : t.sla_percentage < 75 ? "sla-warning" : "sla-danger";
                  return (
                    <tr key={t.ticket_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors" data-testid={`officer-row-${t.ticket_id}`}>
                      <td className="px-4 py-3">
                        <Link to={`/ticket/${t.ticket_id}`} className="hover:text-blue-600 transition-colors">
                          <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{t.title}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{t.ticket_id}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-slate-600">{CATEGORY_LABELS[t.category]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={cn("text-[10px]", `status-${t.status}`)}>
                          {STATUS_LABELS[t.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {t.status !== "resolved" && t.status !== "closed" ? (
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border", slaCls)}>
                            {Math.round(t.sla_percentage)}%
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-slate-600">{t.assigned_to_name || "Unassigned"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {t.status === "submitted" && (
                            <>
                              <Button
                                variant="outline" size="sm" className="h-7 text-[10px]"
                                onClick={() => {
                                  setSelectedTicket(t.ticket_id);
                                  setAssignDialogOpen(true);
                                }}
                                data-testid={`assign-btn-${t.ticket_id}`}
                              >
                                Assign
                              </Button>
                            </>
                          )}
                          {t.status === "assigned" && (
                            <Button
                              variant="outline" size="sm" className="h-7 text-[10px]"
                              onClick={() => handleStatusChange(t.ticket_id, "in_progress")}
                              data-testid={`start-btn-${t.ticket_id}`}
                            >
                              Start
                            </Button>
                          )}
                          {t.status === "in_progress" && (
                            <Button
                              variant="outline" size="sm" className="h-7 text-[10px] text-emerald-600"
                              onClick={() => handleStatusChange(t.ticket_id, "resolved")}
                              data-testid={`resolve-btn-${t.ticket_id}`}
                            >
                              Resolve
                            </Button>
                          )}
                          <Link to={`/ticket/${t.ticket_id}`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm text-slate-400">No tickets found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Ticket</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
                <SelectTrigger data-testid="assign-officer-select">
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
              <Button onClick={handleAssign} disabled={!selectedOfficer} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-assign-btn">
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
