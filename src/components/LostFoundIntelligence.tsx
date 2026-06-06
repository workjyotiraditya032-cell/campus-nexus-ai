/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { LostItem, FoundItem, ItemMatch, Claim } from "../types";
import { 
  Search, Filter, PlusCircle, Sparkles, Check, CheckCircle2, AlertCircle, 
  HelpCircle, Clock, CheckCircle, Tag, MapPin, Calendar, FileQuestion, ArrowRightLeft, Image as ImageIcon
} from "lucide-react";

interface LostFoundIntelligenceProps {
  userId: string;
}

export default function LostFoundIntelligence({ userId }: LostFoundIntelligenceProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // States
  const [lostList, setLostList] = useState<LostItem[]>([]);
  const [foundList, setFoundList] = useState<FoundItem[]>([]);
  const [matchesList, setMatchesList] = useState<any[]>([]);
  const [claimsList, setClaimsList] = useState<any[]>([]);

  // Toggles & Filters
  const [activeTab, setActiveTab] = useState<"search" | "matches" | "my_reports">("search");
  const [itemTypeView, setItemTypeView] = useState<"all" | "lost" | "found">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Reporting Forms
  const [showReportForm, setShowReportForm] = useState<"lost" | "found" | null>(null);
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [contactDetails, setContactDetails] = useState("");
  const [itemImage, setItemImage] = useState("");

  // Claim Form states
  const [claimingMatch, setClaimingMatch] = useState<any | null>(null);
  const [claimVerificationText, setClaimVerificationText] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const categories = [
    "Electronics",
    "Keyrings & IDs",
    "Notebooks & Documents",
    "Bags & Wallets",
    "Apparel & Accessories",
    "Water Bottles",
    "Other Essentials"
  ];

  const fetchItemsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [losts, founds, matches, claims] = await Promise.all([
        api.getLostItems(),
        api.getFoundItems(),
        api.getMatches(),
        api.getClaims()
      ]);
      setLostList(losts);
      setFoundList(founds);
      setMatchesList(matches);
      
      // Filter claims to show student's own claims
      const ownedClaims = claims.filter(c => c.claimedByUserId === userId);
      setClaimsList(ownedClaims);
    } catch (err: any) {
      setError(err?.message || "Failed to load database items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemsData();
  }, [userId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Maximum image file size exceeded. Choose a smaller image.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setItemImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !location || !contactDetails) return;
    setLoading(true);

    try {
      if (showReportForm === "lost") {
        await api.createLostItem({
          itemName,
          category,
          description,
          locationLost: location,
          dateLost: date,
          contactDetails,
          image: itemImage,
          userId,
        });
        setSuccess("Your LOST item report was submitted successfully. AI matching and cross-referencing is active!");
      } else {
        await api.createFoundItem({
          itemName,
          category,
          description,
          locationFound: location,
          dateFound: date,
          contactDetails,
          image: itemImage,
          userId,
        });
        setSuccess("Your FOUND item report was indexed! Students will receive matches if keywords overlap.");
      }

      // Reset form fields
      setItemName("");
      setCategory("Electronics");
      setDescription("");
      setLocation("");
      setDate("");
      setContactDetails("");
      setItemImage("");
      setShowReportForm(null);

      // Reload
      await fetchItemsData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || "Reporting submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingMatch || !claimVerificationText.trim()) return;
    setSubmittingClaim(true);

    try {
      console.log("claimVerificationText =", claimVerificationText);
console.log("userId =", userId);
console.log("claimingMatch =", claimingMatch);
      await api.submitClaim({
  matchId: claimingMatch.id,
  lostItemId: claimingMatch.lostItemId,
  foundItemId: claimingMatch.foundItemId,
  userId: userId,
  verificationText: claimVerificationText,
});

      setSuccess("Claim verification submitted! Administration is reviewing details. Notification alert triggered to founding student.");
      setClaimingMatch(null);
      setClaimVerificationText("");

      await fetchItemsData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError("Failed to register claims.");
    } finally {
      setSubmittingClaim(false);
    }
  };

  // UI helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full bg-blue-50 text-blue-800 border border-blue-100">Active Open</span>;
      case "under_review":
        return <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full bg-amber-50 text-amber-800 border border-amber-100">Reviewing</span>;
      case "matched":
        return <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full bg-indigo-50 text-indigo-800 border border-indigo-110">Matched</span>;
      case "claimed":
        return <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">Claimed</span>;
      case "resolved":
        return <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full bg-slate-100 text-slate-500 border border-slate-200">Resolved Archive</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full bg-slate-100 text-slate-600 font-mono">{status}</span>;
    }
  };

  const getConfidenceBadge = (conf: string) => {
    switch (conf) {
      case "high":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 tracking-wider">High Sim</span>;
      case "medium":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 tracking-wider">Medium Sim</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-100 text-slate-600 tracking-wider">Low Sim</span>;
    }
  };

  // Filter items
  const getFilteredItems = () => {
    let list: Array<{ type: "lost" | "found"; item: any }> = [];

    if (itemTypeView === "all" || itemTypeView === "lost") {
      lostList.forEach(item => {
        list.push({ type: "lost", item });
      });
    }
    if (itemTypeView === "all" || itemTypeView === "found") {
      foundList.forEach(item => {
        list.push({ type: "found", item });
      });
    }

    // Apply queries
    return list.filter(wrapped => {
      const isCategoryMatch = categoryFilter === "All" || wrapped.item.category === categoryFilter;
      const isSearchMatch = 
        wrapped.item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wrapped.item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (wrapped.type === "lost" ? wrapped.item.locationLost : wrapped.item.locationFound).toLowerCase().includes(searchQuery.toLowerCase());

      return isCategoryMatch && isSearchMatch;
    });
  };

  const filteredItems = getFilteredItems();

  // Student matching records
  const studentMatches = matchesList;

  return (
    <div id="lost_found_root" className="space-y-6 font-sans">
      
      {/* Visual Navigation Toolbar Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        
        {/* Toggle View Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "search" ? "bg-white text-blue-900 shadow" : "text-slate-500 hover:text-slate-800"}`}
          >
            Catalog Directory
          </button>
          <button
            onClick={() => setActiveTab("matches")}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === "matches" ? "bg-white text-indigo-900 shadow" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-700 font-extrabold" />
            AI Match Center
            {studentMatches.length > 0 && (
              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("my_reports")}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "my_reports" ? "bg-white text-blue-900 shadow" : "text-slate-500 hover:text-slate-800"}`}
          >
            My Incident Reports
          </button>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="flex gap-2 w-full sm:w-auto divide-x divide-slate-100">
          <button
            id="btn_report_lost"
            onClick={() => {
              setShowReportForm("lost");
              setItemImage("");
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow cursor-pointer border border-transparent whitespace-nowrap"
          >
            <PlusCircle className="h-4 w-4" />
            Report Lost Item
          </button>
          
          <button
            id="btn_report_found"
            onClick={() => {
              setShowReportForm("found");
              setItemImage("");
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer border border-transparent whitespace-nowrap pl-4"
          >
            <PlusCircle className="h-4 w-4" />
            Report Found Item
          </button>
        </div>
      </div>

      {/* Operational Response notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2 animate-bounce">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Reporting Submission Modal Backdrop Form */}
      {showReportForm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-blue-950 flex items-center gap-2">
                <span>{showReportForm === "lost" ? "Report Lost Item" : "Report Found Item"}</span>
              </h3>
              <button 
                onClick={() => setShowReportForm(null)}
                className="text-slate-400 hover:text-slate-700 font-semibold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500">Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Matte Black Hydroflask"
                    value={itemName}
                    onChange={e => setItemName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500">Item Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500">Location {showReportForm === "lost" ? "Lost" : "Found"}</label>
                <input
                  type="text"
                  required
                  placeholder={showReportForm === "lost" ? "e.g. Science Block Room 204 or Admin Corridor" : "e.g. Near Library bench"}
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500">Date {showReportForm === "lost" ? "Lost" : "Found"}</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500">Verified Contact Info</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Roll 54 or rbasantia@gmail.com"
                    value={contactDetails}
                    onChange={e => setContactDetails(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Specify unique identifiable marks, colors, stickers, cases, scratch marks."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                />
              </div>

              {/* Photo Upload Attachment */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500">Attach Reference Photo</label>
                <div className="flex gap-4 items-center p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  {itemImage ? (
                    <div className="h-14 w-14 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-100">
                      <img src={itemImage} alt="Ref pre" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-slate-100 text-slate-400 border border-slate-150 flex items-center justify-center shrink-0">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-400">Include real-world verification images. (Max 2MB)</p>
                    <label className="mt-1 inline-flex items-center px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold rounded-lg cursor-pointer">
                      Select Image
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowReportForm(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-650 hover:bg-slate-50 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 hover:bg-opacity-90 text-white font-bold text-xs rounded-xl shadow cursor-pointer bg-blue-900"
                >
                  {loading ? "Indexing report..." : "Submit Incident Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim Answers Modal Backdrop Form */}
      {claimingMatch && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 max-w-md w-full space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-md font-bold text-blue-950">Claim Verification Request</h3>
              <p className="text-xs text-slate-400">Verify your ownership claim details before administrative authorization.</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Tag className="h-3.5 w-3.5" />
                <span>Your Lost Post: {claimingMatch.lostItemName}</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Match Found Post: {claimingMatch.foundItemName}</span>
              </div>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500">Provide Ownership Verification Answers</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Answer specific queries: What color or branding stickers are visible? Specify specific objects inside the pouch. What is the wallpaper on the phone?"
                  value={claimVerificationText}
                  onChange={e => setClaimVerificationText(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                />
              </div>

              <div className="pt-2 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setClaimingMatch(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-650 hover:bg-slate-50 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  {submittingClaim ? "Transmitting claims..." : "Submit Claims Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* TAB SCREEN RENDERERS */}

      {activeTab === "search" && (
        <div id="catalog_directory_tab" className="space-y-6">
          
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Filter tags search */}
            <div className="flex items-center gap-2 bg-white border border-slate-150 rounded-xl px-3 py-1.5 w-full md:max-w-md shrink-0">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search matching items description or locations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-slate-705 text-slate-800 focus:outline-none w-full"
              />
            </div>

            {/* Selection filters */}
            <div className="flex items-center gap-3 w-full justify-start md:justify-end flex-wrap">
              <div className="flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">Type:</span>
                <select
                  value={itemTypeView}
                  onChange={e => setItemTypeView(e.target.value as any)}
                  className="text-xs font-bold border border-slate-200 rounded-lg p-1 bg-white"
                >
                  <option value="all">All Incident Types</option>
                  <option value="lost">Lost Reports</option>
                  <option value="found">Found Index</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-slate-500">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="text-xs font-bold border border-slate-200 rounded-lg p-1 bg-white"
                >
                  <option value="All">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Catalog items lists render */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-400 space-y-2">
              <FileQuestion className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-800">No reported incidents cataloged</p>
              <p className="text-xs text-slate-400">Everything has been matching perfectly or no queries exist. Be the first to file!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(({ type, item }) => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow transition-shadow overflow-hidden flex flex-col">
                  {/* Image banner */}
                  {item.image ? (
                    <div className="h-44 w-full overflow-hidden bg-slate-50">
                      <img src={item.image} alt={item.itemName} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-28 w-full bg-slate-50 flex flex-col items-center justify-center text-slate-350 border-b border-slate-100 p-4">
                      <Tag className="h-8 w-8 mb-1" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5 text-slate-800">
                      <div className="flex justify-between items-start gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase ${type === "lost" ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-800 border border-emerald-100"}`}>
                          {type === "lost" ? "Lost report" : "Found Index"}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>

                      <h4 className="text-md font-bold text-slate-900 pt-1 line-clamp-1">{item.itemName}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{item.description || "No description tags specified."}</p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-50 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{type === "lost" ? item.locationLost : item.locationFound}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>Date: {type === "lost" ? item.dateLost : item.dateFound}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}


      {activeTab === "matches" && (
        <div id="ai_matches_tab" className="space-y-6 bg-indigo-50/25 p-6 rounded-2xl border border-indigo-100">
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-900 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-md font-bold text-indigo-950">AI Similarity Match Intelligence</h3>
              <p className="text-xs text-indigo-800/80">
                Our server-side algorithm continually parses lost item text structures against reported found matrices.
              </p>
            </div>
          </div>

          {studentMatches.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-indigo-100 text-indigo-800/65 space-y-2">
              <ArrowRightLeft className="h-8 w-8 mx-auto text-indigo-300" />
              <p className="font-bold">No Match Matches Computed Yet</p>
              <p className="text-xs text-indigo-700/80 max-w-sm mx-auto">
                Once you file lost reports, our automated database comparisons evaluate candidate found articles in real-time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {studentMatches.map(m => (
                <div key={m.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3 border-b border-slate-50 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-blue-900">Match Ref #{m.id.substr(6, 4)}</span>
                        {getConfidenceBadge(m.matchConfidence)}
                      </div>
                      <p className="text-xs text-slate-500 font-sans">Computed index on {new Date(m.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div className="text-right flex items-center gap-2 shrink-0">
                      <div className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        {m.similarityScore}% Correspondence
                      </div>
                    </div>
                  </div>

                  {/* Flow items compare visually */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-xl space-y-1 border">
                      <p className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Your Lost Report</p>
                      <p className="font-bold text-slate-805 text-sm text-slate-800">{m.lostItemName}</p>
                      <p className="text-slate-500">📍 {m.lostLocation}</p>
                      <p className="text-slate-450 text-slate-500">📅 {m.lostDate}</p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl space-y-1 border">
                      <p className="font-semibold text-slate-400 exact_right uppercase tracking-widest text-[9px]">Found article matches</p>
                      <p className="font-bold text-indigo-950 text-sm">{m.foundItemName}</p>
                      <p className="text-indigo-900">📍 {m.foundLocation}</p>
                      <p className="text-slate-500">📅 {m.foundDate}</p>
                    </div>
                  </div>

                  {/* AI Reason explanation quote block */}
                  <div className="p-3.5 bg-indigo-50/50 rounded-xl text-xs text-indigo-950 flex items-start gap-2 border border-indigo-100/40">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-indigo-900">Campus Matches Reason Analysis:</p>
                      <p className="italic leading-relaxed mt-0.5 text-indigo-900">{m.reason}</p>
                    </div>
                  </div>

                  {/* Action buttons Claim */}
                  <div className="flex gap-2 justify-end">
                    {claimsList.some(cl => cl.matchId === m.id) ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 rounded-xl border border-amber-100 p-2">
                        <Clock className="h-3.5 w-3.5" />
                        Under review by administrations
                      </div>
                    ) : (
                      <button
                        id={`btn_claim_${m.id}`}
                        onClick={() => {
                          setClaimingMatch(m);
                          setClaimVerificationText("");
                        }}
                        className="inline-flex items-center justify-center px-4 py-2 bg-blue-900 hover:bg-blue-955 text-white font-bold text-xs rounded-xl shadow cursor-pointer bg-blue-950"
                      >
                        File Claims Verification
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}


      {activeTab === "my_reports" && (
        <div id="student_incidents_tab" className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Lost items owned */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <h3 className="text-md font-bold text-slate-900 flex items-center justify-between border-b border-slate-50 pb-2">
              <span>My Reported Lost Items</span>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-bold">{lostList.filter(l => l.userId === userId).length} Total</span>
            </h3>

            {lostList.filter(l => l.userId === userId).length === 0 ? (
              <p className="text-slate-400 text-xs italic text-center py-6">None registered on your roll credentials.</p>
            ) : (
              <div className="space-y-3">
                {lostList.filter(l => l.userId === userId).map(item => (
                  <div key={item.id} className="p-3 border rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-slate-800 text-sm truncate">{item.itemName}</p>
                      {getStatusBadge(item.status)}
                    </div>
                    <p className="text-slate-500">📍 {item.locationLost} • Category: {item.category}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Found items owned */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <h3 className="text-md font-bold text-slate-900 flex items-center justify-between border-b border-slate-50 pb-2">
              <span>My Reported Found Items</span>
              <span className="text-xs bg-slate-105 bg-slate-100 px-2 py-0.5 rounded-full font-bold">{foundList.filter(f => f.userId === userId).length} Total</span>
            </h3>

            {foundList.filter(f => f.userId === userId).length === 0 ? (
              <p className="text-slate-400 text-xs italic text-center py-6">None tracked under your student profile.</p>
            ) : (
              <div className="space-y-3">
                {foundList.filter(f => f.userId === userId).map(item => (
                  <div key={item.id} className="p-3 border rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-slate-800 text-sm truncate">{item.itemName}</p>
                      {getStatusBadge(item.status)}
                    </div>
                    <p className="text-slate-500">📍 {item.locationFound} • Category: {item.category}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
