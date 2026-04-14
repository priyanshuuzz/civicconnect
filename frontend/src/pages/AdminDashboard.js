import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, Users, AlertTriangle, CheckCircle, Clock, Shield, Loader2, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const CATEGORY_LABELS = {
  roads_footpaths: "Roads", sanitation_waste: "Sanitation", water_drainage: "Water",
  electricity_lighting: "Electricity", parks_public_spaces: "Parks", stray_animals: "Animals",
  noise_pollution: "Noise", other: "Other",
};
const PIE_COLORS = ["#2563EB", "#7C3AED", "#F59E0B", "#10B981", "#EF4444"];

function StatCard({ label, value, icon: Icon, color, subtitle }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow" data-testid={`admin-stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-900 font-['Outfit'] mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
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
        const [dashRes, usersRes] = await Promise.all([
          api.get("/admin/dashboard"),
          api.get("/admin/users"),
        ]);
        setDashData(dashRes.data);
        setUsers(usersRes.data.users);
      } catch {
        toast.error("Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      toast.success("Role updated");
      setUsers(users.map((u) => u.user_id === userId ? { ...u, role: newRole } : u));
    } catch {
      toast.error("Failed to update role");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  const d = dashData;
  const openCount = d ? (d.by_status.submitted + d.by_status.assigned + d.by_status.in_progress) : 0;
  const resolvedCount = d ? d.by_status.resolved + d.by_status.closed : 0;
  const slaCompliance = d && d.total_tickets > 0
    ? Math.round(((d.total_tickets - d.sla_breached) / d.total_tickets) * 100)
    : 100;

  const categoryData = d ? Object.entries(d.by_category)
    .map(([k, v]) => ({ name: CATEGORY_LABELS[k] || k, value: v }))
    .filter((x) => x.value > 0) : [];

  const statusData = d ? [
    { name: "Submitted", value: d.by_status.submitted, fill: "#3B82F6" },
    { name: "Assigned", value: d.by_status.assigned, fill: "#8B5CF6" },
    { name: "In Progress", value: d.by_status.in_progress, fill: "#F59E0B" },
    { name: "Resolved", value: d.by_status.resolved, fill: "#10B981" },
    { name: "Closed", value: d.by_status.closed, fill: "#6B7280" },
  ].filter((x) => x.value > 0) : [];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit'] tracking-tight" data-testid="admin-heading">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">City-wide analytics and platform management</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total Issues" value={d?.total_tickets || 0} icon={BarChart3} color="bg-blue-600" />
          <StatCard label="Open" value={openCount} icon={AlertTriangle} color="bg-amber-500" />
          <StatCard label="Resolved" value={resolvedCount} icon={CheckCircle} color="bg-emerald-500" />
          <StatCard label="SLA Breached" value={d?.sla_breached || 0} icon={Clock} color="bg-red-500" />
          <StatCard label="SLA Compliance" value={`${slaCompliance}%`} icon={TrendingUp} color="bg-indigo-500" subtitle="Target: >80%" />
        </div>

        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">User Management</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* By Category */}
              <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="chart-by-category">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Issues by Category</h3>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
                )}
              </div>

              {/* By Status */}
              <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="chart-by-status">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Issues by Status</h3>
                {statusData.length > 0 ? (
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {statusData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
                )}
              </div>

              {/* Priority breakdown */}
              <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="priority-breakdown">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">By Priority</h3>
                <div className="space-y-3">
                  {d && ["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => (
                    <div key={p} className="flex items-center justify-between">
                      <Badge variant="outline" className={cn("text-[10px] font-bold", `priority-${p}`)}>{p}</Badge>
                      <span className="text-sm font-semibold text-slate-700">{d.by_priority[p] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform stats */}
              <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="platform-stats">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Platform Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 flex items-center gap-2"><Users className="w-4 h-4" /> Total Users</span>
                    <span className="text-sm font-semibold">{d?.total_users || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 flex items-center gap-2"><Shield className="w-4 h-4" /> Officers</span>
                    <span className="text-sm font-semibold">{d?.officers_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid="users-table">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Name</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Email</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Role</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.user_id} className="border-b border-slate-100" data-testid={`user-row-${u.user_id}`}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{u.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Select value={u.role} onValueChange={(v) => handleRoleChange(u.user_id, v)}>
                            <SelectTrigger className="h-8 w-[120px] text-xs" data-testid={`role-select-${u.user_id}`}>
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
