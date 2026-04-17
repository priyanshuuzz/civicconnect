import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ReportIssuePage from "@/pages/ReportIssuePage";
import CitizenDashboard from "@/pages/CitizenDashboard";
import TicketDetailPage from "@/pages/TicketDetailPage";
import TransparencyMap from "@/pages/TransparencyMap";
import OfficerDashboard from "@/pages/OfficerDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";

// Import Firebase debug utility
import { validateFirebaseSetup } from "@/lib/firebaseDebug";

// Validate Firebase on app load
validateFirebaseSetup().then(results => {
  if (!results.initialized) {
    console.error("⚠️ Firebase initialization issues detected!");
    console.error("Errors:", results.errors);
  }
});

function ProtectedRoute({ children, roles }) {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRouter() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/map" element={<TransparencyMap />} />
        <Route path="/dashboard" element={<ProtectedRoute><CitizenDashboard /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><ReportIssuePage /></ProtectedRoute>} />
        <Route path="/ticket/:id" element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />
        <Route path="/officer" element={<ProtectedRoute roles={["officer", "admin"]}><OfficerDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
