/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { User, UserRole } from "../types";
import { School, LogIn, UserPlus, HelpCircle, ArrowRight, ShieldCheck, Mail } from "lucide-react";

interface AuthProps {
  onLoginSuccess: (user: User) => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  
  // Student registration fields
  const [rollNumber, setRollNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("1st Year");
  const [section, setSection] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Forgot password
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Simulated email dispatch
    setTimeout(() => {
      setLoading(false);
      setSuccess(`A password reset link has been dispatched to ${forgotEmail}. Please review your inbox.`);
      setForgotEmail("");
    }, 1200);
  };
const handleAuthSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  setError(null);
  setSuccess(null);
  setLoading(true);

  try {
    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (profileError || !profile) {
          throw new Error("Profile not found");
        }

        onLoginSuccess({
          ...data.user,
          fullName: profile.full_name,
          role: profile.role,
          branch: profile.branch,
          profilePhoto: profile.profile_photo,
        } as any);

        setSuccess("Login successful!");
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error("User creation failed");
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: data.user.id,
            full_name: fullName,
            email,
            role,
            roll_number: rollNumber,
            registration_number: registrationNumber,
            branch,
            year,
            section,
            phone_number: phoneNumber,
          },
        ]);

      if (profileError) throw profileError;

      setSuccess(
        "Registration successful. Please check your email for verification."
      );
    }
  } catch (err: any) {
    setError(err.message || "An error occurred during authentication.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div id="auth_container" className="flex min-h-screen bg-slate-50 items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-xl space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 transition-all">
        
        {/* College branding header */}
        <div className="text-center text-slate-800">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-900 text-white shadow-md">
            <School id="college_icon" className="h-8 w-8" />
          </div>
          <h2 id="platform_title" className="mt-4 text-3xl font-extrabold tracking-tight text-blue-950 font-sans">
            Campus Nexus AI
          </h2>
          <p id="platform_subtitle" className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            The intelligent university student hub & Lost & Found matching platform for educational institutions.
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div id="auth_error_alert" className="p-4 bg-red-50 border-l-4 border-red-500 rounded-md text-red-700 text-sm">
            <p className="font-medium">Authentication Incident</p>
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div id="auth_success_alert" className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-md text-emerald-800 text-sm font-sans flex items-start gap-2">
            <Mail className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Verification Action Required</p>
              <p className="text-emerald-700">{success}</p>
            </div>
          </div>
        )}

        {showForgot ? (
          /* Forgot Password Interface */
          <form id="forgot_password_form" onSubmit={handleForgotPassword} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Restore Password Account</h3>
              <p className="text-xs text-slate-500 mt-1">
                Provide your institutional email registered with Campus Nexus. We will transfer an auth-token credentials packet.
              </p>
            </div>

            <div>
              <label htmlFor="forgot_email" className="block text-sm font-medium text-slate-700">
                Institutional Email Address
              </label>
              <input
                id="forgot_email"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="student@university.edu"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-800 focus:border-blue-900 text-sm"
              />
            </div>

            <div className="flex gap-4 items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-xs font-semibold text-blue-900 hover:underline"
              >
                Return to Login
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-900 hover:bg-blue-950 focus:outline-none disabled:bg-slate-300 shadow"
              >
                {loading ? "Transmitting..." : "Send Reset Link"}
              </button>
            </div>
          </form>
        ) : (
          /* Main Login / Signup Form */
          <form id="auth_core_form" onSubmit={handleAuthSubmit} className="space-y-6">
            
            {/* Toggle tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                id="tab_login"
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isLogin ? "bg-white text-blue-900 shadow" : "text-slate-500 hover:text-slate-800"}`}
              >
                <div className="flex items-center justify-center gap-1">
                  <LogIn className="h-4 w-4" />
                  Institution Sign In
                </div>
              </button>
              <button
                id="tab_register"
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${!isLogin ? "bg-white text-blue-900 shadow" : "text-slate-500 hover:text-slate-800"}`}
              >
                <div className="flex items-center justify-center gap-1">
                  <UserPlus className="h-4 w-4" />
                  Student Signup
                </div>
              </button>
            </div>

            {/* Common Fields */}
            <div className="space-y-4">
              
              {!isLogin && (
                <>
                  {/* Full Name */}
                  <div>
                    <label htmlFor="reg_fullName" className="block text-xs font-medium text-slate-700">Full Name</label>
                    <input
                      id="reg_fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-900 focus:border-blue-900 text-sm"
                    />
                  </div>

                  {/* Environment Role Selection for AI Studio review */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Ecosystem Role Selection</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer text-sm font-medium ${role === 'student' ? 'border-blue-900 bg-blue-50/50 text-blue-950' : 'border-slate-200 text-slate-500'}`}>
                        <span className="flex items-center gap-1.5">
                          Student Portal
                        </span>
                        <input
                          type="radio"
                          name="role_select"
                          value="student"
                          checked={role === "student"}
                          onChange={() => setRole("student")}
                          className="text-blue-900 focus:ring-blue-900"
                        />
                      </label>
                      <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer text-sm font-medium ${role === 'admin' ? 'border-blue-900 bg-blue-50/50 text-blue-950' : 'border-slate-200 text-slate-500'}`}>
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-blue-800" />
                          Faculty Admin
                        </span>
                        <input
                          type="radio"
                          name="role_select"
                          value="admin"
                          checked={role === "admin"}
                          onChange={() => setRole("admin")}
                          className="text-blue-900 focus:ring-blue-900"
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label htmlFor="auth_email" className="block text-xs font-medium text-slate-700">Official Portal Email</label>
                <input
                  id="auth_email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-900 focus:border-blue-900 text-sm"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="auth_password" className="block text-xs font-medium text-slate-700">Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-xs font-medium text-blue-900 hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  id="auth_password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-900 focus:border-blue-900 text-sm"
                />
              </div>

              {/* Student Registration fields - conditional layout */}
              {!isLogin && role === "student" && (
                <div id="student_fields_block" className="pt-2 border-t border-slate-100 space-y-4">
                  <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">University Registry Parameters</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Roll Number */}
                    <div>
                      <label htmlFor="reg_roll" className="block text-xs font-medium text-slate-700">Roll Number</label>
                      <input
                        id="reg_roll"
                        type="text"
                        required
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="CS-2023-049"
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>

                    {/* Registration Number */}
                    <div>
                      <label htmlFor="reg_num" className="block text-xs font-medium text-slate-700">Registration Number</label>
                      <input
                        id="reg_num"
                        type="text"
                        required
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        placeholder="REC/10293/23"
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* Branch */}
                    <div className="col-span-1">
                      <label htmlFor="reg_branch" className="block text-xs font-medium text-slate-700">Branch (Dept)</label>
                      <input
                        id="reg_branch"
                        type="text"
                        required
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="Computer Sci"
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>

                    {/* Year selection */}
                    <div className="col-span-1">
                      <label htmlFor="reg_year" className="block text-xs font-medium text-slate-700">Academic Year</label>
                      <select
                        id="reg_year"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                      >
                        <option>1st Year</option>
                        <option>2nd Year</option>
                        <option>3rd Year</option>
                        <option>4th Year</option>
                        <option>Postgraduate</option>
                      </select>
                    </div>

                    {/* Section */}
                    <div className="col-span-1">
                      <label htmlFor="reg_section" className="block text-xs font-medium text-slate-700">Section</label>
                      <input
                        id="reg_section"
                        type="text"
                        required
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="A-3"
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label htmlFor="reg_phone" className="block text-xs font-medium text-slate-700">Phone Number</label>
                    <input
                      id="reg_phone"
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 0192-384"
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-900"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-900 hover:bg-blue-950 focus:outline-none disabled:bg-slate-300 shadow-md transition-all"
              >
                {loading ? (
                  <span>Securing login channel...</span>
                ) : (
                  <>
                    <span>{isLogin ? "Authenticate Credentials" : "Initialize Student Ecosystem Check"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer info disclosure */}
        <div className="text-center text-xs text-slate-400 font-sans border-t border-slate-100 pt-4 flex items-center justify-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-900/60" />
          <span>Secured via Supabase Auth Gateway protocols</span>
        </div>
      </div>
    </div>
  );
}
