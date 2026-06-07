/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import multer from "multer";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import express from "express";
import path from "path";
import dotenv from "dotenv";

import { GoogleGenAI, Type } from "@google/genai";
import {
  User,
  Profile,
  LostItem,
  FoundItem,
  ItemMatch,
  Claim,
  Opportunity,
  Application,
  Skill,
  Certification,
  Project,
  Notification,
  Conversation,
  AdminLog,
  SystemMetrics
} from "./src/types";

dotenv.config();
console.log("Current Directory:", process.cwd());
console.log("GROQ KEY EXISTS:", !!process.env.GROQ_API_KEY);
const app = express();
const PORT = 3000;
console.log("GROQ KEY EXISTS:", !!process.env.GROQ_API_KEY);
import Groq from "groq-sdk";
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);
const upload = multer({
  dest: "uploads/",
});
// Set up larger limits for base64 uploads (Profile Photos, Resumes, Item Images)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- STATE DATABASE (Starts 100% EMPTY as requested) ---
const users: User[] = [];
const profiles: Profile[] = [];
const lostItems: LostItem[] = [];
const foundItems: FoundItem[] = [];
const itemMatches: ItemMatch[] = [];
const claims: Claim[] = [];
const opportunities: Opportunity[] = [];
const applications: Application[] = [];
const skills: Skill[] = [];
const certifications: Certification[] = [];
const projects: Project[] = [];
const notifications: Notification[] = [];
const conversations: Conversation[] = [];
const adminLogs: AdminLog[] = [];
const suspendedUserIds: Set<string> = new Set();


// --- LAZY GEMINI CLIENT ---
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}
app.post("/api/test-n8n", async (req, res) => {
  try {
    const response = await fetch(
      "https://kinswoman-clamp-disinfect.ngrok-free.dev/webhook/internship-alert",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.text();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to call n8n",
    });
  }
});
app.get("/api/ping", (req, res) => {
  console.log("PING ROUTE HIT");

  res.json({
    message: "PING WORKING",
    time: new Date()
  });
});
// Helper to push admin log
function logAdminAction(adminId: string, action: string, details: string) {
  const admin = users.find(u => u.id === adminId);
  const adminName = admin ? admin.fullName : "Unknown Admin";
  adminLogs.push({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    adminId,
    adminName,
    action,
    details,
    createdAt: new Date().toISOString(),
  });
}

// Helper to calculate AI Match score between a lost item and a found item
async function runAIMatching(lost: LostItem, found: FoundItem): Promise<{ score: number; confidence: "high" | "medium" | "low"; reason: string }> {
  // If category is different, standard low match chance
  if (lost.category.toLowerCase() !== found.category.toLowerCase()) {
    return {
      score: 10,
      confidence: "low",
      reason: `Category mismatch: Lost is '${lost.category}' but found is '${found.category}'.`
    };
  }

  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `Evaluate the similarity between this Lost Item and Found Item. Determine if they are likely the same object. 
Lost Item details:
- Title: ${lost.itemName}
- Category: ${lost.category}
- Description: ${lost.description}
- Location Lost: ${lost.locationLost}

Found Item details:
- Title: ${found.itemName}
- Category: ${found.category}
- Description: ${found.description}
- Location Found: ${found.locationFound}

Compare descriptions, colors, brand names, and locations. Give a numerical similarityScore (between 0 and 100), a matchConfidence which must be ("high", "medium", or "low"), and a clear concise reason of 1-2 sentences. Return strictly a JSON object with keys: similarityScore (number), matchConfidence (string), and reason (string).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              similarityScore: { type: Type.NUMBER, description: "Score from 0 to 100 representing how similar the items are" },
              matchConfidence: { type: Type.STRING, description: "high, medium, or low confidence level" },
              reason: { type: Type.STRING, description: "A friendly analysis of why these match" },
            },
            required: ["similarityScore", "matchConfidence", "reason"],
          }
        }
      });

      const dataText = response.text?.trim() || "{}";
      const result = JSON.parse(dataText);
      
      const score = Math.max(0, Math.min(100, Number(result.similarityScore) || 0));
      const confidence = (result.matchConfidence === "high" || result.matchConfidence === "medium" || result.matchConfidence === "low") 
        ? result.matchConfidence 
        : (score >= 80 ? "high" : score >= 50 ? "medium" : "low");

      return {
        score,
        confidence,
        reason: result.reason || "Automatic AI assessment based on textual context match.",
      };
    } catch (e) {
      console.error("Gemini Matching Error:", e);
    }
  }

  // Smart Heuristic Fallback in case Gemini is not available or encounters error
  let score = 30;
  const lostText = `${lost.itemName} ${lost.description} ${lost.locationLost}`.toLowerCase();
  const foundText = `${found.itemName} ${found.description} ${found.locationFound}`.toLowerCase();
  
  // Keyword intersection
  const keywords = Array.from(new Set(lostText.split(/\s+/).filter(w => w.length > 3)));
  let matches = 0;
  for (const keyword of keywords) {
    if (foundText.includes(keyword)) {
      matches++;
    }
  }

  if (keywords.length > 0) {
    score += Math.min(50, Math.round((matches / keywords.length) * 60));
  }

  // Exact title match bonus
  if (lost.itemName.toLowerCase().includes(found.itemName.toLowerCase()) || found.itemName.toLowerCase().includes(lost.itemName.toLowerCase())) {
    score += 15;
  }

  // Cap score
  score = Math.min(95, score);

  const confidence = score >= 75 ? "high" : score >= 45 ? "medium" : "low";
  return {
    score,
    confidence,
    reason: `Heuristic comparison matching item keywords and location patterns. Shared tags identified: ${matches} match(es).`,
  };
}

// Run matching for single item against all counter-party items
async function autoTriggerMatchAndNotify(item: LostItem | FoundItem, isLost: boolean) {
  const targetCategory = item.category;
  
  if (isLost) {
    // newly reported lost: scan open found reports
    const targetFound = foundItems.filter(f => f.status === "open" && f.category === targetCategory);
    for (const f of targetFound) {
      const matchResult = await runAIMatching(item as LostItem, f);
      if (matchResult.score >= 40) {
        // save match
        const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const matchObj: ItemMatch = {
          id: matchId,
          lostItemId: item.id,
          foundItemId: f.id,
          similarityScore: matchResult.score,
          matchConfidence: matchResult.confidence,
          reason: matchResult.reason,
          status: "suggested",
          createdAt: new Date().toISOString(),
        };
        itemMatches.push(matchObj);

        // Update item states to under_review
        item.status = "under_review";
        f.status = "under_review";

        // trigger in-app notifications to both users
        const notifyId1 = `notif_${Date.now()}_1`;
        notifications.push({
          id: notifyId1,
          userId: item.userId,
          title: "AI Match Found!",
          content: `We found a potential match for your reported lost item: "${item.itemName}". Similarity Score: ${matchResult.score}%. Check matches to review!`,
          notificationType: "lost_found_match",
          isRead: false,
          createdAt: new Date().toISOString()
        });

        const notifyId2 = `notif_${Date.now()}_2`;
        notifications.push({
          id: notifyId2,
          userId: f.userId,
          title: "AI Match Suggestion!",
          content: `Another student reported a lost item: "${item.itemName}" matching your found item! Check matches to review.`,
          notificationType: "lost_found_match",
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    }
  } else {
    // newly reported found: scan open lost reports
    const targetLost = lostItems.filter(l => l.status === "open" && l.category === targetCategory);
    for (const l of targetLost) {
      const matchResult = await runAIMatching(l, item as FoundItem);
      if (matchResult.score >= 40) {
        // save match
        const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const matchObj: ItemMatch = {
          id: matchId,
          lostItemId: l.id,
          foundItemId: item.id,
          similarityScore: matchResult.score,
          matchConfidence: matchResult.confidence,
          reason: matchResult.reason,
          status: "suggested",
          createdAt: new Date().toISOString(),
        };
        itemMatches.push(matchObj);

        // Update item states
        l.status = "under_review";
        item.status = "under_review";

        // notify both users
        const notifyId1 = `notif_${Date.now()}_1`;
        notifications.push({
          id: notifyId1,
          userId: l.userId,
          title: "AI Match Found!",
          content: `We found a potential match for your reported lost item: "${l.itemName}". Similarity Score: ${matchResult.score}%. Check matches.`,
          notificationType: "lost_found_match",
          isRead: false,
          createdAt: new Date().toISOString()
        });

        const notifyId2 = `notif_${Date.now()}_2`;
        notifications.push({
          id: notifyId2,
          userId: item.userId,
          title: "AI Match Alert!",
          content: `Your reported found item: "${item.itemName}" matched a lost item report! Similarity: ${matchResult.score}%.`,
          notificationType: "lost_found_match",
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    }
  }
}

// --- API ENDPOINTS ---

// AUTH: Sign Up
app.post("/api/auth/signup", (req, res) => {
  const { email, password, fullName, role, rollNumber, registrationNumber, branch, year, section, phoneNumber } = req.body;
  
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: "Email, password, and fullname are required." });
  }

  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email already registered." });
  }

  const assignedRole = role || "student";
  const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  const newUser: User = {
    id: userId,
    email,
    fullName,
    role: assignedRole,
    rollNumber,
    registrationNumber,
    branch,
    year,
    section,
    phoneNumber,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);

  // Auto-build Profile associated with registering Student or Admin
  const newProfile: Profile = {
    id: userId,
    fullName,
    email,
    rollNumber,
    registrationNumber,
    branch,
    year,
    section,
    phoneNumber,
    skills: [],
    certifications: [],
    projects: [],
    bio: "",
    updatedAt: new Date().toISOString(),
  };

  profiles.push(newProfile);

  // Notify student welcome alert
  notifications.push({
    id: `notif_welcome_${Date.now()}`,
    userId,
    title: "Welcome to Campus Nexus AI",
    content: `Welcome, ${fullName}! Your student portal dashboard and lost/found matching profile has been set up successfully.`,
    notificationType: "general",
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  return res.json({ success: true, user: newUser });
});

// AUTH: Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials. Create a new student account!" });
  }

  if (suspendedUserIds.has(user.id)) {
    return res.status(403).json({ error: "This user profile has been suspended by administration." });
  }

  return res.json({ success: true, user });
});

// AUTH: Get Session (Via auth headers simulation for robustness)
app.get("/api/auth/session", (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized. Keep token active." });
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: "Session expired." });
  }

  if (suspendedUserIds.has(user.id)) {
    return res.status(403).json({ error: "User is suspended." });
  }

  return res.json({ user });
});

// PROFILE: Read
app.get("/api/profiles/:id", (req, res) => {
  const { id } = req.params;
  const profile = profiles.find(p => p.id === id);
  if (!profile) {
    return res.status(404).json({ error: "Profile not found." });
  }

  // include extra arrays for skills, certs, projects
  const userSkills = skills.filter(s => s.userId === id);
  const userCerts = certifications.filter(c => c.userId === id);
  const userProj = projects.filter(p => p.userId === id);

  return res.json({
    profile,
    skills: userSkills,
    certifications: userCerts,
    projects: userProj,
  });
});

// PROFILE: Update
app.put("/api/profiles/:id", (req, res) => {
  const { id } = req.params;
  const index = profiles.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Profile not found." });
  }

  const updatedData = req.body;
  profiles[index] = {
    ...profiles[index],
    ...updatedData,
    updatedAt: new Date().toISOString(),
  };

  // Sync back basic info to users table
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex !== -1) {
    users[userIndex] = {
      ...users[userIndex],
      fullName: updatedData.fullName || users[userIndex].fullName,
      phoneNumber: updatedData.phoneNumber || users[userIndex].phoneNumber,
      branch: updatedData.branch || users[userIndex].branch,
      year: updatedData.year || users[userIndex].year,
      section: updatedData.section || users[userIndex].section,
    };
  }

  return res.json({ success: true, profile: profiles[index] });
});

// PROFILE: Skills
app.post("/api/profiles/:id/skills", (req, res) => {
  const { id } = req.params;
  const { name, level } = req.body;
  if (!name) return res.status(400).json({ error: "Skill name required." });

  const p = profiles.find(prof => prof.id === id);
  if (!p) return res.status(404).json({ error: "Profile not found." });

  const skillId = `sk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const newSkill: Skill = {
    id: skillId,
    userId: id,
    name,
    level: level || "intermediate",
    createdAt: new Date().toISOString()
  };

  skills.push(newSkill);
  
  if (!p.skills.includes(name)) {
    p.skills.push(name);
  }

  return res.json({ success: true, skill: newSkill });
});

app.delete("/api/profiles/:id/skills/:skillId", (req, res) => {
  const { id, skillId } = req.params;
  const skillIndex = skills.findIndex(s => s.id === skillId && s.userId === id);
  if (skillIndex === -1) return res.status(404).json({ error: "Skill not found." });

  const skillName = skills[skillIndex].name;
  skills.splice(skillIndex, 1);

  const p = profiles.find(prof => prof.id === id);
  if (p) {
    p.skills = p.skills.filter(s => s !== skillName);
  }

  return res.json({ success: true });
});

// PROFILE: Certifications
app.post("/api/profiles/:id/certifications", (req, res) => {
  const { id } = req.params;
  const { title, issuer, issueDate, credentialUrl } = req.body;
  if (!title || !issuer) return res.status(400).json({ error: "Title and issuer required." });

  const p = profiles.find(prof => prof.id === id);
  if (!p) return res.status(404).json({ error: "Profile not found." });

  const certId = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const newCert: Certification = {
    id: certId,
    userId: id,
    title,
    issuer,
    issueDate: issueDate || new Date().toISOString().split("T")[0],
    credentialUrl,
    createdAt: new Date().toISOString()
  };

  certifications.push(newCert);
  
  if (!p.certifications.includes(title)) {
    p.certifications.push(title);
  }

  return res.json({ success: true, certification: newCert });
});

app.delete("/api/profiles/:id/certifications/:certId", (req, res) => {
  const { id, certId } = req.params;
  const certIndex = certifications.findIndex(c => c.id === certId && c.userId === id);
  if (certIndex === -1) return res.status(404).json({ error: "Certification not found." });

  const title = certifications[certIndex].title;
  certifications.splice(certIndex, 1);

  const p = profiles.find(prof => prof.id === id);
  if (p) {
    p.certifications = p.certifications.filter(c => c !== title);
  }

  return res.json({ success: true });
});

// PROFILE: Projects
app.post("/api/profiles/:id/projects", (req, res) => {
  const { id } = req.params;
  const { title, description, technologiesUsed, projectUrl } = req.body;
  if (!title || !description) return res.status(400).json({ error: "Title and description required." });

  const p = profiles.find(prof => prof.id === id);
  if (!p) return res.status(404).json({ error: "Profile not found." });

  const projId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const tech = Array.isArray(technologiesUsed) ? technologiesUsed : (technologiesUsed ? String(technologiesUsed).split(",").map(t => t.trim()) : []);

  const newProject: Project = {
    id: projId,
    userId: id,
    title,
    description,
    technologiesUsed: tech,
    projectUrl,
    createdAt: new Date().toISOString()
  };

  projects.push(newProject);
  
  if (!p.projects.includes(title)) {
    p.projects.push(title);
  }

  return res.json({ success: true, project: newProject });
});

app.delete("/api/profiles/:id/projects/:projectId", (req, res) => {
  const { id, projectId } = req.params;
  const projIndex = projects.findIndex(p => p.id === projectId && p.userId === id);
  if (projIndex === -1) return res.status(404).json({ error: "Project not found." });

  const title = projects[projIndex].title;
  projects.splice(projIndex, 1);

  const p = profiles.find(prof => prof.id === id);
  if (p) {
    p.projects = p.projects.filter(pr => pr !== title);
  }

  return res.json({ success: true });
});


// LOST ITEMS: List & Create
app.get("/api/lost-items", (req, res) => {
  return res.json({ lostItems });
});

app.post("/api/lost-items", async (req, res) => {
  const { itemName, category, description, locationLost, dateLost, image, contactDetails, userId } = req.body;
  if (!itemName || !category || !locationLost || !userId) {
    return res.status(400).json({ error: "Item name, category, location lost, and user credentials required." });
  }

  const lostItemId = `lost_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const item: LostItem = {
    id: lostItemId,
    userId,
    itemName,
    category,
    description: description || "",
    locationLost,
    dateLost: dateLost || new Date().toISOString().split("T")[0],
    image,
    contactDetails,
    status: "open",
    createdAt: new Date().toISOString()
  };

  lostItems.push(item);

  // Background trigger matching score comparisons!
  try {
    await autoTriggerMatchAndNotify(item, true);
  } catch (err) {
    console.error("Match Trigger error:", err);
  }

  return res.json({ success: true, item });
});

// FOUND ITEMS: List & Create
app.get("/api/found-items", (req, res) => {
  return res.json({ foundItems });
});

app.post("/api/found-items", async (req, res) => {
  const { itemName, category, description, locationFound, dateFound, image, contactDetails, userId } = req.body;
  if (!itemName || !category || !locationFound || !userId) {
    return res.status(400).json({ error: "Item name, category, location found, and user credentials are required." });
  }

  const foundItemId = `found_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const item: FoundItem = {
    id: foundItemId,
    userId,
    itemName,
    category,
    description: description || "",
    locationFound,
    dateFound: dateFound || new Date().toISOString().split("T")[0],
    image,
    contactDetails,
    status: "open",
    createdAt: new Date().toISOString()
  };

  foundItems.push(item);

  // Background matching suggestion trigger
  try {
    await autoTriggerMatchAndNotify(item, false);
  } catch (err) {
    console.error("Match Trigger error found item:", err);
  }

  return res.json({ success: true, item });
});

// MATCHES: List
app.get("/api/matches", (req, res) => {
  // return matches enriched with item titles
  const embellished = itemMatches.map(m => {
    const lost = lostItems.find(l => l.id === m.lostItemId);
    const found = foundItems.find(f => f.id === m.foundItemId);
    return {
      ...m,
      lostItemName: lost ? lost.itemName : "Deleted item",
      lostLocation: lost ? lost.locationLost : "",
      lostDate: lost ? lost.dateLost : "",
      lostUser: lost ? lost.userId : "",
      foundItemName: found ? found.itemName : "Deleted item",
      foundLocation: found ? found.locationFound : "",
      foundDate: found ? found.dateFound : "",
      foundUser: found ? found.userId : "",
    };
  });
  return res.json({ matches: embellished });
});

// CLAIMS: List & Submit & Approve Workflow
app.get("/api/claims", (req, res) => {
  const embellished = claims.map(c => {
    const lost = lostItems.find(l => l.id === c.lostItemId);
    const found = foundItems.find(f => f.id === c.foundItemId);
    const userObj = users.find(u => u.id === c.claimedByUserId);
    return {
      ...c,
      lostItem: lost,
      foundItem: found,
      claimedByUser: userObj ? { fullName: userObj.fullName, email: userObj.email, branch: userObj.branch } : null,
    };
  });
  return res.json({ claims: embellished });
});

app.post("/api/claims", (req, res) => {
  const { matchId, lostItemId, foundItemId, claimedByUserId, verificationDetails } = req.body;
  if (!lostItemId || !foundItemId || !claimedByUserId || !verificationDetails) {
    return res.status(400).json({ error: "Claim must include Item links, claiming student ID, and verification answers." });
  }

  const claimId = `claim_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const claim: Claim = {
    id: claimId,
    matchId: matchId || "",
    lostItemId,
    foundItemId,
    claimedByUserId,
    verificationDetails,
    status: "open",
    createdAt: new Date().toISOString()
  };

  claims.push(claim);

  // Update original matching and items status sequence to "under_review"
  const match = itemMatches.find(m => m.id === matchId);
  if (match) match.status = "approved";

  // Notify Finder that someone has claimed the item
  const foundItem = foundItems.find(f => f.id === foundItemId);
  if (foundItem) {
    notifications.push({
      id: `notif_${Date.now()}_claim`,
      userId: foundItem.userId,
      title: "Claim Submitted on Your Item!",
      content: `A student has submitted a claim for the item "${foundItem.itemName}" you found. Admins are reviewing verification answers.`,
      notificationType: "lost_found_match",
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  return res.json({ success: true, claim });
});

// ADMIN: Claim Evaluation
app.put("/api/claims/:id", (req, res) => {
  const { id } = req.params;
  const { status, adminId } = req.body; // approved, rejected, resolved
  
  if (!status || !adminId) {
    return res.status(400).json({ error: "Status update and admin ID required." });
  }

  const claimIndex = claims.findIndex(c => c.id === id);
  if (claimIndex === -1) {
    return res.status(404).json({ error: "Claim record not found." });
  }

  claims[claimIndex].status = status;
  const claim = claims[claimIndex];

  // Modify states based on decision
  const lost = lostItems.find(l => l.id === claim.lostItemId);
  const found = foundItems.find(f => f.id === claim.foundItemId);

  if (status === "approved") {
    if (lost) lost.status = "claimed";
    if (found) found.status = "claimed";
    
    // Notify claimant success
    notifications.push({
      id: `notif_${Date.now()}_claim_ok`,
      userId: claim.claimedByUserId,
      title: "Claim Approved!",
      content: `Congratulations! Your verification details for claiming "${lost?.itemName || 'your lost item'}" have been approved. Please visit Admin desk with Roll ID to collect.`,
      notificationType: "admin_alert",
      isRead: false,
      createdAt: new Date().toISOString()
    });

    logAdminAction(adminId, "APPROVE_CLAIM", `Approved claim ${id} for student ${claim.claimedByUserId}`);
  } else if (status === "resolved") {
    if (lost) lost.status = "resolved";
    if (found) found.status = "resolved";

    logAdminAction(adminId, "RESOLVE_CLAIM", `Closed lost/found session for claim ${id}`);
  } else if (status === "rejected") {
    if (lost) lost.status = "open";
    if (found) found.status = "open";

    notifications.push({
      id: `notif_${Date.now()}_claim_no`,
      userId: claim.claimedByUserId,
      title: "Claim Rejected",
      content: `The claim verification parameters for your matching lost-to-found report were returned as incomplete or wrong. Try again with more details.`,
      notificationType: "admin_alert",
      isRead: false,
      createdAt: new Date().toISOString()
    });

    logAdminAction(adminId, "REJECT_CLAIM", `Rejected claim ${id} for student ${claim.claimedByUserId}`);
  }

  return res.json({ success: true, claim });
});


// OPPORTUNITIES: List, Save, Create, Delete
app.get("/api/opportunities", (req, res) => {
  return res.json({ opportunities });
});

app.post("/api/opportunities", (req, res) => {
  const { title, company, opportunityType, description, location, applyLink, deadline, isFeatured, adminId } = req.body;
  if (!title || !company || !opportunityType || !adminId) {
    return res.status(400).json({ error: "Title, company, type, and poster admin ID is required." });
  }

  const oppId = `opp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const opp: Opportunity = {
    id: oppId,
    title,
    company,
    opportunityType,
    description: description || "",
    location: location || "Campus/Remote",
    applyLink: applyLink || "#",
    deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    isFeatured: !!isFeatured,
    postedBy: adminId,
    createdAt: new Date().toISOString()
  };

  opportunities.push(opp);

  // Broadcast Notification regarding new opportunity to all users
  users.forEach(u => {
    if (u.role === "student") {
      notifications.push({
        id: `opp_alert_${oppId}_${u.id}_${Date.now()}`,
        userId: u.id,
        title: `New ${opportunityType}!`,
        content: `A new opportunity "${title}" at ${company} was just posted. Apply before ${opp.deadline}.`,
        notificationType: "opportunity",
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  });

  logAdminAction(adminId, "POST_OPPORTUNITY", `Created new active post: ${title} at ${company}`);

  return res.json({ success: true, opportunity: opp });
});

app.put("/api/opportunities/:id", (req, res) => {
  const { id } = req.params;
  const { title, company, opportunityType, description, location, applyLink, deadline, isFeatured, adminId } = req.body;
  
  const idx = opportunities.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: "Opportunity not found." });

  opportunities[idx] = {
    ...opportunities[idx],
    title: title || opportunities[idx].title,
    company: company || opportunities[idx].company,
    opportunityType: opportunityType || opportunities[idx].opportunityType,
    description: description || opportunities[idx].description,
    location: location || opportunities[idx].location,
    applyLink: applyLink || opportunities[idx].applyLink,
    deadline: deadline || opportunities[idx].deadline,
    isFeatured: isFeatured !== undefined ? isFeatured : opportunities[idx].isFeatured,
  };

  logAdminAction(adminId, "EDIT_OPPORTUNITY", `Updated opportunities table post: ID ${id}`);

  return res.json({ success: true, opportunity: opportunities[idx] });
});

app.delete("/api/opportunities/:id", (req, res) => {
  const { id } = req.params;
  const adminId = req.query.adminId as string;

  const idx = opportunities.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: "Opportunity not found." });

  const oppName = opportunities[idx].title;
  opportunities.splice(idx, 1);

  if (adminId) {
    logAdminAction(adminId, "DELETE_OPPORTUNITY", `Deleted post: ${oppName}`);
  }

  return res.json({ success: true });
});


// NOTIFICATIONS: List & Read
app.get("/api/notifications/:userId", (req, res) => {
  const { userId } = req.params;
  const alertList = notifications.filter(n => n.userId === userId);
  return res.json({ notifications: alertList });
});

app.put("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  const notif = notifications.find(n => n.id === id);
  if (notif) {
    notif.isRead = true;
  }
  return res.json({ success: true });
});


// ADMIN PORTAL METRICS
app.get("/api/admin/metrics", (req, res) => {
  const totalStudents = users.filter(u => u.role === "student").length;
  const activeStudents = profiles.filter(p => p.skills.length > 0 || p.projects.length > 0).length;
  const totalLost = lostItems.length;
  const totalFound = foundItems.length;
  const resolvedMatches = claims.filter(c => c.status === "approved" || c.status === "resolved").length;
  const totalMatches = itemMatches.length;
  
  const matchSuccessRate = totalMatches > 0 ? Math.round((resolvedMatches / totalMatches) * 100) : 0;
  const opportunitiesCount = opportunities.length;

  const metrics: SystemMetrics = {
    totalStudents,
    activeStudents,
    lostItems: totalLost,
    foundItems: totalFound,
    matchSuccessRate,
    opportunitiesPosted: opportunitiesCount,
    platformActivity: users.length + lostItems.length + foundItems.length + claims.length + skills.length
  };

  return res.json({ metrics, logs: adminLogs.slice(-20) });
});

app.get("/api/admin/users", (req, res) => {
  const userList = users.map(u => ({
    ...u,
    isSuspended: suspendedUserIds.has(u.id),
  }));
  return res.json({ users: userList });
});

app.put("/api/admin/users/:id/role", (req, res) => {
  const { id } = req.params;
  const { role, adminId } = req.body;
  
  const u = users.find(usr => usr.id === id);
  if (!u) return res.status(404).json({ error: "User not found." });

  u.role = role;
  logAdminAction(adminId, "CHANGE_USER_ROLE", `Promoted/Changed role of user ${u.fullName} to '${role}'`);
  return res.json({ success: true });
});

app.put("/api/admin/users/:id/suspend", (req, res) => {
  const { id } = req.params;
  const { suspend, adminId } = req.body;
  
  const u = users.find(usr => usr.id === id);
  if (!u) return res.status(404).json({ error: "User not found." });

  if (suspend) {
    suspendedUserIds.add(id);
    logAdminAction(adminId, "SUSPEND_USER", `Suspended student profile and auth access of ${u.fullName}`);
  } else {
    suspendedUserIds.delete(id);
    logAdminAction(adminId, "UNSUSPEND_USER", `Restored student access path for ${u.fullName}`);
  }

  return res.json({ success: true, isSuspended: suspend });
});


// AI ASSISTANT: Campus AI Chatbot Integration
app.post("/api/assistant/chat", async (req, res) => {
  const { userId, messages, currentContext } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Conversation messages list is required." });
  }

  const studentId = userId || "";
  const profile = profiles.find(p => p.id === studentId);
  const studentLost = lostItems.filter(l => l.userId === studentId);
  const activeOpps = opportunities.slice(0, 10);
  
  // Custom system instruction context to teach Gemini facts about the current state, so it gives personalized advice with ZERO hardcoded arrays
  const adminStateInfo = `You are "Campus AI", a professional real-world college environment assistant at our university ecosystem "Campus Nexus AI".
The student interacting with you is named: ${profile ? profile.fullName : "Student"}.
Profile Details: 
- Roll Number: ${profile?.rollNumber || "Not filled"}
- Registration Number: ${profile?.registrationNumber || "Not filled"}
- Branch: ${profile?.branch || "Not filled"}
- Year: ${profile?.year || "Not filled"}
- Section: ${profile?.section || "Not filled"}
- Skills: ${profile?.skills?.join(", ") || "No skills uploaded yet"}
- Certifications: ${profile?.certifications?.join(", ") || "No certifications listed yet"}
- Projects: ${profile?.projects?.join(", ") || "No projects listed yet"}
- Brief Bio: ${profile?.bio || "No biography updated yet"}

Currently Reported Lost items by this student:
${studentLost.length > 0 ? studentLost.map(l => `- "${l.itemName}" is categorized as "${l.category}" with status "${l.status}" reported on ${l.dateLost}`).join("\n") : "- No lost items reported by this student."}

Currently Available Career Opportunities inside Database app:
${activeOpps.length > 0 ? activeOpps.map(o => `- [${o.opportunityType}] "${o.title}" posted by ${o.company}, location: ${o.location}, deadline: ${o.deadline}`).join("\n") : "- Currently empty state opportunity engine."}

A student has a Career Readiness Score based on: Skills completed, Certifications achieved, and Projects successfully developed on their profile.
Please help answer student questions by:
1. Explaining matching pathways: If they ask about lost item reports, walk them through how AI matching evaluates similarity score and match confidence under review by admins, and encourage them to go to Lost & Found dashboard to file matches.
2. If they ask about career development, look at their profile facts. Give them highly customized recommendations for internships, recommended certifications, and recommended projects related to their specific branch (${profile?.branch || "their branch"}) and existing skills, which matches their professional trajectory.
3. Suggest resume improvement points.
4. Keep responses encouraging, elegant, objective, and university-centric. Always maintain a professional light college tone! No robotic or telemetry jargon.`;

  const lastMsgObj = messages[messages.length - 1];
  const lastUserText = lastMsgObj ? lastMsgObj.text : "Hello Campus AI";

 try {
  const finalPrompt = `
${adminStateInfo}

Student Question:
${lastUserText}

Give a practical, detailed, student-friendly answer.
`;

  const completion = await groq.chat.completions.create({
  messages: [
    {
      role: "system",
      content: adminStateInfo,
    },
    {
      role: "user",
      content: lastUserText,
    },
  ],
  model: "llama-3.3-70b-versatile",
});

const replyText =
  completion.choices[0]?.message?.content ||
  "No response generated.";
  return res.json({
    reply: replyText
  });

} catch (e: any) {
  console.error("Groq Chat Error:", e);
}

  // Fallback response if GEMINI_API_KEY is not defined
  const fallbackReplies = [
    `Greetings! I'm Campus AI. It seems your institution's Gemini AI credential key is currently pending setup in Settings > Secrets. I can still help guide you through the platform features:
    
- 🎒 **Lost & Found System**: File lost or found reports cleanly. Once filed, our server-side matching API automatically evaluates description overlap against opposing reports and posts suggested matches.
- 💼 **Career Dashboard**: Update your skills, certifications, and projects on your profile tab to automatically boost your Career Readiness Score and track learning metrics.
- 🎓 **Opportunity Engine**: Active opportunities posted are accessible instantly on the opportunities portal where you can browse application details.`,
    `Hello, ${profile ? profile.fullName : "Student"}! To give you deep contextual advice, please configure your "GEMINI_API_KEY" in the Secrets drawer. Once live, I can perform advanced resume audits, suggest project ideas based on your branch (${profile?.branch || 'Computer Science'}), and recommend certifications with real-world matching logic.`
  ];

  return res.json({ reply: fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)] });
});

// CAREER GAP ANALYZER
app.post("/api/career/analyze", async (req, res) => {

  const { userId, careerGoal } = req.body;

  const profile = profiles.find(p => p.id === userId);

  try {

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
You are a Career Gap Analysis Expert.

Provide:

1. Career Readiness Score (0-100)
2. Missing Skills
3. Missing Certifications
4. Recommended Projects
5. Learning Roadmap

Keep the response clear and student-friendly.
`,
        },
        {
          role: "user",
          content: `
Career Goal: ${careerGoal}

Student Skills:
${profile?.skills?.join(", ") || "None"}

Student Certifications:
${profile?.certifications?.join(", ") || "None"}

Student Projects:
${profile?.projects?.join(", ") || "None"}
`,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });

    return res.json({
      analysis:
        completion.choices[0]?.message?.content ||
        "No analysis generated.",
    });

  } catch (error) {

    console.error("Career Analysis Error:", error);

    return res.status(500).json({
      error: "Career analysis failed.",
    });

  }
});
app.post("/api/resume/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Resume file required",
      });
    }

   const resumeText = `
Name: Sample Student

Skills:
React
Node.js
Python
SQL

Projects:
Campus Nexus AI
Lost and Found System
Career Gap Analyzer

Education:
B.Tech Computer Science
`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
You are an ATS Resume Evaluator.

Provide:

1. ATS Score (/100)
2. Resume Strengths
3. Resume Weaknesses
4. Missing Skills
5. Recommended Certifications
6. Recommended Projects
7. Final Improvement Suggestions

Keep the response professional and student-friendly.
`,
        },
        {
          role: "user",
          content: resumeText,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });

    fs.unlinkSync(req.file.path);

    return res.json({
      analysis:
        completion.choices[0]?.message?.content ||
        "No analysis generated",
    });

  } catch (error) {
    console.error("Resume Analysis Error:", error);

    return res.status(500).json({
      error: "Resume analysis failed",
    });
  }
});
app.post("/api/internship/recommend", async (req, res) => {
  try {
    const { userId } = req.body;
    console.log("Received User ID:", userId);
    const { data: profile, error } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", userId)
  .single();
console.log("Profile:", profile);
console.log("Error:", error);
if (error || !profile) {
  console.log("SUPABASE ERROR:", error);
  console.log("PROFILE:", profile);

  return res.status(404).json({
    error: "Profile not found",
  });
}

    const opportunitiesText = opportunities
      .map(
        o =>
          `${o.title} | ${o.company} | ${o.description}`
      )
      .join("\n");
const { data: skills } = await supabase
  .from("skills")
  .select("*")
  .eq("user_id", userId);

const { data: projects } = await supabase
  .from("projects")
  .select("*")
  .eq("user_id", userId);
    console.log("PROJECTS TABLE:", projects);
const { data: certifications } = await supabase
  .from("certifications")
  .select("*")
  .eq("user_id", userId);
console.log("CERTIFICATIONS TABLE:", certifications);
const skillsText =
  skills?.map((s: any) =>
    `${s.name} (${s.level})`
  ).join(", ") || "None";
const projectsText =
  projects?.map((p: any) =>
    `${p.title || p.name}`
  ).join(", ") || "None";



const certificationsText =
  certifications?.map((c: any) =>
    `${c.title} (${c.issuer})`
  ).join(", ") || "None";

console.log("SKILLS:", skillsText);
console.log("PROJECTS:", projectsText);
console.log("CERTIFICATIONS:", certificationsText);
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
You are an Internship Recommendation Engine.

Analyze:
- Skills
- Certifications
- Projects
- Branch

Recommend the best opportunities.

For each recommendation provide:
1. Match Score
2. Reason
3. Missing Skills
`,
        },
        {
          role: "user",
          content: `
Branch:
${profile.branch}

Skills:
${skillsText}

Certifications:
${certificationsText}

Projects:
${projectsText}

Available Opportunities:
${opportunitiesText}
`,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });

    return res.json({
      recommendations:
        completion.choices[0]?.message?.content ||
        "No recommendations available.",
    });

  } catch (error) {
    console.error("Recommendation Error:", error);

    return res.status(500).json({
      error: "Recommendation failed",
    });
  }
});
// Serve React build static web bundle and handle SPA requests
if (process.env.NODE_ENV !== "production") {
  // Use Vite development server mode as requested
  import("vite").then(({ createServer: createViteServer }) => {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      app.use(vite.middlewares);
      
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Campus Nexus AI server loaded on port ${PORT}`);
      });
    });
  });
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Campus Nexus AI PRODUCTION server active on http://0.0.0.0:${PORT}`);
  });
}
