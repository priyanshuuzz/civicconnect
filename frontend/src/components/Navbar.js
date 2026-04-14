import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, MapPin, User, LogOut, LayoutDashboard, Shield, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const getDashboardLink = () => {
    if (!user) return "/dashboard";
    if (user.role === "admin") return "/admin";
    if (user.role === "officer") return "/officer";
    return "/dashboard";
  };

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" data-testid="navbar-logo">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 font-['Outfit'] tracking-tight">
              CivicConnect
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/map" data-testid="nav-map-link">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                <MapPin className="w-4 h-4 mr-1.5" /> Transparency Map
              </Button>
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/report" data-testid="nav-report-link">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                    <AlertTriangle className="w-4 h-4 mr-1.5" /> Report Issue
                  </Button>
                </Link>
                <Link to={getDashboardLink()} data-testid="nav-dashboard-link">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                    <LayoutDashboard className="w-4 h-4 mr-1.5" /> Dashboard
                  </Button>
                </Link>
                {user?.role === "admin" && (
                  <Link to="/admin" data-testid="nav-admin-link">
                    <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                      <Shield className="w-4 h-4 mr-1.5" /> Admin
                    </Button>
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" data-testid="user-menu-trigger">
                    <User className="w-4 h-4" />
                    <span className="max-w-[120px] truncate">{user?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(getDashboardLink())} data-testid="menu-dashboard">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600" data-testid="menu-logout">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" data-testid="nav-login-btn">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="nav-register-btn">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-toggle">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 py-3 space-y-1">
            <Link to="/map" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md">
              Transparency Map
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/report" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md">
                  Report Issue
                </Link>
                <Link to={getDashboardLink()} onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md">
                  Sign In
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md">
                  Get Started
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
