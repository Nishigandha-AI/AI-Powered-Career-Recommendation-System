import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutDashboard, User, Sparkles, Map, BookOpen, Briefcase, MessageSquare, LogOut } from "lucide-react";
import Overview from "./dashboard/Overview";
import Profile from "./dashboard/Profile";
import Recommendations from "./dashboard/Recommendations";
import Roadmap from "./dashboard/Roadmap";
import Resources from "./dashboard/Resources";
import Jobs from "./dashboard/Jobs";
import Chatbot from "./dashboard/Chatbot";
import ThemeToggle from "../components/ThemeToggle";

const NAV = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/recommendations", label: "Careers", icon: Sparkles },
  { to: "/app/roadmap", label: "Roadmap", icon: Map },
  { to: "/app/resources", label: "Resources", icon: BookOpen },
  { to: "/app/jobs", label: "Jobs", icon: Briefcase },
  { to: "/app/chat", label: "AI Coach", icon: MessageSquare },
  { to: "/app/profile", label: "Profile", icon: User },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#DEE2E6] flex flex-col sticky top-0 h-screen" data-testid="dashboard-sidebar">
        <div className="p-6 border-b border-[#DEE2E6]">
          <button onClick={() => nav("/")} className="font-heading font-black text-lg tracking-tight" data-testid="sidebar-logo-btn">
            CareerMap<span className="text-[#002FA7]">.</span>AI
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                    isActive ? "bg-[#002FA7] text-white" : "text-[#495057] hover:bg-[#F1F3F5] hover:text-[#0A0A0A]"
                  }`
                }
                data-testid={`nav-${n.label.toLowerCase().replace(/ /g,'-')}-link`}
              >
                <Icon size={18} strokeWidth={1.75} />
                {n.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[#DEE2E6]">
          <ThemeToggle />
          <div className="px-2 pt-3 pb-2">
            <div className="text-sm font-semibold truncate" data-testid="sidebar-username">{user?.full_name}</div>
            <div className="text-xs text-[#868E96] truncate">{user?.email}</div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-[#495057] hover:text-[#0A0A0A] px-2 py-2 w-full" data-testid="sidebar-logout-btn">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="profile" element={<Profile />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="resources" element={<Resources />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="chat" element={<Chatbot />} />
        </Routes>
      </main>
    </div>
  );
}
