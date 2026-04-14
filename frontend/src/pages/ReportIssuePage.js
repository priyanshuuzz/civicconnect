import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import "@/lib/leaflet-setup";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Upload, X, Loader2, Sparkles, AlertTriangle, Navigation } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = {
  roads_footpaths: { name: "Roads & Footpaths", subcategories: ["Pothole", "Road damage", "Footpath broken", "Encroachment"] },
  sanitation_waste: { name: "Sanitation & Waste", subcategories: ["Garbage not collected", "Overflowing bin", "Open defecation", "Dead animal"] },
  water_drainage: { name: "Water & Drainage", subcategories: ["Water supply failure", "Low pressure", "Waterlogging", "Broken pipe", "Sewage overflow"] },
  electricity_lighting: { name: "Electricity & Lighting", subcategories: ["Streetlight not working", "Power outage", "Fallen wire", "Transformer issue"] },
  parks_public_spaces: { name: "Parks & Public Spaces", subcategories: ["Broken equipment", "Encroachment", "Vandalism", "Overgrown vegetation"] },
  stray_animals: { name: "Stray Animals", subcategories: ["Stray dogs", "Injured animal", "Animal menace"] },
  noise_pollution: { name: "Noise & Pollution", subcategories: ["Noise complaint", "Air pollution", "Water body pollution"] },
  other: { name: "Other", subcategories: ["Other"] },
};

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function ReportIssuePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", category: "", subcategory: "", address: "" });
  const [position, setPosition] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photoPaths, setPhotoPaths] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [gpsLoading, setGpsLoading] = useState(false);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setGpsLoading(false);
        toast.success("Location detected");
      },
      () => {
        setGpsLoading(false);
        toast.error("Could not detect location. Click on the map to set it manually.");
        setPosition([28.4089, 77.3178]); // Default: Faridabad
      }
    );
  }, []);

  useEffect(() => { detectLocation(); }, [detectLocation]);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 5) {
      toast.error("Maximum 5 photos allowed");
      return;
    }
    setUploading(true);
    const newPhotos = [...photos];
    const newPaths = [...photoPaths];
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        newPhotos.push({ name: file.name, preview: URL.createObjectURL(file) });
        newPaths.push(res.data.path);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setPhotos(newPhotos);
    setPhotoPaths(newPaths);
    setUploading(false);
  };

  const removePhoto = (idx) => {
    setPhotos(photos.filter((_, i) => i !== idx));
    setPhotoPaths(photoPaths.filter((_, i) => i !== idx));
  };

  const handleAICategorize = async () => {
    if (!form.description || form.description.length < 10) {
      toast.error("Please write a description first (at least 10 characters)");
      return;
    }
    setCategorizing(true);
    try {
      const res = await api.post("/ai/categorize", { text: form.description });
      setForm((f) => ({ ...f, category: res.data.category, subcategory: res.data.subcategory }));
      toast.success(`AI suggests: ${CATEGORIES[res.data.category]?.name} - ${res.data.subcategory} (${(res.data.confidence * 100).toFixed(0)}% confidence)`);
    } catch {
      toast.error("AI categorization failed");
    } finally {
      setCategorizing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!position) { toast.error("Please set location on the map"); return; }
    if (!form.category || !form.subcategory) { toast.error("Please select a category"); return; }
    setSubmitting(true);
    try {
      const res = await api.post("/tickets", {
        title: form.title, description: form.description, category: form.category,
        subcategory: form.subcategory, latitude: position[0], longitude: position[1],
        address: form.address, photos: photoPaths,
      });
      if (res.data.duplicates?.length > 0) {
        setDuplicates(res.data.duplicates);
        toast.info("Potential duplicate issues found nearby");
      }
      toast.success(`Ticket ${res.data.ticket.ticket_id} created!`);
      navigate(`/ticket/${res.data.ticket.ticket_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const subcategories = form.category ? CATEGORIES[form.category]?.subcategories || [] : [];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]">
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit'] tracking-tight" data-testid="report-heading">
            Report an Issue
          </h1>
          <p className="text-sm text-slate-500 mt-1">Help improve your neighborhood. Your report matters.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="report-form">
          {/* Title */}
          <div>
            <Label className="text-sm font-medium text-slate-700">Title</Label>
            <Input
              name="title" placeholder="e.g., Large pothole on Main Street"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              required className="mt-1" data-testid="report-title-input"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium text-slate-700">Description</Label>
            <Textarea
              name="description" placeholder="Describe the issue in detail..."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              required className="mt-1 min-h-[100px]" data-testid="report-description-input"
            />
            <Button
              type="button" variant="outline" size="sm" className="mt-2 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={handleAICategorize} disabled={categorizing} data-testid="ai-categorize-btn"
            >
              {categorizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              AI Auto-Categorize
            </Button>
          </div>

          {/* Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-slate-700">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, subcategory: "" })}>
                <SelectTrigger className="mt-1" data-testid="report-category-select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Subcategory</Label>
              <Select value={form.subcategory} onValueChange={(v) => setForm({ ...form, subcategory: v })} disabled={!form.category}>
                <SelectTrigger className="mt-1" data-testid="report-subcategory-select">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Photos */}
          <div>
            <Label className="text-sm font-medium text-slate-700">Photos (up to 5)</Label>
            <div className="mt-1">
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {photos.map((p, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                      <img src={p.preview} alt={p.name} className="w-full h-full object-cover" />
                      <button
                        type="button" onClick={() => removePhoto(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer"
                data-testid="photo-upload-zone"
              >
                <Upload className="w-6 h-6 text-slate-400" />
                <span className="text-sm text-slate-500">
                  {uploading ? "Uploading..." : "Click to upload photos"}
                </span>
                <input
                  type="file" accept="image/*" multiple className="hidden"
                  onChange={handlePhotoUpload} disabled={uploading || photos.length >= 5}
                />
              </label>
            </div>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm font-medium text-slate-700">Location</Label>
              <Button
                type="button" variant="ghost" size="sm" className="text-blue-600 gap-1 h-7 text-xs"
                onClick={detectLocation} disabled={gpsLoading} data-testid="detect-location-btn"
              >
                {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                Detect GPS
              </Button>
            </div>
            <div className="rounded-lg overflow-hidden border border-slate-200 h-[200px]" data-testid="location-map">
              {position && (
                <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationMarker position={position} setPosition={setPosition} />
                </MapContainer>
              )}
            </div>
            {position && (
              <p className="text-xs text-slate-500 mt-1">
                Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)} &mdash; Click map to adjust
              </p>
            )}
          </div>

          {/* Address */}
          <div>
            <Label className="text-sm font-medium text-slate-700">Address / Landmark (optional)</Label>
            <Input
              placeholder="Near City Mall, Sector 15..."
              value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1" data-testid="report-address-input"
            />
          </div>

          {/* Duplicates warning */}
          {duplicates.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4" data-testid="duplicate-warning">
              <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-2">
                <AlertTriangle className="w-4 h-4" /> Similar issues found nearby
              </div>
              {duplicates.map((d) => (
                <p key={d.ticket_id} className="text-xs text-amber-700">
                  {d.ticket_id}: {d.title} ({d.status}) &mdash; {Math.round(d.distance)}m away
                </p>
              ))}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
            disabled={submitting} data-testid="submit-report-btn"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </form>
      </div>
    </div>
  );
}
