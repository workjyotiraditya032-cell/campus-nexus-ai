/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import InternshipRecommendation from "./components/InternshipRecommendation";
import ResumeAnalyzer from "./components/ResumeAnalyzer";
import CareerGapAnalyzer from "./components/CareerGapAnalyzer";
import React, { useState, useEffect } from "react";
import Auth from "./components/Auth";
import ProfileModule from "./components/ProfileModule";
import LostFoundIntelligence from "./components/LostFoundIntelligence";
import OpportunityEngine from "./components/OpportunityEngine";
import CareerAnalytics from "./components/CareerAnalytics";
import CampusAI from "./components/CampusAI";
import NotificationsComponent from "./components/NotificationsComponent";
import AdminPortal from "./components/AdminPortal";
import { User, SystemMetrics } from "./types";
import { api } from "./services/api";
import { 
  BookOpen, User as UserIcon, HelpCircle, Briefcase, Sparkles, Bell, 
  ShieldAlert, LogOut, LayoutDashboard, ChevronRight, Menu, X, Terminal,
  Clock, CheckCircle, GraduationCap, ArrowUpRight
} from "lucide-react";

type ActiveTab =
  | "dashboard"
  | "profile"
  | "lost_found"
  | "opportunities"
  | "analytics"
  | "career_gap"
  | "resume"
  | "internships"
  | "assistant"
  | "bulletins"
  | "admin";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);

  // Floating AI companion state
  const [showFloatingBot, setShowFloatingBot] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check existing session
  const checkSession = async () => {
    try {
      setSessionLoading(true);
      const u = await api.getSession();
      if (u) {
        setCurrentUser(u);
        
        // Fetch background stats
        const resp = await api.getAdminMetrics();
        setMetrics(resp.metrics);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out of Campus Nexus AI?")) {
      await api.logout();
      setCurrentUser(null);
      setMobileMenuOpen(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-500 font-sans">
        <LoaderSpinner />
        <span className="text-sm font-semibold mt-4 tracking-wide text-blue-900 animate-pulse">Initializing Campus Nexus AI Secure Core...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row justify-center items-center p-4 md:p-8">
        <Auth onLoginSuccess={(u) => { setCurrentUser(u); setActiveTab("dashboard"); }} />
      </div>
    );
  }
console.log("CURRENT USER", currentUser);
  const isAdmin = currentUser.role === "admin" || currentUser.role === "superadmin";

  return (
    <div id="campus_nexus_root_app" className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row text-slate-800 font-sans relative">
      
      {/* MOBILE HEADER OVERLAY */}
      <div className="md:hidden w-full bg-blue-950 text-white p-4 flex justify-between items-center z-30 shrink-0 shadow-md">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5.5 w-5.5 text-blue-400" />
          <span className="font-extrabold text-sm tracking-widest uppercase">Campus Nexus AI</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1 focus:outline-none">
          {mobileMenuOpen ? <X className="h-5.5 w-5.5" /> : <Menu className="h-5.5 w-5.5" />}
        </button>
      </div>

      {/* SIDEBAR NAVIGATION FRAME CONTAINER */}
      <aside 
        id="app_sidebar"
        className={`fixed md:sticky top-0 left-0 h-full md:h-screen w-64 bg-blue-950 text-white flex flex-col justify-between transition-transform duration-300 z-30 shadow-xl shrink-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-6 space-y-8 flex-1 overflow-y-auto">
          {/* Branded Identity header */}
          <div className="hidden md:flex items-center gap-2.5 pb-2 border-b border-blue-900">
            <BookOpen className="h-6 w-6 text-blue-400 shrink-0" />
            <div>
              <h1 className="font-extrabold text-sm letter tracking-wider uppercase text-slate-100">Campus Nexus AI</h1>
              <p className="text-[9px] text-blue-300 font-bold uppercase tracking-widest">Student Portal</p>
            </div>
          </div>

          {/* Connected student profile tag summary inline */}
          <div className="p-4 bg-blue-900/60 rounded-xl border border-blue-900 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-950 flex items-center justify-center border-2 border-blue-800 text-blue-300 font-bold overflow-hidden shrink-0">
              {currentUser.profilePhoto ? (
                <img src={currentUser.profilePhoto} alt="Header Avatar" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs text-slate-100 truncate">{currentUser.fullName}</p>
              <p className="text-[10px] text-blue-300 font-mono truncate uppercase font-bold tracking-wide">{currentUser.role === "student" ? `${currentUser.branch || 'Pending Setup'}` : "Staff Executive"}</p>
            </div>
          </div>

          {/* Selection items listings */}
          <nav className="space-y-1">
            <p className="text-[10px] text-blue-300 tracking-widest uppercase font-extrabold px-3.5 pb-1 select-none">Main Hub</p>
            
            <SidebarItem 
              id="nav_dashboard" active={activeTab === "dashboard"} icon={<LayoutDashboard className="h-4.5 w-4.5" />} label="Main Dashboard"
              onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }}
            />
            
            <SidebarItem 
              id="nav_profile" active={activeTab === "profile"} icon={<UserIcon className="h-4.5 w-4.5" />} label="My Profile Card"
              onClick={() => { setActiveTab("profile"); setMobileMenuOpen(false); }}
            />

            <SidebarItem 
              id="nav_lost_found" active={activeTab === "lost_found"} icon={<HelpCircle className="h-4.5 w-4.5" />} label="Lost & Found Match" 
              onClick={() => { setActiveTab("lost_found"); setMobileMenuOpen(false); }}
            />

            <SidebarItem 
              id="nav_opportunities" active={activeTab === "opportunities"} icon={<Briefcase className="h-4.5 w-4.5" />} label="Opportunities Feed"
              onClick={() => { setActiveTab("opportunities"); setMobileMenuOpen(false); }}
            />

            <SidebarItem 
              id="nav_analytics" active={activeTab === "analytics"} icon={<GraduationCap className="h-4.5 w-4.5" />} label="Career Path Score"
              onClick={() => { setActiveTab("analytics"); setMobileMenuOpen(false); }}
            />
           <SidebarItem
  id="nav_career_gap"
  active={activeTab === "career_gap"}
  icon={<GraduationCap className="h-4.5 w-4.5" />}
  label="Career Gap Analyzer"
  onClick={() => {
    setActiveTab("career_gap");
    setMobileMenuOpen(false);
  }}
/>
<SidebarItem
  id="nav_resume"
  active={activeTab === "resume"}
  icon={<BookOpen className="h-4.5 w-4.5" />}
  label="Resume Analyzer"
  onClick={() => {
    setActiveTab("resume");
    setMobileMenuOpen(false);
  }}
/>
<SidebarItem
  id="nav_internships"
  active={activeTab === "internships"}
  icon={<Briefcase className="h-4.5 w-4.5" />}
  label="Internship AI"
  onClick={() => {
    setActiveTab("internships");
    setMobileMenuOpen(false);
  }}
/>
            <SidebarItem 
              id="nav_assistant" active={activeTab === "assistant"} icon={<Sparkles className="h-4.5 w-4.5 text-yellow-300" />} label="Campus AI Assistant"
              onClick={() => { setActiveTab("assistant"); setMobileMenuOpen(false); }}
            />

            <SidebarItem 
              id="nav_bulletins" active={activeTab === "bulletins"} icon={<Bell className="h-4.5 w-4.5" />} label="Bulletin Feed Alerts"
              onClick={() => { setActiveTab("bulletins"); setMobileMenuOpen(false); }}
            />

            {/* Admin Console selector section strictly if authorized */}
            {isAdmin && (
              <div className="pt-4 space-y-1">
                <p className="text-[10px] text-emerald-400 tracking-widest uppercase font-extrabold px-3.5 pb-1 select-none">Staff Office</p>
                <SidebarItem 
                  id="nav_admin" active={activeTab === "admin"} icon={<ShieldAlert className="h-4.5 w-4.5 text-red-400" />} label="Control Administration"
                  onClick={() => { setActiveTab("admin"); setMobileMenuOpen(false); }}
                />
              </div>
            )}
          </nav>
        </div>

        {/* Action Bottom Section logout */}
        <div className="p-6 border-t border-blue-900 bg-blue-950 shrink-0">
          <button 
            id="btn_logout"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-900 border border-blue-800 hover:bg-blue-850 hover:border-blue-700 text-xs font-bold text-red-300 rounded-xl transition-all cursor-pointer shadow-sm select-none"
          >
            <LogOut className="h-4 w-4 text-red-405 shrink-0" />
            Logout System
          </button>
        </div>

      </aside>

      {/* MAIN SCREEN CANVAS VIEWPORT */}
      <main className="flex-1 min-w-0 overflow-y-auto h-screen p-4 md:p-8 space-y-8 relative pb-28">
        
        {/* Dynamic Screen Tab Contents */}

        {activeTab === "dashboard" && (
          <div id="view_dashboard_home" className="space-y-6">
            
            {/* Elegant Hero card welcome */}
            <div className="bg-white border rounded-2xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-slate-100">
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-emerald-50 text-emerald-800 border border-emerald-100">System Link: Active</span>
                <h1 className="text-3xl font-extrabold text-blue-950 font-sans tracking-tight">Welcome, {currentUser.fullName}!</h1>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xl">
                  Campus Nexus AI simplifies student profiles, matching lost items securely, forecasting career tracks, and delivering AI suggestions on your branch topics.
                </p>
              </div>

              {/* Fast analytics shortcuts */}
              <div className="flex gap-4 shrink-0 justify-center md:justify-start w-full md:w-auto">
                <button
                  onClick={() => setActiveTab("profile")}
                  className="px-4.5 py-2.5 border rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-xs border-slate-200 cursor-pointer"
                >
                  Verify Profile
                </button>
                <button
                  onClick={() => setActiveTab("assistant")}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-900 hover:bg-blue-955 text-white font-bold text-xs rounded-xl shadow cursor-pointer bg-blue-950"
                >
                  <Sparkles className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300" />
                  Ask Campus AI
                </button>
 <button
           onClick={() => setActiveTab("career_gap")}
           className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold">
            Career Gap Analyzer
</button>
              </div>
            </div>

            {/* Overview Quick Stats from metrics endpoints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
                <div className="p-3 bg-blue-50 text-blue-900 rounded-xl shrink-0">
                  <Briefcase className="h-5.5 w-5.5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Internships active</p>
                  <p className="text-xl font-extrabold text-blue-950 font-sans">{metrics?.opportunitiesPosted || 0} listings</p>
                  <button onClick={() => setActiveTab("opportunities")} className="text-[10px] text-blue-900 font-bold hover:underline inline-flex items-center gap-0.5">
                    Browse feed <ArrowUpRight className="h-2.5 w-2.5 shrink-0" />
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
                <div className="p-3 bg-indigo-50 text-indigo-900 rounded-xl shrink-0">
                  <Sparkles className="h-5.5 w-5.5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total reported incidents</p>
                  <p className="text-xl font-extrabold text-indigo-950 font-sans">{(metrics?.lostItems || 0) + (metrics?.foundItems || 0)} cases</p>
                  <button onClick={() => setActiveTab("lost_found")} className="text-[10px] text-indigo-700 font-bold hover:underline inline-flex items-center gap-0.5">
                    Check scan matches <ArrowUpRight className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center gap-4 shadow-xs">
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl shrink-0">
                  <GraduationCap className="h-5.5 w-5.5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Institutional members</p>
                  <p className="text-xl font-extrabold text-emerald-950 font-sans">{(metrics?.totalStudents || 1)} profiles</p>
                  <button onClick={() => setActiveTab("analytics")} className="text-[10px] text-emerald-800 font-bold hover:underline inline-flex items-center gap-0.5">
                    Examine placement matrix <ArrowUpRight className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* Simple Dashboard visual flow details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 block border-b pb-2 select-none">Your Campus Nexus AI checklist</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border space-y-1.5 text-xs">
                    <p className="font-extrabold text-blue-950">1. Update Career Profiles</p>
                    <p className="text-slate-500 leading-relaxed">Provide your Skills, R&D Projects, and upload your resume so placement systems can compute alerts.</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border space-y-1.5 text-xs">
                    <p className="font-extrabold text-indigo-950">2. Active Scanning Scan</p>
                    <p className="text-slate-500 leading-relaxed">File lost tags coordinates or explore checked found items in real-time. System triggers smart alerts on overlaps.</p>
                  </div>
                </div>

                {/* Info status terminal panel */}
                <div className="p-4 bg-slate-950 text-slate-300 rounded-xl font-mono text-[11px] leading-relaxed select-none space-y-1 border border-slate-800">
                  <p className="text-emerald-400 font-bold">▶ SYSTEM DIAGNOSTICS: INITIALIZED</p>
                  <p>• NODE_CLIENT_PORT: 3000 (SECURE REVERSE PROXY LAYER)</p>
                  <p>• INTEL_ALGORITHM: PARSING TEXT CROSS-VECTORS ENGINE</p>
                  <p>• ACADEMIC_TARGET_BRANCH: {currentUser.branch || "PENDING REGISTERED"}</p>
                </div>
              </div>

              {/* Sidebar bulletins summaries */}
              <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-905 text-slate-900 block border-b pb-2 select-none">Quick Bulletin summary</h3>
                <NotificationsComponent userId={currentUser.id} />
              </div>

            </div>

          </div>
        )}

        {activeTab === "profile" && (
          <ProfileModule userId={currentUser.id} />
        )}

        {activeTab === "lost_found" && (
          <LostFoundIntelligence userId={currentUser.id} />
        )}

        {activeTab === "opportunities" && (
          <OpportunityEngine user={currentUser} />
        )}

        {activeTab === "analytics" && (
          <CareerAnalytics userId={currentUser.id} />
        )}
        {activeTab === "career_gap" && (
  <CareerGapAnalyzer />
)}
{activeTab === "resume" && (
  <ResumeAnalyzer />
)}
{activeTab === "internships" && (
  <InternshipRecommendation
    userId={currentUser.id}
  />
)}
        {activeTab === "assistant" && (
          <CampusAI user={currentUser} />
        )}

        {activeTab === "bulletins" && (
          <NotificationsComponent userId={currentUser.id} />
        )}

        {activeTab === "admin" && isAdmin && (
          <AdminPortal adminUser={currentUser} />
        )}

      </main>

      {/* FLOAT BOT OVERLAY ACTION BUTTON */}
      {activeTab !== "assistant" && (
        <div className="fixed bottom-6 right-6 z-40 select-none">
          {showFloatingBot ? (
            <CampusAI 
              user={currentUser} 
              isFloating={true} 
              onCloseFloating={() => setShowFloatingBot(false)} 
            />
          ) : (
            <button
              id="fab_open_bot"
              onClick={() => setShowFloatingBot(true)}
              className="h-14 w-14 rounded-full bg-blue-900 border border-blue-950 text-white flex items-center justify-center shadow-2xl hover:bg-blue-952 transition-transform cursor-pointer hover:scale-105 active:scale-95 px-1 animate-pulse"
              title="Speak with Campus AI"
            >
              <Sparkles className="h-6 w-6 text-yellow-300 fill-yellow-300" />
            </button>
          )}
        </div>
      )}

    </div>
  );
}

// Side Item subcomp
interface SidebarItemProps {
  id: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function SidebarItem({ id, active, icon, label, onClick }: SidebarItemProps) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-left cursor-pointer select-none ${active ? "bg-blue-900 border-l-4 border-l-blue-400 text-white font-extrabold shadow-inner" : "text-blue-200 hover:bg-blue-900/40 hover:text-white"}`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
      {active && <ChevronRight className="h-3 ml-auto text-blue-400 shrink-0" />}
    </button>
  );
}

// Loader Sub component
function LoaderSpinner() {
  return (
    <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900" />
      <BookOpen className="h-4.5 w-4.5 text-blue-900 absolute" />
    </div>
  );
}
