import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import StatusTimeline from "@/components/StatusTimeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  MapPin, Clock, Send, ArrowLeft, User, FileText, Loader2, AlertTriangle, CheckCircle, Timer,
  Construction, Trash2, Droplets, Zap, TreePine, Bug, Volume2, HelpCircle, MessageSquare, ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
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

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.data.ticket);
      setMessages(res.data.messages);
      setAuditLogs(res.data.audit_logs);
    } catch { toast.error("Failed to load ticket"); navigate("/dashboard"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTicket(); }, [id]);

  const sendMessage = async () => {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/tickets/${id}/messages`, { text: msgText });
      setMessages([...messages, res.data]);
      setMsgText("");
    } catch { toast.error("Failed to send message"); }
    finally { setSending(false); }
  };

  const updateStatus = async () => {
    try {
      await api.patch(`/tickets/${id}/status`, { status: newStatus, note: statusNote });
      toast.success(`Status updated to ${newStatus}`);
      setStatusDialogOpen(false);
      setStatusNote("");
      fetchTicket();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to update status"); }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <div className="skeleton h-6 w-20 rounded-lg" />
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const CatIcon = CATEGORY_ICONS[ticket.category] || HelpCircle;
  const catColor = CATEGORY_COLORS[ticket.category] || "bg-slate-100 text-slate-600";
  const isOfficerOrAdmin = user?.role === "officer" || user?.role === "admin";
  const statusOptions = isOfficerOrAdmin
    ? ["submitted", "assigned", "in_progress", "resolved", "closed"]
    : ticket.status === "resolved" ? ["submitted", "closed"] : ["closed"];
  const slaPercent = ticket.sla_percentage || 0;
  const slaColor = slaPercent < 50 ? "bg-emerald-500" : slaPercent < 75 ? "bg-amber-400" : "bg-red-500";
  const slaLabel = slaPercent < 50 ? "On Track" : slaPercent < 75 ? "Warning" : slaPercent >= 100 ? "Breached" : "Critical";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]" data-testid="ticket-detail-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Button variant="ghost" size="sm" className="mb-5 gap-1.5 text-slate-500 rounded-lg" onClick={() => navigate(-1)} data-testid="back-btn">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        {/* Hero Header Card */}
        <div className="card-premium overflow-hidden mb-4 animate-fade-in-up" data-testid="ticket-header">
          {/* Accent bar */}
          <div className={cn("h-1", slaPercent >= 100 ? "bg-red-500" : slaPercent >= 75 ? "bg-amber-400" : "bg-blue-600")} />
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", catColor)}>
                <CatIcon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase tracking-wider border rounded-lg px-2.5 py-0.5", `status-${ticket.status}`)}>
                    {ticket.status?.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px] font-bold rounded-lg px-2.5 py-0.5", `priority-${ticket.priority}`)}>
                    {ticket.priority}
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-mono ml-auto">{ticket.ticket_id}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Outfit'] tracking-tight" data-testid="ticket-title">
                  {ticket.title}
                </h1>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{ticket.description}</p>
                <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{CATEGORY_LABELS[ticket.category]}</span>
                  <span className="text-slate-300">|</span>
                  <span>{ticket.subcategory}</span>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{ticket.created_by_name}</span>
                  <span className="text-slate-300">|</span>
                  <span>{new Date(ticket.created_at).toLocaleString()}</span>
                </div>
                {ticket.assigned_to_name && (
                  <p className="text-xs text-blue-600 mt-2 font-semibold">Assigned to: {ticket.assigned_to_name}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SLA Progress */}
        {ticket.status !== "resolved" && ticket.status !== "closed" && (
          <div className="card-premium p-5 mb-4 animate-fade-in-up animate-delay-100">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5"><Timer className="w-4 h-4" /> SLA Progress</span>
              <span className={cn("font-bold", slaPercent < 50 ? "text-emerald-600" : slaPercent < 75 ? "text-amber-600" : "text-red-600")}>
                {Math.round(slaPercent)}% &mdash; {slaLabel}
              </span>
            </div>
            <div className="sla-track h-2.5">
              <div className={cn("sla-bar", slaColor)} style={{ width: `${Math.min(100, slaPercent)}%` }} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-slate-400">Deadline: {new Date(ticket.sla_deadline).toLocaleString()}</p>
              {ticket.escalation_level > 1 && (
                <span className="text-[10px] text-red-600 font-bold flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> Escalation Level {ticket.escalation_level}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="card-premium p-6 mb-4 animate-fade-in-up animate-delay-150">
          <h3 className="text-sm font-semibold text-slate-700 font-['Outfit'] mb-5">Status Timeline</h3>
          <StatusTimeline currentStatus={ticket.status} />
        </div>

        {/* Photos */}
        {ticket.photos?.length > 0 && (
          <div className="card-premium p-5 mb-4 animate-fade-in-up animate-delay-200" data-testid="ticket-photos">
            <h3 className="text-sm font-semibold text-slate-700 font-['Outfit'] mb-3">Attached Photos</h3>
            <div className="flex flex-wrap gap-3">
              {ticket.photos.map((p, i) => (
                <div key={i} className="w-28 h-28 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm hover:shadow-md transition-shadow">
                  <img src={`${BACKEND}/api/files/${p}`} alt={`Photo ${i + 1}`} className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = "https://via.placeholder.com/112?text=Photo"; }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="card-premium p-5 mb-4">
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" data-testid="update-status-btn">
                <CheckCircle className="w-3.5 h-3.5" /> Update Status
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle className="font-['Outfit']">Update Ticket Status</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="rounded-xl" data-testid="status-select"><SelectValue placeholder="Select new status" /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Textarea placeholder="Add a note (optional)..." value={statusNote} onChange={e => setStatusNote(e.target.value)} className="rounded-xl" data-testid="status-note-input" />
              </div>
              <DialogFooter>
                <Button onClick={updateStatus} disabled={!newStatus} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl" data-testid="confirm-status-btn">Update</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Messaging + Audit */}
        <Tabs defaultValue="messages">
          <TabsList className="bg-white border border-slate-200 mb-4 h-10 rounded-xl p-1">
            <TabsTrigger value="messages" className="text-xs rounded-lg gap-1.5 data-[state=active]:bg-slate-900 data-[state=active]:text-white" data-testid="tab-messages">
              <MessageSquare className="w-3.5 h-3.5" /> Messages ({messages.length})
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs rounded-lg gap-1.5 data-[state=active]:bg-slate-900 data-[state=active]:text-white" data-testid="tab-audit">
              <ScrollText className="w-3.5 h-3.5" /> Audit Log ({auditLogs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages">
            <div className="card-premium p-5" data-testid="messages-section">
              <div className="space-y-3 max-h-96 overflow-y-auto mb-4 pr-1">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No messages yet. Start a conversation.</p>
                  </div>
                )}
                {messages.map(m => (
                  <div key={m.message_id}
                    className={cn("p-3.5 rounded-xl text-sm", m.sender_id === user?.user_id ? "bg-blue-50/80 border border-blue-100/50 ml-8" : "bg-slate-50 border border-slate-100 mr-8")}
                    data-testid={`message-${m.message_id}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600">
                        {m.sender_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="font-semibold text-xs text-slate-700">{m.sender_name}</span>
                      <Badge variant="outline" className="text-[9px] rounded-md">{m.sender_role}</Badge>
                      <span className="text-[10px] text-slate-400 ml-auto">{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700 pl-8">{m.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Textarea placeholder="Type your message..." value={msgText} onChange={e => setMsgText(e.target.value)}
                  className="min-h-[44px] flex-1 rounded-xl resize-none" data-testid="message-input" />
                <Button onClick={sendMessage} disabled={sending || !msgText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 rounded-xl h-11 w-11 p-0" data-testid="send-message-btn">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <div className="card-premium p-5" data-testid="audit-log-section">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8">
                  <ScrollText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No audit logs</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {auditLogs.map((log, i) => (
                    <div key={log.log_id} className="flex items-start gap-3 text-xs py-3 border-b border-slate-50 last:border-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">{log.action.replace(/_/g, " ")}</span>
                        {log.details && <span className="text-slate-500"> &mdash; {log.details}</span>}
                        <p className="text-slate-400 mt-0.5">{log.actor_id} &middot; {new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
