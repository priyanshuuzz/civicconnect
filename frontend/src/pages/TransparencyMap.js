import { useState, useEffect, useMemo } from "react";
import { getMapComplaints } from "@/lib/firebaseService";
import L from "@/lib/leaflet-setup";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Filter, MapPin, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS = {
  roads_footpaths: "Roads & Footpaths", sanitation_waste: "Sanitation & Waste",
  water_drainage: "Water & Drainage", electricity_lighting: "Electricity & Lighting",
  parks_public_spaces: "Parks & Public Spaces", stray_animals: "Stray Animals",
  noise_pollution: "Noise & Pollution", other: "Other",
};
const CATEGORY_COLORS = {
  roads_footpaths: "#EF4444", sanitation_waste: "#F59E0B", water_drainage: "#3B82F6",
  electricity_lighting: "#8B5CF6", parks_public_spaces: "#10B981", stray_animals: "#EC4899",
  noise_pollution: "#6B7280", other: "#A855F7",
};

function createCategoryIcon(category, priority) {
  const color = CATEGORY_COLORS[category] || "#6B7280";
  const size = priority === "CRITICAL" ? 34 : 28;
  const pulse = priority === "CRITICAL" ? `<div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${color};opacity:0.4;animation:ping 1.5s infinite"></div>` : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size}px">
      ${pulse}
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25)"></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function FitBounds({ tickets }) {
  const map = useMap();
  useEffect(() => {
    if (tickets.length > 0) {
      const bounds = L.latLngBounds(tickets.map(t => {
        // Handle GeoPoint format
        if (t.location._lat !== undefined && t.location._long !== undefined) {
          return [t.location._lat, t.location._long];
        }
        // Handle coordinates array
        return [t.location.coordinates[1], t.location.coordinates[0]];
      }));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [tickets, map]);
  return null;
}

export default function TransparencyMap() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const filters = {};
        if (categoryFilter !== "all") filters.category = categoryFilter;
        if (statusFilter !== "all") filters.status = statusFilter;
        
        const complaints = await getMapComplaints(filters);
        setTickets(complaints);
      } catch (error) {
        console.error("Failed to fetch map tickets:", error);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [categoryFilter, statusFilter]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Check if location exists and has valid coordinates
      if (!t.location) return false;
      
      // Handle GeoPoint format from Firestore
      if (t.location._lat !== undefined && t.location._long !== undefined) {
        return true;
      }
      
      // Handle coordinates array format
      if (t.location.coordinates && Array.isArray(t.location.coordinates) && t.location.coordinates.length === 2) {
        return true;
      }
      
      return false;
    });
  }, [tickets]);
  
  // Calculate SLA breached count
  const now = new Date();
  const breachedCount = filteredTickets.filter(t => {
    const slaDeadline = new Date(t.slaDeadline);
    return now > slaDeadline;
  }).length;
  
  const openCount = filteredTickets.filter(t => ["submitted", "assigned", "in_progress"].includes(t.status)).length;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC] flex flex-col" data-testid="transparency-map-page">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-['Outfit']" data-testid="map-heading">
              Public Transparency Map
            </h1>
            <p className="text-xs text-slate-500">{filteredTickets.length} active issues across the city</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Stat pills */}
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold">
                <AlertTriangle className="w-3 h-3" />{openCount} Open
              </span>
              {breachedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-[10px] font-bold">
                  <Clock className="w-3 h-3" />{breachedCount} Breached
                </span>
              )}
            </div>
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-[160px] text-xs rounded-xl bg-white" data-testid="map-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[130px] text-xs rounded-xl bg-white" data-testid="map-status-filter">
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
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <div className="card-premium px-5 py-3 flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-xs text-slate-600 font-medium">Loading map data...</span>
            </div>
          </div>
        )}
        <MapContainer center={[28.4089, 77.3178]} zoom={12} style={{ height: "calc(100vh - 64px - 60px)", width: "100%" }} scrollWheelZoom={true}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          {filteredTickets.length > 0 && <FitBounds tickets={filteredTickets} />}
          {filteredTickets.map(t => {
            // Extract lat/lng from GeoPoint or coordinates array
            let lat, lng;
            if (t.location._lat !== undefined && t.location._long !== undefined) {
              lat = t.location._lat;
              lng = t.location._long;
            } else if (t.location.coordinates) {
              lng = t.location.coordinates[0];
              lat = t.location.coordinates[1];
            }
            
            return (
              <Marker key={t.ticket_id} position={[lat, lng]} icon={createCategoryIcon(t.category, t.priority)}>
                <Popup>
                  <div className="min-w-[200px] p-1" data-testid={`map-popup-${t.ticket_id}`}>
                    <div className="flex items-center gap-1 mb-1.5">
                      <Badge variant="outline" className={cn("text-[9px] rounded-md", `status-${t.status}`)}>{t.status?.replace("_", " ")}</Badge>
                      <Badge variant="outline" className={cn("text-[9px] rounded-md", `priority-${t.priority}`)}>{t.priority}</Badge>
                    </div>
                    <p className="font-semibold text-sm text-slate-900">{t.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{CATEGORY_LABELS[t.category]} &middot; {t.subcategory}</p>
                    {t.address && <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{t.address}</p>}
                    <p className="text-[10px] text-slate-400 mt-1.5">{new Date(t.createdAt).toLocaleDateString()}</p>
                    {t.slaDeadline && (
                      <div className="mt-2">
                        {(() => {
                          const now = new Date();
                          const created = new Date(t.createdAt);
                          const deadline = new Date(t.slaDeadline);
                          const total = deadline - created;
                          const elapsed = now - created;
                          const slaPercent = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
                          
                          return (
                            <>
                              <div className="sla-track h-1.5">
                                <div className={cn("sla-bar", slaPercent < 50 ? "bg-emerald-500" : slaPercent < 75 ? "bg-amber-400" : "bg-red-500")}
                                  style={{ width: `${Math.min(100, slaPercent)}%` }} />
                              </div>
                              <p className="text-[9px] text-slate-400 mt-0.5">SLA: {Math.round(slaPercent)}%</p>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legend Card */}
        <div className="absolute bottom-5 left-5 z-[1000] card-premium p-4 max-w-[240px]" data-testid="map-legend">
          <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2.5">Categories</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: CATEGORY_COLORS[k] }} />
                <span className="text-[10px] text-slate-600 truncate">{v}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 mt-3 pt-2.5">
            <p className="text-[10px] text-slate-400">Larger markers = Critical priority</p>
          </div>
        </div>
      </div>
    </div>
  );
}
