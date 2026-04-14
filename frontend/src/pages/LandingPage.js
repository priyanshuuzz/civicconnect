import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { MapPin, CheckCircle, Clock, Shield, ArrowRight, BarChart3, MessageSquare } from "lucide-react";

const FEATURES = [
  { icon: MapPin, title: "Report Issues", desc: "Photo, GPS, and AI-powered categorization for fast routing to the right department." },
  { icon: Clock, title: "Track Progress", desc: "Real-time status updates from submission to resolution with SLA countdown." },
  { icon: MessageSquare, title: "Two-Way Chat", desc: "Communicate directly with officers handling your complaint, all in one thread." },
  { icon: Shield, title: "SLA Enforcement", desc: "Automatic escalation at 50%, 75%, and 100% of SLA time ensures accountability." },
  { icon: BarChart3, title: "Public Dashboard", desc: "Anonymized transparency map shows all active issues in your area." },
  { icon: CheckCircle, title: "Resolution Proof", desc: "Before-and-after photos and audit trails for every resolved complaint." },
];

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero */}
      <section className="relative overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900" />
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(https://static.prod-images.emergentagent.com/jobs/fdad9098-60aa-47f5-ae43-4362a3d2e2c5/images/3a2a27f5e37795b480cb8f52a7e0e395e805bbe8638de052e339ab1883a32f9e.png)` }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold tracking-wider uppercase mb-6 animate-fade-in-up">
              <MapPin className="w-3.5 h-3.5" /> Civic Tech Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white font-['Outfit'] tracking-tight leading-tight animate-fade-in-up" data-testid="hero-heading">
              Report. Track.<br />
              <span className="text-blue-400">Hold Accountable.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-lg animate-fade-in-up animate-delay-100">
              CivicConnect bridges the gap between citizens and government. Report civic issues, track resolution in real-time, and ensure public accountability.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 animate-fade-in-up animate-delay-200">
              {isAuthenticated ? (
                <Link to="/report">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 px-6" data-testid="hero-report-btn">
                    Report an Issue <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Link to="/register">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 px-6" data-testid="hero-get-started-btn">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              <Link to="/map">
                <Button size="lg" variant="outline" className="border-slate-500 text-white hover:bg-white/10 gap-2 h-12 px-6" data-testid="hero-map-btn">
                  <MapPin className="w-4 h-4" /> View Live Map
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24" data-testid="features-section">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-600 mb-2">Features</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 font-['Outfit'] tracking-tight">
            End-to-End Civic Issue Resolution
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200 group"
              data-testid={`feature-card-${i}`}
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                <f.icon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 font-['Outfit'] mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-16" data-testid="cta-section">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white font-['Outfit'] mb-4">
            Your City. Your Voice.
          </h2>
          <p className="text-slate-400 mb-8 text-base">
            Join thousands of citizens making their neighborhoods better. Every report counts.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to={isAuthenticated ? "/report" : "/register"}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-8" data-testid="cta-btn">
                {isAuthenticated ? "Report an Issue" : "Sign Up Free"}
              </Button>
            </Link>
            <Link to="/map">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-white/10 h-12 px-8">
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
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900 font-['Outfit']">CivicConnect</span>
          </div>
          <p className="text-xs text-slate-500">FS-01 Civic & Public Service Systems. Built for transparent governance.</p>
        </div>
      </footer>
    </div>
  );
}
