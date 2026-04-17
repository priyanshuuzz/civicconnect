import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { MapPin, CheckCircle, Clock, Shield, ArrowRight, BarChart3, MessageSquare, Zap, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: MapPin, title: "Report Issues", desc: "Photo, GPS, and AI-powered categorization for fast routing to the right department.", color: "bg-red-50 text-red-600" },
  { icon: Clock, title: "Track Progress", desc: "Real-time status updates from submission to resolution with SLA countdown.", color: "bg-blue-50 text-blue-600" },
  { icon: MessageSquare, title: "Two-Way Chat", desc: "Communicate directly with officers handling your complaint, all in one thread.", color: "bg-violet-50 text-violet-600" },
  { icon: Shield, title: "SLA Enforcement", desc: "Automatic escalation at 50%, 75%, and 100% of SLA time ensures accountability.", color: "bg-amber-50 text-amber-600" },
  { icon: Eye, title: "Public Dashboard", desc: "Anonymized transparency map shows all active issues in your area.", color: "bg-emerald-50 text-emerald-600" },
  { icon: CheckCircle, title: "Resolution Proof", desc: "Before-and-after photos and audit trails for every resolved complaint.", color: "bg-slate-100 text-slate-600" },
];

const STATS = [
  { value: "50K+", label: "Citizens Served" },
  { value: "80%", label: "Resolved in SLA" },
  { value: "<4h", label: "First Response" },
  { value: "98%", label: "Satisfaction" },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero */}
      <section className="relative overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 opacity-15 bg-cover bg-center"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1920)` }} />
        {/* Decorative grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/20 text-blue-300 text-[11px] font-semibold tracking-widest uppercase mb-8 opacity-0 animate-fade-in-up">
              <Zap className="w-3.5 h-3.5" /> Smart City Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white font-['Outfit'] tracking-tight leading-[1.1] opacity-0 animate-fade-in-up animate-delay-100" data-testid="hero-heading">
              Report. Track.<br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Hold Accountable.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-slate-400 leading-relaxed max-w-lg opacity-0 animate-fade-in-up animate-delay-200">
              CivicConnect bridges the gap between citizens and government. Report civic issues, track resolution in real-time, and ensure public accountability.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 opacity-0 animate-fade-in-up animate-delay-300">
              {isAuthenticated ? (
                <Link to="/report">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white gap-2 h-12 px-7 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40" data-testid="hero-report-btn">
                    Report an Issue <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Link to="/register">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white gap-2 h-12 px-7 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40" data-testid="hero-get-started-btn">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              <Link to="/map">
                <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-white/5 hover:border-slate-500 gap-2 h-12 px-7 rounded-xl transition-all" data-testid="hero-map-btn">
                  <MapPin className="w-4 h-4" /> View Live Map
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="relative -mt-8 z-10 max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <div key={s.label} className={cn("card-premium p-5 text-center opacity-0 animate-count-up", `animate-delay-${(i + 1) * 100}`)}>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit'] tabular-nums">{s.value}</p>
              <p className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28" data-testid="features-section">
        <div className="text-center mb-14">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-blue-600 mb-3">Features</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit'] tracking-tight">
            End-to-End Civic Issue Resolution
          </h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">From reporting to resolution, every step is tracked, transparent, and accountable.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="card-premium p-6 group" data-testid={`feature-card-${i}`}>
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-110", f.color)}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 font-['Outfit'] mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 relative overflow-hidden" data-testid="cta-section">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(59,130,246,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139,92,246,0.2) 0%, transparent 50%)'
        }} />
        <div className="relative max-w-3xl mx-auto text-center px-4 py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit'] mb-4">
            Your City. Your Voice.
          </h2>
          <p className="text-slate-400 mb-10 text-base max-w-md mx-auto">
            Join thousands of citizens making their neighborhoods better. Every report counts.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to={isAuthenticated ? "/report" : "/register"}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white h-12 px-8 rounded-xl shadow-lg shadow-blue-500/25" data-testid="cta-btn">
                {isAuthenticated ? "Report an Issue" : "Sign Up Free"}
              </Button>
            </Link>
            <Link to="/map">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-white/5 h-12 px-8 rounded-xl">
                Explore Map
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900 font-['Outfit']">CivicConnect</span>
          </div>
          <p className="text-xs text-slate-400">FS-01 Civic & Public Service Systems. Built for transparent governance.</p>
        </div>
      </footer>
    </div>
  );
}
