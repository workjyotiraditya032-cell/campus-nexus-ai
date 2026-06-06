/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Opportunity, User } from "../types";
import { 
  Briefcase, Calendar, MapPin, ExternalLink, Bookmark, Sparkles, Filter, Search, 
  Plus, Edit2, Trash2, Check, Star, Hourglass, Trash, CheckCircle2, ChevronRight, BookmarkCheck
} from "lucide-react";

interface OpportunityEngineProps {
  user: User;
}

export default function OpportunityEngine({ user }: OpportunityEngineProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [opps, setOpps] = useState<Opportunity[]>([]);
  const isAdmin = user.role === "admin" || user.role === "superadmin";

  // Filter keys
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState("All");
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Saved bookmark cache locally
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Creation / Edit modal state
  const [showFormModal, setShowFormModal] = useState<"create" | "edit" | null>(null);
  const [editingOppId, setEditingOppId] = useState<string | null>(null);
  
  // Handlers state
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [opportunityType, setOpportunityType] = useState<Opportunity["opportunityType"]>("Internship");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [applyLink, setApplyLink] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  const opportunityTypes = [
    "Internship",
    "Hackathon",
    "Scholarship",
    "Competition",
    "Workshop",
    "Seminar",
    "Placement Drive",
    "Campus Event"
  ];

  const fetchOpps = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await api.getOpportunities();
      setOpps(list);
    } catch (err: any) {
      setError(err?.message || "Failed to load opportunity engine lists.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpps();
    // Load local saves
    const saves = localStorage.getItem(`saved_opps_${user.id}`);
    if (saves) {
      setSavedIds(JSON.parse(saves));
    }
  }, [user.id]);

  const handleToggleSave = (id: string) => {
    let updated: string[] = [];
    if (savedIds.includes(id)) {
      updated = savedIds.filter(saved => saved !== id);
    } else {
      updated = [...savedIds, id];
    }
    setSavedIds(updated);
    localStorage.setItem(`saved_opps_${user.id}`, JSON.stringify(updated));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !company || !applyLink) return;
    setLoading(true);

    const payload = {
      title,
      company,
      opportunityType,
      description,
      location,
      applyLink,
      deadline,
      isFeatured,
    };

    try {
      if (showFormModal === "create") {
        await api.createOpportunity(payload);
        setSuccess("Opportunity published and alerts targeted smoothly!");
      } else if (showFormModal === "edit" && editingOppId) {
        await api.updateOpportunity(editingOppId, payload);
        setSuccess("Opportunity configuration updated successfully!");
      }

      setShowFormModal(null);
      setEditingOppId(null);
      
      // Clear forms
      setTitle("");
      setCompany("");
      setOpportunityType("Internship");
      setDescription("");
      setLocation("");
      setApplyLink("");
      setDeadline("");
      setIsFeatured(false);

      await fetchOpps();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to save opportunities details.");
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this opportunity? Any user bookmarks will be detached.")) {
      return;
    }
    setLoading(true);
    try {
      await api.deleteOpportunity(id);
      setSuccess("Opportunity removed from listings.");
      await fetchOpps();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Failed to delete.");
      setLoading(false);
    }
  };

  const handleOpenEdit = (opp: Opportunity) => {
    setTitle(opp.title);
    setCompany(opp.company);
    setOpportunityType(opp.opportunityType);
    setDescription(opp.description);
    setLocation(opp.location);
    setApplyLink(opp.applyLink);
    setDeadline(opp.deadline);
    setIsFeatured(opp.isFeatured);
    setEditingOppId(opp.id);
    setShowFormModal("edit");
  };

  // Recommendations Heuristics based on Student fields
  const isRecommended = (opp: Opportunity) => {
    if (!user.branch) return opp.isFeatured;
    
    // Checks if the user's branch or department exists as keywords in the opportunity title or description
    const branchKeyword = user.branch.toLowerCase().replace(/computer|science|eng.*/, "tech");
    const keywords = [branchKeyword, "student", "developer", "engineer", "college", "placements", "campus"];
    
    const textToCheck = `${opp.title} ${opp.description} ${opp.opportunityType}`.toLowerCase();
    
    // High weight on Featured + matched keywords
    return opp.isFeatured || keywords.some(kw => textToCheck.includes(kw));
  };

  const getFilteredOpps = () => {
    return opps.filter(o => {
      const isSearchMatch = 
        o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.description.toLowerCase().includes(searchQuery.toLowerCase());

      const isTypeMatch = activeTypeFilter === "All" || o.opportunityType === activeTypeFilter;
      const isSavedMatch = !showSavedOnly || savedIds.includes(o.id);

      return isSearchMatch && isTypeMatch && isSavedMatch;
    });
  };

  const filteredList = getFilteredOpps();

  // Highlight opportunities
  const recommendationsCount = opps.filter(o => isRecommended(o)).length;

  return (
    <div id="opps_engine_host" className="space-y-6 font-sans">
      
      {/* Metrics alerts info strip */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Filter controls */}
        <div className="md:col-span-9 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2 bg-slate-50 border rounded-xl px-3 py-1.5 w-full sm:max-w-xs shrink-0">
              <Search className="h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search jobs, workshops, drives..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-slate-850 text-slate-800 focus:outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-2 w-full justify-start sm:justify-end flex-wrap">
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                <Filter className="h-3.5 w-3.5" />
                <span>Filter:</span>
              </div>
              <select
                value={activeTypeFilter}
                onChange={e => setActiveTypeFilter(e.target.value)}
                className="text-xs font-bold border border-slate-200 rounded-lg p-1.5 bg-white"
              >
                <option value="All">All Formats</option>
                {opportunityTypes.map(ot => (
                  <option key={ot} value={ot}>{ot}</option>
                ))}
              </select>

              <button
                onClick={() => setShowSavedOnly(!showSavedOnly)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold cursor-pointer transition-colors ${showSavedOnly ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"}`}
              >
                <Bookmark className="h-3.5 w-3.5 shrink-0" />
                <span>Bookmarks ({savedIds.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Administration addition controller */}
        <div className="md:col-span-3 flex items-center justify-end">
          {isAdmin ? (
            <button
              onClick={() => {
                setShowFormModal("create");
                setEditingOppId(null);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 py-3 px-4 bg-blue-900 hover:bg-blue-952 text-white hover:bg-blue-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer border border-transparent whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Post Opportunity
            </button>
          ) : (
            <div className="w-full p-4 bg-indigo-50/50 rounded-2xl border border-indigo-110 flex items-center gap-3 text-xs text-indigo-950 font-sans">
              <Sparkles className="h-5 w-5 text-indigo-650 shrink-0" />
              <div>
                <p className="font-bold">Career Recommendations Active</p>
                <p className="text-indigo-890 text-[10px]">{recommendationsCount} opportunities matches match your catalog specs!</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}


      {/* FORM DIALOG POP-UP MODAL (Add/Edit) */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-md font-bold text-blue-950">
                {showFormModal === "create" ? "Add Campus Opportunity Post" : "Edit Program Settings"}
              </h3>
              <button onClick={() => setShowFormModal(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500">Program / Title</label>
                  <input
                    type="text" required placeholder="e.g. AWS Associate Cloud Internship"
                    value={title} onChange={e => setTitle(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500">Industry / Sponsor</label>
                  <input
                    type="text" required placeholder="e.g. Amazon Web Services, Inc."
                    value={company} onChange={e => setCompany(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500">Program Classification Type</label>
                  <select
                    value={opportunityType} onChange={e => setOpportunityType(e.target.value as any)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                  >
                    {opportunityTypes.map(ot => (
                      <option key={ot} value={ot}>{ot}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500">Location</label>
                  <input
                    type="text" placeholder="e.g. Hyderabad Campus / Remote"
                    value={location} onChange={e => setLocation(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500">Application Deadline</label>
                  <input
                    type="date"
                    value={deadline} onChange={e => setDeadline(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500">Apply / URL Redirection Link</label>
                  <input
                    type="url" required placeholder="https://recruitment.external.com/path"
                    value={applyLink} onChange={e => setApplyLink(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500">Job Specs & Description Brief</label>
                <textarea
                  rows={3} placeholder="Delineate requirements, eligibility parameters, branch codes, target branches, stipend info or prize tags."
                  value={description} onChange={e => setDescription(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox" id="feature_flag"
                  checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)}
                  className="text-blue-900 focus:ring-blue-900 rounded border-slate-200"
                />
                <label htmlFor="feature_flag" className="text-xs font-bold text-slate-705 text-slate-700 cursor-pointer select-none">
                  Highlight as Featured institution-wide announcement
                </label>
              </div>

              <div className="pt-3 flex gap-3 justify-end border-t border-slate-100">
                <button
                  type="button" onClick={() => setShowFormModal(null)}
                  className="px-4 py-2 border rounded-xl text-slate-650 hover:bg-slate-50 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-905 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow"
                >
                  Publish Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Main rendering loop lists */}
      {filteredList.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-400 space-y-2">
          <Briefcase className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-800">No matching opportunities in record indices</p>
          <p className="text-xs text-slate-500">Admins or Supervisors can append opportunities using the "Post Opportunity" dashboard button.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map(opp => {
            const hasSaved = savedIds.includes(opp.id);
            const isRec = isRecommended(opp);
            
            return (
              <div 
                key={opp.id} 
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-colors flex flex-col md:flex-row gap-5 justify-between md:items-center ${opp.isFeatured ? "border-amber-250 border-amber-300 bg-amber-50/5" : "border-slate-100 hover:border-slate-200"}`}
              >
                
                {/* Info block */}
                <div className="space-y-3 flex-1">
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Classification */}
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase bg-blue-50 text-blue-900 border border-blue-105">
                      {opp.opportunityType}
                    </span>

                    {/* Featured label */}
                    {opp.isFeatured && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 tracking-wide border border-amber-200">
                        <Star className="h-3 w-3 text-amber-900 fill-amber-900 shrink-0" />
                        Featured Drive
                      </span>
                    )}

                    {/* Student tailored suggestion alert */}
                    {!isAdmin && isRec && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-805 text-indigo-900 border border-indigo-110 shrink-0">
                        <Sparkles className="h-3 w-3 shrink-0" />
                        Targeted for branch
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{opp.title}</h3>
                    <p className="text-sm font-semibold tracking-wide text-slate-700">{opp.company}</p>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-2xl line-clamp-2 md:line-clamp-none">{opp.description}</p>
                  </div>

                  {/* Badges line details */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-1 shrink-0">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{opp.location}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px]">Deadline: {opp.deadline}</span>
                    </div>
                  </div>

                </div>

                {/* Operations column */}
                <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t border-slate-50 md:border-t-0 justify-end md:justify-start">
                  
                  {/* Student save option */}
                  {!isAdmin && (
                    <button
                      onClick={() => handleToggleSave(opp.id)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${hasSaved ? "bg-amber-100 border-amber-250 text-amber-900" : "bg-white border-slate-200 text-slate-400 hover:text-slate-650 hover:bg-slate-50"}`}
                      title={hasSaved ? "Saved bookmark" : "Add bookmark"}
                    >
                      {hasSaved ? <BookmarkCheck className="h-4.5 w-4.5" /> : <Bookmark className="h-4.5 w-4.5" />}
                    </button>
                  )}

                  {/* Faculty Admin settings buttons */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 mr-2">
                      <button
                        onClick={() => handleOpenEdit(opp)}
                        className="p-2 border rounded-xl bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer text-xs font-semibold"
                        title="Edit Opportunity Settings"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(opp.id)}
                        className="p-2 border rounded-xl bg-white text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                        title="Remove Opportunity"
                      >
                        <Trash className="h-100 h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Apply redirect links */}
                  <a
                    href={opp.applyLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white hover:text-white font-bold text-xs rounded-xl shadow cursor-pointer text-center select-none shrink-0"
                  >
                    <span>Apply Gateway</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
