import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { createComplaint, uploadComplaintImage, CATEGORIES } from "@/lib/firebaseService";
import "@/lib/leaflet-setup";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Upload, X, Loader2, Sparkles, AlertTriangle, Navigation } from "lucide-react";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", category: "", subcategory: "", address: "" });
  const [position, setPosition] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }
    
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!position) { toast.error("Please set location on the map"); return; }
    if (!form.category || !form.subcategory) { toast.error("Please select a category"); return; }
    
    setSubmitting(true);
    try {
      let imageUrl = "";
      
      // Upload image first if exists
      if (photoFile) {
        setUploading(true);
        const tempComplaintId = `temp_${Date.now()}`;
        imageUrl = await uploadComplaintImage(photoFile, tempComplaintId);
        setUploading(false);
      }
      
      // Create complaint
      const complaintData = {
        title: form.title,
        description: form.description,
        category: form.category,
        subcategory: form.subcategory,
        latitude: position[0],
        longitude: position[1],
        address: form.address,
        imageUrl
      };
      
      const result = await createComplaint(complaintData, user.user_id, user.name);
      
      toast.success(`Complaint ${result.id} created successfully!`);
      navigate(`/ticket/${result.id}`);
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const subcategories = form.category ? CATEGORIES[form.category]?.subcategories || [] : [];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit'] tracking-tight" data-testid="report-heading">
            Report an Issue
          </h1>
          <p className="text-sm text-slate-500 mt-1">Help improve your neighborhood. Your report matters.</p>
        </div>

        <form onSubmit={handleSubmit} className="card-premium p-6 sm:p-8 space-y-6" data-testid="report-form">
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

          {/* Photo */}
          <div>
            <Label className="text-sm font-medium text-slate-700">Photo (optional)</Label>
            <div className="mt-1">
              {photoPreview && (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-200 mb-3">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button" onClick={removePhoto}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {!photoPreview && (
                <label
                  className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-blue-50/30 hover:border-blue-300 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer"
                  data-testid="photo-upload-zone"
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-sm text-slate-500">
                    {uploading ? "Uploading..." : "Click to upload photo"}
                  </span>
                  <input
                    type="file" accept="image/*" className="hidden"
                    onChange={handlePhotoUpload} disabled={uploading}
                  />
                </label>
              )}
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
            <div className="rounded-xl overflow-hidden border border-slate-200 h-[220px] shadow-sm" data-testid="location-map">
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

          {/* Submit */}
          <Button
            type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl shadow-sm shadow-blue-200 text-sm font-semibold"
            disabled={submitting || uploading} data-testid="submit-report-btn"
          >
            {(submitting || uploading) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {uploading ? "Uploading..." : submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </form>
      </div>
    </div>
  );
}
