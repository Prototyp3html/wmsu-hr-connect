import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  ClipboardList,
  Award,
  FileBarChart,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "staff"] },
  { to: "/vacancies", label: "Job Vacancies", icon: Briefcase, roles: ["admin", "staff"] },
  { to: "/applicants", label: "Applicants", icon: Users, roles: ["admin", "staff"] },
  { to: "/tracking", label: "Application Tracking", icon: ClipboardList, roles: ["admin", "staff"] },
  { to: "/evaluations", label: "Evaluations", icon: Award, roles: ["admin", "staff"] },
  { to: "/reports", label: "Reports", icon: FileBarChart, roles: ["admin", "staff"] },
  { to: "/users", label: "User Management", icon: Settings, roles: ["admin"] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "sidebar-gradient flex flex-col h-screen sticky top-0 transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center flex-shrink-0">
          <img src="/wmsu-seal.png" alt="WMSU seal" className="w-9 h-9" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-sidebar-accent-foreground font-display truncate">WMSU HRMS</h1>
            <p className="text-[10px] text-sidebar-muted truncate">Hiring Monitoring System</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => user && item.roles.includes(user.role))
          .map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && user && (
          <div className="px-2 py-1">
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user.name}</p>
            <p className="text-[10px] text-sidebar-muted truncate capitalize">{user.role === "admin" ? "HR Admin" : "HR Staff"}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-1.5 text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
