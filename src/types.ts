/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "student" | "admin" | "superadmin";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  rollNumber?: string;
  registrationNumber?: string;
  branch?: string;
  year?: string;
  section?: string;
  phoneNumber?: string;
  createdAt: string;
}

export interface Profile {
  id: string; // matches user.id
  fullName: string;
  rollNumber?: string;
  registrationNumber?: string;
  branch?: string;
  year?: string;
  section?: string;
  email: string;
  phoneNumber?: string;
  profilePhoto?: string; // base64 or url
  skills: string[]; // array of strings
  certifications: string[]; // array of strings
  projects: string[]; // array of strings
  resumeUrl?: string;
  resumeName?: string;
  linkedInUrl?: string;
  gitHubUrl?: string;
  bio?: string;
  updatedAt: string;
}

export interface LostItem {
  id: string;
  userId: string;
  itemName: string;
  category: string;
  description: string;
  locationLost: string;
  dateLost: string;
  image?: string; // base64 or url
  contactDetails: string;
  status: "open" | "under_review" | "matched" | "claimed" | "resolved";
  createdAt: string;
}

export interface FoundItem {
  id: string;
  userId: string;
  itemName: string;
  category: string;
  description: string;
  locationFound: string;
  dateFound: string;
  image?: string; // base64 or url
  contactDetails: string;
  status: "open" | "under_review" | "matched" | "claimed" | "resolved";
  createdAt: string;
}

export interface ItemMatch {
  id: string;
  lostItemId: string;
  foundItemId: string;
  similarityScore: number; // 0 to 100
  matchConfidence: "high" | "medium" | "low";
  reason: string;
  status: "suggested" | "approved" | "rejected";
  createdAt: string;
}

export interface Claim {
  id: string;
  matchId: string;
  lostItemId: string;
  foundItemId: string;
  claimedByUserId: string; // student of lost item
  verificationDetails: string;
  status: "open" | "reviewing" | "approved" | "rejected" | "resolved";
  createdAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  opportunityType: "Internship" | "Hackathon" | "Scholarship" | "Competition" | "Workshop" | "Seminar" | "Placement Drive" | "Campus Event";
  description: string;
  location: string;
  applyLink: string;
  deadline: string;
  isFeatured: boolean;
  postedBy: string; // admin or superadmin ID
  createdAt: string;
}

export interface Application {
  id: string;
  opportunityId: string;
  userId: string;
  status: "applied" | "saved" | "reviewed";
  createdAt: string;
}

export interface Skill {
  id: string;
  userId: string;
  name: string;
  level: "beginner" | "intermediate" | "advanced";
  createdAt: string;
}

export interface Certification {
  id: string;
  userId: string;
  title: string;
  issuer: string;
  issueDate: string;
  credentialUrl?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  technologiesUsed: string[];
  projectUrl?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string; // target user
  title: string;
  content: string;
  notificationType: "general" | "opportunity" | "lost_found_match" | "admin_alert";
  isRead: boolean;
  createdAt: string;
}

export interface ConversationMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  updatedAt: string;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface SystemMetrics {
  totalStudents: number;
  activeStudents: number;
  lostItems: number;
  foundItems: number;
  matchSuccessRate: number;
  opportunitiesPosted: number;
  platformActivity: number;
}
