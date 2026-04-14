import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import L from "@/lib/leaflet-setup";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Filter, MapPin } from "lucide-react";
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

function createCategoryIcon(category) {
  const color = CATEGORY_COLORS[category] || "#6B7280";
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function FitBounds({ tickets }) {
  const map = useMap();
  useEffect(() => {
    if (tickets.length > 0) {
      const bounds = L.latLngBounds(
        tickets.map((t) => [t.location.coordinates[1], t.location.coordinates[0]])
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
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
        const params = {};
        if (categoryFilter !== "all") params.category = categoryFilter;
        if (statusFilter !== "all") params.status = statusFilter;
        const res = await api.get("/map/tickets", { params });
        setTickets(res.data.tickets);
      } catch {
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [categoryFilter, statusFilter]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => t.location?.coordinates?.length === 2);
  }, [tickets]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC] flex flex-col" data-testid="transparency-map-page">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-['Outfit']" data-testid="map-heading">
              Public Transparency Map
            </h1>
            <p className="text-xs text-slate-500">{filteredTickets.length} active issues</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 w-[160px] text-xs" data-testid="map-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs" data-testid="map-status-filter">
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
          <div className="absolute inset-0 z-10 bg-white/60 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        )}
        <MapContainer
          center={[28.4089, 77.3178]}
          zoom={12}
          style={{ height: "calc(100vh - 64px - 56px)", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          {filteredTickets.length > 0 && <FitBounds tickets={filteredTickets} />}
          {filteredTickets.map((t) => (
            <Marker
              key={t.ticket_id}
              position={[t.location.coordinates[1], t.location.coordinates[0]]}
              icon={createCategoryIcon(t.category)}
            >
              <Popup>
                <div className="min-w-[180px]" data-testid={`map-popup-${t.ticket_id}`}>
                  <div className="flex items-center gap-1 mb-1">
                    <Badge variant="secondary" className={cn("text-[9px]", `status-${t.status}`)}>
                      {t.status?.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[9px]", `priority-${t.priority}`)}>
                      {t.priority}
                    </Badge>
                  </div>
                  <p className="font-semibold text-sm text-slate-900">{t.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{CATEGORY_LABELS[t.category]} &middot; {t.subcategory}</p>
                  {t.address && <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{t.address}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(t.created_at).toLocaleDateString()}</p>
                  {t.sla_percentage > 0 && (
                    <div className="mt-1.5">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            t.sla_percentage < 50 ? "bg-emerald-500" : t.sla_percentage < 75 ? "bg-yellow-500" : "bg-red-500"
                          )}
                          style={{ width: `${Math.min(100, t.sla_percentage)}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 mt-0.5">SLA: {Math.round(t.sla_percentage)}%</p>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-md border border-slate-200 rounded-lg shadow-lg p-3" data-testid="map-legend">
          <p className="text-xs font-semibold text-slate-700 mb-2">Categories</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[k] }} />
                <span className="text-[10px] text-slate-600 truncate">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
