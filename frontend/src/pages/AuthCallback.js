import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const { googleAuth } = useAuth();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const sessionId = params.get("session_id");

    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        const data = await googleAuth(sessionId);
        // Clear hash
        window.history.replaceState(null, "", window.location.pathname);
        if (data.role === "admin") navigate("/admin", { replace: true });
        else if (data.role === "officer") navigate("/officer", { replace: true });
        else navigate("/dashboard", { replace: true });
      } catch {
        navigate("/login", { replace: true });
      }
    })();
  }, [googleAuth, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]" data-testid="auth-callback">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500">Authenticating...</p>
      </div>
    </div>
  );
}
