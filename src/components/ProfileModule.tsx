/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Profile, Skill, Certification, Project } from "../types";
import { 
  User as UserIcon, Mail, Phone, BookOpen, GraduationCap, Code2, 
  Linkedin, Github, FileText, Upload, Plus, Trash2, Edit3, Save, CheckCircle
} from "lucide-react";

interface ProfileModuleProps {
  userId: string;
}

export default function ProfileModule({ userId }: ProfileModuleProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Profile data state
  const [p, setP] = useState<Profile | null>(null);
  const [skillsList, setSkillsList] = useState<Skill[]>([]);
  const [certsList, setCertsList] = useState<Certification[]>([]);
  const [projsList, setProjsList] = useState<Project[]>([]);

  // Edit form states
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [gitHubUrl, setGitHubUrl] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  
  // Custom Add states
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");

  const [newCertTitle, setNewCertTitle] = useState("");
  const [newCertIssuer, setNewCertIssuer] = useState("");
  const [newCertDate, setNewCertDate] = useState("");
  const [newCertUrl, setNewCertUrl] = useState("");

  const [newProjTitle, setNewProjTitle] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [newProjTech, setNewProjTech] = useState("");
  const [newProjUrl, setNewProjUrl] = useState("");

  // Loading flags for additions
  const [addingSkill, setAddingSkill] = useState(false);
  const [addingCert, setAddingCert] = useState(false);
  const [addingProj, setAddingProj] = useState(false);

  // Fetch complete profile bundle on mount / id path transitions
  const fetchProfileBundle = async () => {
    try {
      setLoading(true);
      setError(null);
      const bundle = await api.getProfile(userId);
      setP(bundle.profile);
      setSkillsList(bundle.skills);
      setCertsList(bundle.certifications);
      setProjsList(bundle.projects);

      // Populate edit states
      setFullName(bundle.profile.fullName || "");
      setPhoneNumber(bundle.profile.phoneNumber || "");
      setBio(bundle.profile.bio || "");
      setLinkedInUrl(bundle.profile.linkedInUrl || "");
      setGitHubUrl(bundle.profile.gitHubUrl || "");
      setProfilePhoto(bundle.profile.profilePhoto || "");
    } catch (err: any) {
      setError(err?.message || "Failed to load profiles engine.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileBundle();
  }, [userId]);

  // Profile Photo file reader
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Maximum photo file allocation exceeded. Limit to 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Resume PDF/Doc base64 parser
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && p) {
      try {
        setLoading(true);
        setError(null);
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          // Put to profiles API
          const updated = await api.updateProfile(userId, {
            resumeUrl: base64,
            resumeName: file.name,
          });
          setP(updated);
          setSuccess("Resume document associated smoothly with student registration!");
          setTimeout(() => setSuccess(null), 3000);
          setLoading(false);
        };
        reader.readAsDataURL(file);
      } catch (err: any) {
        setError("Failed to upload. Try smaller PDF files.");
        setLoading(false);
      }
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await api.updateProfile(userId, {
        fullName,
        phoneNumber,
        bio,
        linkedInUrl,
        gitHubUrl,
        profilePhoto,
      });
      setP(updated);
      setIsEditing(false);
      setSuccess("Profile metrics synced successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Profile synchronization failure details returned.");
    } finally {
      setLoading(false);
    }
  };

  // Managers
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    setAddingSkill(true);
    try {
      const skill = await api.addSkill(userId, newSkillName.trim(), newSkillLevel);
      setSkillsList(prev => [...prev, skill]);
      setNewSkillName("");
    } catch (err: any) {
      setError("Failed to add skill.");
    } finally {
      setAddingSkill(false);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    try {
      await api.deleteSkill(userId, skillId);
      setSkillsList(prev => prev.filter(s => s.id !== skillId));
    } catch {
      setError("Failed to remove skill parameter.");
    }
  };

  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCertTitle.trim() || !newCertIssuer.trim()) return;
    setAddingCert(true);
    try {
      const resp = await api.addCertification(userId, {
        title: newCertTitle.trim(),
        issuer: newCertIssuer.trim(),
        issueDate: newCertDate,
        credentialUrl: newCertUrl,
      });
      setCertsList(prev => [...prev, resp]);
      setNewCertTitle("");
      setNewCertIssuer("");
      setNewCertDate("");
      setNewCertUrl("");
    } catch {
      setError("Failed with credentials add.");
    } finally {
      setAddingCert(false);
    }
  };

  const handleDeleteCert = async (certId: string) => {
    try {
      await api.deleteCertification(userId, certId);
      setCertsList(prev => prev.filter(c => c.id !== certId));
    } catch {
      setError("Failed removing credentials record.");
    }
  };

  const handleAddProj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjTitle.trim() || !newProjDesc.trim()) return;
    setAddingProj(true);
    try {
      const resp = await api.addProject(userId, {
        title: newProjTitle.trim(),
        description: newProjDesc.trim(),
        technologiesUsed: newProjTech,
        projectUrl: newProjUrl,
      });
      setProjsList(prev => [...prev, resp]);
      setNewProjTitle("");
      setNewProjDesc("");
      setNewProjTech("");
      setNewProjUrl("");
    } catch {
      setError("Project record generation fault.");
    } finally {
      setAddingProj(false);
    }
  };

  const handleDeleteProj = async (projId: string) => {
    try {
      await api.deleteProject(userId, projId);
      setProjsList(prev => prev.filter(p => p.id !== projId));
    } catch {
      setError("Failed deleting project record.");
    }
  };

  // Completion calculation Formula
  const calculateCompletionPct = () => {
    if (!p) return 0;
    let score = 20; // 20% default registered
    if (p.profilePhoto) score += 10;
    if (p.phoneNumber) score += 10;
    if (p.bio && p.bio.length > 5) score += 10;
    if (p.resumeUrl) score += 15;
    if (p.linkedInUrl) score += 10;
    if (p.gitHubUrl) score += 10;
    // Lists scoring
    if (skillsList.length > 0) score += 5;
    if (projsList.length > 0) score += 5;
    if (certsList.length > 0) score += 5;

    return Math.min(100, score);
  };

  if (loading && !p) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[300px]">
        <div className="text-slate-400 font-medium text-sm">Validating Secure Profile Channels...</div>
      </div>
    );
  }

  if (error && !p) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 m-4">
        <h4 className="font-bold">Operational Fault</h4>
        <p className="text-sm">{error}</p>
        <button onClick={fetchProfileBundle} className="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold">
          Attempt Recovery
        </button>
      </div>
    );
  }

  const completionPct = calculateCompletionPct();

  return (
    <div id="profile_module_host" className="space-y-8 font-sans">
      
      {/* Dynamic Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        {/* Profile photo section */}
        <div className="relative group shrink-0">
          <div className="h-28 w-28 rounded-full border-4 border-blue-50 bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400">
            {profilePhoto || p?.profilePhoto ? (
              <img src={profilePhoto || p?.profilePhoto} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-12 w-12" />
            )}
          </div>
          {isEditing && (
            <label className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload className="h-4 w-4" />
              <span className="text-[10px] font-bold mt-1">Upload JPEG</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          )}
        </div>

        {/* Profile Info panel */}
        <div className="text-center md:text-left flex-1 space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-blue-950">{p?.fullName || "Awaiting Setup"}</h2>
              <p className="text-sm font-semibold tracking-wide text-blue-900">{p?.branch ? `${p?.branch} | ${p?.year} (Sec ${p?.section || 'A'})` : "Credential setup pending"}</p>
            </div>
            
            <div className="flex justify-center gap-2">
              {!isEditing ? (
                <button
                  id="btn_edit_profile"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Student Card
                </button>
              ) : (
                <button
                  id="btn_save_profile"
                  onClick={handleProfileSave}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-white bg-blue-900 hover:bg-blue-950 font-semibold text-xs rounded-xl shadow cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  Apply Update
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 text-sm text-slate-500 border-t border-slate-100">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="truncate">{p?.email}</span>
            </div>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <Phone className="h-4 w-4 text-slate-400 shrink-0" />
              <span>{p?.phoneNumber || "Phone details missing"}</span>
            </div>
            <div className="flex items-center gap-2 justify-center md:justify-start font-mono text-xs">
              <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Roll: {p?.rollNumber || "N/A"}</span>
            </div>
          </div>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Completion Score Meter */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="font-bold text-slate-800">Student Profile Completion Score</span>
          <span className="font-bold text-blue-900">{completionPct}% Completed</span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-blue-905 bg-blue-900 h-full rounded-full transition-all duration-500" 
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 font-sans">
          Boost your score to 100% by providing Skills, Projects, uploading your Professional Resume, and completing Certifications records for accurate AI career path forecasting!
        </p>
      </div>

      {/* Grid columns: Edit Form vs Info Directories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (Details form OR Biography card) */}
        <div className="lg:col-span-4 space-y-6">
          {isEditing ? (
            <div className="bg-white border border-blue-100 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-md font-bold text-slate-800 border-b border-slate-105 pb-2">Bio-Data Synchronization</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Contact Number</label>
                  <input 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={e => setPhoneNumber(e.target.value)} 
                    className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Short Biography / Pitch</label>
                  <textarea 
                    value={bio} 
                    onChange={e => setBio(e.target.value)} 
                    rows={4}
                    placeholder="Describe your career goals, coding interests or major research projects."
                    className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">LinkedIn URL</label>
                  <input 
                    type="url" 
                    value={linkedInUrl} 
                    onChange={e => setLinkedInUrl(e.target.value)} 
                    placeholder="https://linkedin.com/in/username"
                    className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">GitHub URL</label>
                  <input 
                    type="url" 
                    value={gitHubUrl} 
                    onChange={e => setGitHubUrl(e.target.value)} 
                    placeholder="https://github.com/username"
                    className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-6">
              <div>
                <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-2">Student Portrait Narrative</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-3 whitespace-pre-wrap">
                  {p?.bio || "No biography provided yet. Hit \"Edit Student Card\" to write your narrative and let Campus AI advise you."}
                </p>
              </div>

              {/* URL profiles */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Connected Repositories</h3>
                <div className="space-y-2 text-sm">
                  {p?.linkedInUrl ? (
                    <a href={p.linkedInUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-900 hover:underline">
                      <Linkedin className="h-4 w-4 shrink-0" />
                      <span className="truncate">LinkedIn Credentials Profile</span>
                    </a>
                  ) : <p className="text-slate-400 text-xs italic">No LinkedIn profile coupled</p>}

                  {p?.gitHubUrl ? (
                    <a href={p.gitHubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-800 hover:underline">
                      <Github className="h-4 w-4 shrink-0" />
                      <span className="truncate">GitHub Workspace Path</span>
                    </a>
                  ) : <p className="text-slate-400 text-xs italic">No GitHub handle coupled</p>}
                </div>
              </div>

              {/* Resume Repository */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Institutional Resume File</h3>
                {p?.resumeName ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-105">
                    <div className="flex items-center gap-2 text-sm text-blue-950 font-medium truncate">
                      <FileText className="h-5 w-5 text-blue-900 shrink-0" />
                      <span className="truncate">{p.resumeName}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic">No registered resume on system</p>
                )}

                <label className="flex items-center justify-center gap-2 w-full py-2.5 px-4 border border-dashed border-slate-350 rounded-xl hover:bg-slate-50 hover:border-slate-400 cursor-pointer text-xs font-semibold text-slate-600 bg-white">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Professional Resume (PDF)</span>
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} />
                </label>
              </div>

            </div>
          )}
        </div>

        {/* Right Column: Skills, Projects, and Certifications lists */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Skills deck */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
            <h3 className="text-md font-bold text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-2 mb-4">
              <Code2 className="h-5 w-5 text-blue-900" />
              Technical Core Skills Directory
            </h3>

            {/* Existing Skills tags */}
            {skillsList.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                No active skills recorded in your portal registry. Use the form below to append skill blocks!
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-6">
                {skillsList.map(s => (
                  <div key={s.id} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded-full border border-slate-200">
                    <span>{s.name}</span>
                    <span className="text-[10px] font-bold text-blue-800 uppercase px-1 py-0.2 bg-blue-50 rounded">
                      {s.level}
                    </span>
                    <button 
                      onClick={() => handleDeleteSkill(s.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add skill form */}
            <form onSubmit={handleAddSkill} className="flex items-end gap-3 flex-wrap">
              <div className="min-w-[150px] flex-1">
                <label className="block text-[10px] uppercase font-bold text-slate-400">Skill Anchor Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. React, PostgreSQL, Docker"
                  value={newSkillName}
                  onChange={e => setNewSkillName(e.target.value)}
                  className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400">Skill Seniority Level</label>
                <select
                  value={newSkillLevel}
                  onChange={e => setNewSkillLevel(e.target.value as any)}
                  className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={addingSkill}
                className="inline-flex items-center gap-1.5 py-1.5 px-4 text-white bg-blue-900 hover:bg-blue-950 font-bold text-xs rounded-lg shadow cursor-pointer disabled:bg-slate-300"
              >
                <Plus className="h-4 w-4" />
                Add Skill
              </button>
            </form>
          </div>

          {/* Certifications module */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
            <h3 className="text-md font-bold text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-2 mb-4">
              <GraduationCap className="h-5 w-5 text-blue-900" />
              Credentials & Professional Certifications
            </h3>

            {certsList.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm mb-4">
                No credentials listed. Record certifications to increase student eligibility score.
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {certsList.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-slate-800">{c.title}</h4>
                      <p className="text-xs text-slate-500">{c.issuer} • Issued {c.issueDate}</p>
                      {c.credentialUrl && (
                        <a href={c.credentialUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-900 font-semibold hover:underline block pt-1">
                          Verify Credential Link
                        </a>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDeleteCert(c.id)}
                      className="p-1 px-2 text-slate-400 hover:text-red-650 hover:bg-red-50 hover:text-red-700 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add certification form */}
            <form onSubmit={handleAddCert} className="space-y-3 pt-3 border-t border-slate-50">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Input Certification Particulars</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input 
                    type="text" 
                    required 
                    placeholder="Credential Title (e.g. AWS Certified Developer)" 
                    value={newCertTitle} 
                    onChange={e => setNewCertTitle(e.target.value)} 
                    className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <input 
                    type="text" 
                    required 
                    placeholder="Issuer (e.g. Amazon Web Services Inc.)" 
                    value={newCertIssuer} 
                    onChange={e => setNewCertIssuer(e.target.value)} 
                    className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <input 
                    type="date" 
                    placeholder="Date Achieved" 
                    value={newCertDate} 
                    onChange={e => setNewCertDate(e.target.value)} 
                    className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-550"
                  />
                </div>
                <div>
                  <input 
                    type="url" 
                    placeholder="Verification Url" 
                    value={newCertUrl} 
                    onChange={e => setNewCertUrl(e.target.value)} 
                    className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={addingCert}
                className="inline-flex items-center gap-1.5 py-1.5 px-4 text-white bg-blue-900 hover:bg-blue-950 font-bold text-xs rounded-lg shadow cursor-pointer disabled:bg-slate-300"
              >
                <Plus className="h-4 w-4" />
                Add Certification
              </button>
            </form>
          </div>

          {/* Research & Development Projects */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
            <h3 className="text-md font-bold text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-2 mb-4">
              <FileText className="h-5 w-5 text-blue-900" />
              Dynamic Projects & Case Studies
            </h3>

            {projsList.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm mb-4">
                No active projects indexed. Build and details engineering projects to boost placement readiness indexes.
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                {projsList.map(pr => (
                  <div key={pr.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 flex justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">{pr.title}</h4>
                      <p className="text-xs text-slate-650">{pr.description}</p>
                      
                      {pr.technologiesUsed?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {pr.technologiesUsed.map((t, idx) => (
                            <span key={idx} className="text-[10px] text-blue-900 bg-blue-50/50 px-2 py-0.5 rounded font-medium border border-blue-105/20">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {pr.projectUrl && (
                        <a href={pr.projectUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-900 font-bold hover:underline block pt-2">
                          View Project Repository Code
                        </a>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDeleteProj(pr.id)}
                      className="p-1 px-2 text-slate-404 text-slate-400 hover:text-red-750 hover:bg-red-50 hover:text-red-700 rounded-lg cursor-pointer h-fit"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add project form */}
            <form onSubmit={handleAddProj} className="space-y-3 pt-3 border-t border-slate-50">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Input Project Description</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    required 
                    placeholder="Project Title (e.g. Distributed Ledger File System)" 
                    value={newProjTitle} 
                    onChange={e => setNewProjTitle(e.target.value)} 
                    className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                  <input 
                    type="text" 
                    placeholder="Technologies (comma-separated, e.g. Node, Go, Redis)" 
                    value={newProjTech} 
                    onChange={e => setNewProjTech(e.target.value)} 
                    className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <textarea 
                    required 
                    rows={2}
                    placeholder="Comprehensive description of architectural contribution and engineering challenges resolved." 
                    value={newProjDesc} 
                    onChange={e => setNewProjDesc(e.target.value)} 
                    className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <input 
                    type="url" 
                    placeholder="Repository URL / Live Deployment Link" 
                    value={newProjUrl} 
                    onChange={e => setNewProjUrl(e.target.value)} 
                    className="block w-full px-3 py-1.2/1.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={addingProj}
                className="inline-flex items-center gap-1.5 py-1.5 px-4 text-white bg-blue-900 hover:bg-blue-950 font-bold text-xs rounded-lg shadow cursor-pointer disabled:bg-slate-300"
              >
                <Plus className="h-4 w-4" />
                Add Project Card
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
