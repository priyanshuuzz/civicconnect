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
  MapPin, Clock, Send, ArrowLeft, User, FileText, Loader2, AlertTriangle, CheckCircle,
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

function SLAProgress({ percentage }) {
  const cls = percentage < 50 ? "bg-emerald-500" : percentage < 75 ? "bg-yellow-500" : "bg-red-500";
  const label = percentage < 50 ? "On Track" : percentage < 75 ? "Warning" : percentage >= 100 ? "Breached" : "Critical";
  return (
    <div data-testid="sla-progress">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-slate-700">SLA Progress</span>
        <span className={cn("font-bold", percentage < 50 ? "text-emerald-600" : percentage < 75 ? "text-yellow-600" : "text-red-600")}>
          {Math.round(percentage)}% &mdash; {label}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", cls)} style={{ width: `${Math.min(100, percentage)}%` }} />
      </div>
    </div>
  );
}

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
    } catch {
      toast.error("Failed to load ticket");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); }, [id]);

  const sendMessage = async () => {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/tickets/${id}/messages`, { text: msgText });
      setMessages([...messages, res.data]);
      setMsgText("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async () => {
    try {
      await api.patch(`/tickets/${id}/status`, { status: newStatus, note: statusNote });
      toast.success(`Status updated to ${newStatus}`);
      setStatusDialogOpen(false);
      setStatusNote("");
      fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!ticket) return null;

  const isOfficerOrAdmin = user?.role === "officer" || user?.role === "admin";
  const isCitizen = user?.role === "citizen";
  const statusOptions = isOfficerOrAdmin
    ? ["submitted", "assigned", "in_progress", "resolved", "closed"]
    : ticket.status === "resolved" ? ["submitted", "closed"] : ["closed"];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]" data-testid="ticket-detail-page">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back */}
        <Button variant="ghost" size="sm" className="mb-4 gap-1 text-slate-500" onClick={() => navigate(-1)} data-testid="back-btn">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4" data-testid="ticket-header">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="secondary" className={cn("text-[10px] font-semibold uppercase tracking-wider", `status-${ticket.status}`)}>
              {ticket.status?.replace("_", " ")}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px] font-bold", `priority-${ticket.priority}`)}>
              {ticket.priority}
            </Badge>
            <span className="text-xs text-slate-400 font-mono">{ticket.ticket_id}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Outfit'] tracking-tight" data-testid="ticket-title">
            {ticket.title}
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{ticket.description}</p>
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{CATEGORY_LABELS[ticket.category]}</span>
            <span>{ticket.subcategory}</span>
            <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{ticket.created_by_name}</span>
            <span>{new Date(ticket.created_at).toLocaleString()}</span>
          </div>
          {ticket.assigned_to_name && (
            <p className="text-xs text-blue-600 mt-2 font-medium">Assigned to: {ticket.assigned_to_name}</p>
          )}
        </div>

        {/* SLA Progress */}
        {ticket.status !== "resolved" && ticket.status !== "closed" && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
            <SLAProgress percentage={ticket.sla_percentage} />
            <p className="text-xs text-slate-500 mt-2">
              Deadline: {new Date(ticket.sla_deadline).toLocaleString()}
              {ticket.escalation_level > 1 && (
                <span className="ml-2 text-red-600 font-semibold">
                  <AlertTriangle className="w-3 h-3 inline mr-0.5" />
                  Escalation Level {ticket.escalation_level}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Status Timeline</h3>
          <StatusTimeline currentStatus={ticket.status} />
        </div>

        {/* Photos */}
        {ticket.photos?.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4" data-testid="ticket-photos">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Photos</h3>
            <div className="flex flex-wrap gap-2">
              {ticket.photos.map((p, i) => (
                <div key={i} className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <img
                    src={`${BACKEND}/api/files/${p}`} alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = "https://via.placeholder.com/96?text=Photo"; }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
          <div className="flex flex-wrap gap-2">
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" data-testid="update-status-btn">
                  <CheckCircle className="w-3.5 h-3.5" /> Update Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Ticket Status</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger data-testid="status-select">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Add a note (optional)..." value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)} data-testid="status-note-input"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={updateStatus} disabled={!newStatus} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-status-btn">
                    Update
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs: Messages + Audit Log */}
        <Tabs defaultValue="messages">
          <TabsList className="bg-white border border-slate-200 mb-3">
            <TabsTrigger value="messages" data-testid="tab-messages">Messages</TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="messages">
            <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="messages-section">
              <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
                {messages.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No messages yet. Start a conversation.</p>
                )}
                {messages.map((m) => (
                  <div
                    key={m.message_id}
                    className={cn(
                      "p-3 rounded-lg text-sm",
                      m.sender_id === user?.user_id
                        ? "bg-blue-50 border border-blue-100 ml-8"
                        : "bg-slate-50 border border-slate-100 mr-8"
                    )}
                    data-testid={`message-${m.message_id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-xs text-slate-700">{m.sender_name}</span>
                      <Badge variant="outline" className="text-[9px]">{m.sender_role}</Badge>
                      <span className="text-[10px] text-slate-400 ml-auto">{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700">{m.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..." value={msgText}
                  onChange={(e) => setMsgText(e.target.value)} className="min-h-[40px] flex-1"
                  data-testid="message-input"
                />
                <Button
                  onClick={sendMessage} disabled={sending || !msgText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white shrink-0" data-testid="send-message-btn"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="audit-log-section">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No audit logs</p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.log_id} className="flex items-start gap-3 text-xs border-b border-slate-50 pb-2 last:border-0">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-slate-700">{log.action.replace(/_/g, " ")}</span>
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
