import { useState, useEffect } from "react";
import { getDashboardStats, getUsers, updateUserRole } from "@/lib/firebaseService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, Users, AlertTriangle, CheckCircle, Clock, Shield, Loader2, TrendingUp, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const CATEGORY_LABELS = {
  roads_footpaths: "Roads", sanitation_waste: "Sanitation", water_drainage: "Water",
  electricity_lighting: "Electricity", parks_public_spaces: "Parks", stray_animals: "Animals",
  noise_pollution: "Noise", other: "Other",
};
const BAR_COLORS = ["#2563EB", "#7C3AED", "#3B82F6", "#8B5CF6", "#6366F1", "#A855F7", "#C084FC", "#818CF8"];

function AdminStatCard({ label, value, icon: Icon, accentClass, subtitle, delay }) {
  return (
    <div className={cn("card-premium p-5 opacity-0 animate-count-up", accentClass, delay)} data-testid={`admin-stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-slate-900 font-['Outfit'] mt-1 tabular-nums">{value}</p>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-slate-500" />
        </div>
      </div>
    </div>
  );
}

function SLARing({ percentage }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 80 ? "#10B981" : percentage >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex items-center justify-center" data-testid="sla-ring">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="8" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashoffset} className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold font-['Outfit'] text-slate-900">{percentage}%</span>
        <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Compliance</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [dashData, setDashData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [stats, usersList] = await Promise.all([
          getDashboardStats(),
          getUsers()
        ]);
        setDashData(stats);
        setUsers(usersList);
      } catch (error) {
        toast.error("Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success("Role updated");
      setUsers(users.map((u) => u.user_id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-72 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const d = dashData;
  const openCount = d ? (d.by_status.submitted + d.by_status.assigned + d.by_status.in_progress) : 0;
  const resolvedCount = d ? d.by_status.resolved + d.by_status.closed : 0;
  const slaCompliance = d && d.total_tickets > 0 ? Math.round(((d.total_tickets - d.sla_breached) / d.total_tickets) * 100) : 100;

  const categoryData = d ? Object.entries(d.by_category).map(([k, v]) => ({ name: CATEGORY_LABELS[k] || k, value: v })).filter(x => x.value > 0) : [];
  const statusData = d ? [
    { name: "Submitted", value: d.by_status.submitted, fill: "#94A3B8" },
    { name: "Assigned", value: d.by_status.assigned, fill: "#3B82F6" },
    { name: "In Progress", value: d.by_status.in_progress, fill: "#F59E0B" },
    { name: "Resolved", value: d.by_status.resolved, fill: "#10B981" },
    { name: "Closed", value: d.by_status.closed, fill: "#6B7280" },
  ].filter(x => x.value > 0) : [];

  const priorityData = d ? [
    { name: "Critical", count: d.by_priority.CRITICAL || 0, color: "bg-red-500" },
    { name: "High", count: d.by_priority.HIGH || 0, color: "bg-orange-500" },
    { name: "Medium", count: d.by_priority.MEDIUM || 0, color: "bg-amber-500" },
    { name: "Low", count: d.by_priority.LOW || 0, color: "bg-slate-400" },
  ] : [];
  const totalPriority = priorityData.reduce((a, b) => a + b.count, 0) || 1;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit'] tracking-tight" data-testid="admin-heading">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">City-wide analytics and platform management</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <AdminStatCard label="Total Issues" value={d?.total_tickets || 0} icon={BarChart3} accentClass="stat-accent-blue" delay="animate-delay-50" />
          <AdminStatCard label="Open" value={openCount} icon={AlertTriangle} accentClass="stat-accent-amber" delay="animate-delay-100" />
          <AdminStatCard label="Resolved" value={resolvedCount} icon={CheckCircle} accentClass="stat-accent-emerald" delay="animate-delay-150" />
          <AdminStatCard label="SLA Breached" value={d?.sla_breached || 0} icon={Clock} accentClass="stat-accent-red" delay="animate-delay-200" />
          <AdminStatCard label="Users" value={d?.total_users || 0} icon={Users} accentClass="stat-accent-indigo" delay="animate-delay-250" subtitle={`${d?.officers_count || 0} officers`} />
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 h-10 rounded-xl p-1">
            <TabsTrigger value="analytics" className="text-xs rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white" data-testid="tab-analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users" className="text-xs rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white" data-testid="tab-users">User Management</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Category Bar Chart */}
              <div className="lg:col-span-2 card-premium p-6" data-testid="chart-by-category">
                <h3 className="text-sm font-semibold text-slate-700 font-['Outfit'] mb-4">Issues by Category</h3>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={categoryData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {categoryData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-slate-400 text-center py-12">No data yet</p>}
              </div>

              {/* SLA Compliance Ring */}
              <div className="card-premium p-6 flex flex-col items-center justify-center" data-testid="sla-compliance-card">
                <h3 className="text-sm font-semibold text-slate-700 font-['Outfit'] mb-6">SLA Compliance</h3>
                <div className="relative">
                  <SLARing percentage={slaCompliance} />
                </div>
                <p className="text-xs text-slate-400 mt-4">Target: &gt;80%</p>
              </div>

              {/* Status Donut */}
              <div className="card-premium p-6" data-testid="chart-by-status">
                <h3 className="text-sm font-semibold text-slate-700 font-['Outfit'] mb-4">Issues by Status</h3>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-slate-400 text-center py-12">No data yet</p>}
              </div>

              {/* Priority Breakdown */}
              <div className="card-premium p-6" data-testid="priority-breakdown">
                <h3 className="text-sm font-semibold text-slate-700 font-['Outfit'] mb-5">Priority Breakdown</h3>
                <div className="space-y-4">
                  {priorityData.map(p => (
                    <div key={p.name}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-600">{p.name}</span>
                        <span className="font-bold text-slate-800 tabular-nums">{p.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-700", p.color)} style={{ width: `${(p.count / totalPriority) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Stats */}
              <div className="card-premium p-6" data-testid="platform-stats">
                <h3 className="text-sm font-semibold text-slate-700 font-['Outfit'] mb-5">Platform Health</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <span className="text-sm text-slate-600 flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /> Total Users</span>
                    <span className="text-sm font-bold tabular-nums">{d?.total_users || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <span className="text-sm text-slate-600 flex items-center gap-2"><Shield className="w-4 h-4 text-slate-400" /> Officers</span>
                    <span className="text-sm font-bold tabular-nums">{d?.officers_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <span className="text-sm text-slate-600 flex items-center gap-2"><Activity className="w-4 h-4 text-slate-400" /> Resolution Rate</span>
                    <span className="text-sm font-bold tabular-nums">
                      {d?.total_tickets ? Math.round((resolvedCount / d.total_tickets) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="card-premium overflow-hidden" data-testid="users-table">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Name</th>
                      <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Email</th>
                      <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Role</th>
                      <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Change Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.user_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors" data-testid={`user-row-${u.user_id}`}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600">
                              {u.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <span className="text-sm font-medium text-slate-900">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">{u.email}</td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className="text-xs capitalize rounded-lg">{u.role}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <Select value={u.role} onValueChange={(v) => handleRoleChange(u.user_id, v)}>
                            <SelectTrigger className="h-8 w-[120px] text-xs rounded-lg" data-testid={`role-select-${u.user_id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="citizen">Citizen</SelectItem>
                              <SelectItem value="officer">Officer</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
