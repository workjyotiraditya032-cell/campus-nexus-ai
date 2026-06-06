/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { supabase } from "../lib/supabase";

import {
  User,
  Profile,
  LostItem,
  FoundItem,
  ItemMatch,
  Claim,
  Opportunity,
  Notification,
  ConversationMessage,
  SystemMetrics
} from "../types";

const getHeaders = () => {
  const userId = localStorage.getItem("campus_user_id") || "";
  return {
    "Content-Type": "application/json",
    "Authorization": userId,
  };
};

export const api = {
  // AUTH
  signup: async (signUpData: any): Promise<User> => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signUpData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed");
    return data.user;
  },

  login: async (loginData: any): Promise<User> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    return data.user;
  },

  getSession: async (): Promise<any | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    ...user,
    fullName: profile?.full_name,
    role: profile?.role,
    branch: profile?.branch,
    profilePhoto: profile?.profile_photo,
  };
},

  logout: () => {
    localStorage.removeItem("campus_user_id");
  },

  // PROFILES
  getProfile: async (id: string): Promise<{
  profile: any;
  skills: any[];
  certifications: any[];
  projects: any[];
}> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }
const { data: skills } = await supabase
  .from("skills")
  .select("*")
  .eq("user_id", id);

const { data: certifications } = await supabase
  .from("certifications")
  .select("*")
  .eq("user_id", id);

const { data: projects } = await supabase
  .from("projects")
  .select("*")
  .eq("user_id", id);
  return {
    profile: {
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      rollNumber: data.roll_number,
      registrationNumber: data.registration_number,
      branch: data.branch,
      year: data.year,
      section: data.section,
      phoneNumber: data.phone_number,
      bio: data.bio || "",
      linkedInUrl: data.linkedin_url || "",
      gitHubUrl: data.github_url || "",
      profilePhoto: data.profile_photo || "",
      resumeUrl: data.resume_url || "",
      resumeName: data.resume_name || "",
    },
    skills: skills || [],
certifications: certifications || [],
projects: projects || [],
  };
},
  updateProfile: async (id: string, profileData: any): Promise<any> => {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: profileData.fullName,
      phone_number: profileData.phoneNumber,
      bio: profileData.bio,
      linkedin_url: profileData.linkedInUrl,
      github_url: profileData.gitHubUrl,
      profile_photo: profileData.profilePhoto,
      resume_url: profileData.resumeUrl,
      resume_name: profileData.resumeName,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    rollNumber: data.roll_number,
    registrationNumber: data.registration_number,
    branch: data.branch,
    year: data.year,
    section: data.section,
    phoneNumber: data.phone_number,
    bio: data.bio || "",
    linkedInUrl: data.linkedin_url || "",
    gitHubUrl: data.github_url || "",
    profilePhoto: data.profile_photo || "",
    resumeUrl: data.resume_url || "",
    resumeName: data.resume_name || "",
  };
},

  addSkill: async (id: string, name: string, level: string) => {
  const { data, error } = await supabase
    .from("skills")
    .insert([
      {
        user_id: id,
        name,
        level,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
},

  deleteSkill: async (id: string, skillId: string) => {
  const { error } = await supabase
    .from("skills")
    .delete()
    .eq("id", skillId)
    .eq("user_id", id);

  if (error) throw error;
},

  addCertification: async (id: string, certData: any) => {
  const { data, error } = await supabase
    .from("certifications")
    .insert([
      {
        user_id: id,
        title: certData.title,
        issuer: certData.issuer,
        issue_date: certData.issueDate,
        credential_url: certData.credentialUrl,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
},

  deleteCertification: async (id: string, certId: string) => {
  const { error } = await supabase
    .from("certifications")
    .delete()
    .eq("id", certId)
    .eq("user_id", id);

  if (error) throw error;
},

  addProject: async (id: string, projectData: any) => {
  const { data, error } = await supabase
    .from("projects")
    .insert([
      {
        user_id: id,
        title: projectData.title,
        description: projectData.description,
        technologies_used: projectData.technologiesUsed,
        project_url: projectData.projectUrl,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
},

  deleteProject: async (id: string, projectId: string) => {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", id);

  if (error) throw error;
},

  // LOST & FOUND
  getLostItems: async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from("lost_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    userId: item.user_id,
    itemName: item.item_name,
    category: item.category,
    description: item.description,
    locationLost: item.location_lost,
    dateLost: item.date_lost,
    contactDetails: item.contact_details,
    image: item.image,
    status: item.status,
  }));
},

 createLostItem: async (itemData: any): Promise<any> => {
  const { data, error } = await supabase
    .from("lost_items")
    .insert([
      {
        user_id: itemData.userId,
        item_name: itemData.itemName,
        category: itemData.category,
        description: itemData.description,
        location_lost: itemData.locationLost,
        date_lost: itemData.dateLost,
        contact_details: itemData.contactDetails,
        image: itemData.image,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
},
  getFoundItems: async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from("found_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    userId: item.user_id,
    itemName: item.item_name,
    category: item.category,
    description: item.description,
    locationFound: item.location_found,
    dateFound: item.date_found,
    contactDetails: item.contact_details,
    image: item.image,
    status: item.status,
  }));
},

 createFoundItem: async (itemData: any): Promise<any> => {
  const { data, error } = await supabase
    .from("found_items")
    .insert([
      {
        user_id: itemData.userId,
        item_name: itemData.itemName,
        category: itemData.category,
        description: itemData.description,
        location_found: itemData.locationFound,
        date_found: itemData.dateFound,
        contact_details: itemData.contactDetails,
        image: itemData.image,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
},
  getMatches: async (): Promise<any[]> => {
  const { data: matches, error } = await supabase
    .from("item_matches")
    .select("*");

  if (error) throw error;

  const result = await Promise.all(
    (matches || []).map(async (m) => {
      const { data: lost } = await supabase
        .from("lost_items")
        .select("*")
        .eq("id", m.lost_item_id)
        .single();

      const { data: found } = await supabase
        .from("found_items")
        .select("*")
        .eq("id", m.found_item_id)
        .single();

      return {
        id: m.id,
        lostItemId: m.lost_item_id,
        foundItemId: m.found_item_id,
        similarityScore: m.similarity_score,
        matchConfidence: m.match_confidence,
        reason: m.reason,
        createdAt: m.created_at,

        lostItemName: lost?.item_name || "",
        lostLocation: lost?.location_lost || "",
        lostDate: lost?.date_lost || "",

        foundItemName: found?.item_name || "",
        foundLocation: found?.location_found || "",
        foundDate: found?.date_found || "",
      };
    })
  );

  return result;
},

getClaims: async (): Promise<any[]> => {

  const { data: claims, error } = await supabase
    .from("claims")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const result = await Promise.all(
    (claims || []).map(async (claim) => {

      const { data: lostItem } = await supabase
        .from("lost_items")
        .select("*")
        .eq("id", claim.lost_item_id)
        .single();

      const { data: foundItem } = await supabase
        .from("found_items")
        .select("*")
        .eq("id", claim.found_item_id)
        .single();

      const { data: user } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", claim.claimant_user_id)
        .single();

      return {
        id: claim.id,
        status: claim.status,
        createdAt: claim.created_at,

        verificationDetails:
          claim.verification_text ||
          claim.verification_details ||
          "No verification provided",

        lostItem,

        foundItem,

        claimedByUser: user
      };
    })
  );

  return result;
},
updateClaimStatus: async (
  id: string,
  status: string
): Promise<any> => {
  const { error } = await supabase
    .from("claims")
    .update({ status })
    .eq("id", id);

  if (error) throw error;

  return true;
},
submitClaim: async (claimData: any): Promise<any> => {

  console.log("CLAIM DATA RECEIVED:", claimData);
  console.log("VERIFICATION TEXT:", claimData.verificationText);

  const { data, error } = await supabase
    .from("claims")
    .insert({
      match_id: claimData.matchId,
      lost_item_id: claimData.lostItemId,
      found_item_id: claimData.foundItemId,
      claimant_user_id: claimData.userId,
      verification_text: claimData.verificationText,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;

  return data;
},
  

  // OPPORTUNITIES
  getOpportunities: async (): Promise<Opportunity[]> => {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    company: item.company,
    opportunityType: item.opportunity_type,
    description: item.description,
    location: item.location,
    applyLink: item.apply_link,
    deadline: item.deadline,
    isFeatured: item.is_featured,
  }));
},

  createOpportunity: async (oppData: any): Promise<any> => {
  const { data, error } = await supabase
    .from("opportunities")
    .insert([
      {
        title: oppData.title,
        company: oppData.company,
        opportunity_type: oppData.opportunityType,
        description: oppData.description,
        location: oppData.location,
        apply_link: oppData.applyLink,
        deadline: oppData.deadline,
        is_featured: oppData.isFeatured,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
},

  updateOpportunity: async (id: string, oppData: any): Promise<any> => {
  const { data, error } = await supabase
    .from("opportunities")
    .update({
      title: oppData.title,
      company: oppData.company,
      opportunity_type: oppData.opportunityType,
      description: oppData.description,
      location: oppData.location,
      apply_link: oppData.applyLink,
      deadline: oppData.deadline,
      is_featured: oppData.isFeatured,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
},

  deleteOpportunity: async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("opportunities")
    .delete()
    .eq("id", id);

  if (error) throw error;
},
  // NOTIFICATIONS
  getNotifications: async (userId: string): Promise<Notification[]> => {
    const res = await fetch(`/api/notifications/${userId}`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to retrieve notifications");
    return data.notifications;
  },

  markAsRead: async (id: string): Promise<void> => {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: "PUT",
      headers: getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update notification");
    }
  },

  // ADMIN OPERATIONS
  getAdminMetrics: async (): Promise<{ metrics: SystemMetrics; logs: any[] }> => {
    const res = await fetch("/api/admin/metrics", { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to retrieve admin dashboard metrics");
    return data;
  },

  getAdminUsers: async (): Promise<any[]> => {
    const res = await fetch("/api/admin/users", { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to get user administration records");
    return data.users;
  },

  changeUserRole: async (targetUserId: string, role: string): Promise<void> => {
    const res = await fetch(`/api/admin/users/${targetUserId}/role`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ role, adminId: localStorage.getItem("campus_user_id") }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to change role on backend");
    }
  },

  toggleUserSuspension: async (targetUserId: string, suspend: boolean): Promise<void> => {
    const res = await fetch(`/api/admin/users/${targetUserId}/suspend`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ suspend, adminId: localStorage.getItem("campus_user_id") }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to alter suspension status");
    }
  },

  // CAMPUS AI COMPANION CHAT
  askCampusAI: async (userId: string, messages: ConversationMessage[]): Promise<string> => {
    const res = await fetch("/api/assistant/chat", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ userId, messages }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Campus AI is recovering from a temporary mismatch.");
    return data.reply;
  }
};
