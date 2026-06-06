/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { ConversationMessage, User } from "../types";
import { 
  Sparkles, Send, X, MessageSquare, ArrowRight, CornerDownRight, 
  User as UserIcon, Bot, HelpCircle, Loader2, RefreshCw 
} from "lucide-react";

interface CampusAIProps {
  user: User;
  isFloating?: boolean;
  onCloseFloating?: () => void;
}

export default function CampusAI({ user, isFloating = false, onCloseFloating }: CampusAIProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const starterPrompts = [
    "Recommend R&D projects for my academic branch",
    "Explain how Lost & Found similarity scanning operates",
    "Suggest internships based on my profile criteria",
    "How do I boost my Career Readiness index?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    // Inject welcoming prompt once empty
    if (messages.length === 0) {
      setMessages([
        {
          role: "model",
          text: `Greetings, ${user.fullName}! I'm **Campus AI**, your institutional advisor. 
          
I can perform deep diagnostics on your academic profile, suggest projects or industry certifications, guide you through verification of lost articles, or answer questions about active internships. 

Select a quick-inquiry block below or input custom questions!`,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, [user.fullName]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ConversationMessage = {
      role: "user",
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    // Prepare full transcript context
    const fullTranscript = [...messages, userMsg];

    try {
      const reply = await api.askCampusAI(user.id, fullTranscript);
      setMessages(prev => [...prev, {
        role: "model",
        text: reply,
        timestamp: new Date().toISOString()
      }]);
    } catch (err: any) {
      setError("AI core is temporarily resetting. Click re-sync button.");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "model",
        text: `Chat transcripts cleared. Ask me anything regarding campus opportunities, resume audits, or Lost & Found item claims!`,
        timestamp: new Date().toISOString()
      }
    ]);
    setError(null);
  };

  // Helper parsing markdown details slightly (like bold text or lists)
  const formatText = (txt: string) => {
    return txt.split("\n").map((line, lineIdx) => {
      // Bold text replacements **word**
      let formatted = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      
      // Simple inline lists or bullet points
      const isBullet = line.trim().startsWith("-") || line.trim().startsWith("*");
      
      return (
        <span key={lineIdx} className={`block ${isBullet ? "pl-4 py-0.5" : "py-0.5 animate-fade-in"}`}>
          {formatted.split("**").map((part, partIdx) => {
            if (partIdx % 2 === 1) {
              return <strong key={partIdx} className="font-extrabold text-blue-950 font-sans">{part}</strong>;
            }
            return part;
          })}
        </span>
      );
    });
  };

  if (isFloating) {
    /* FLOATING WIDGET LAYOUT PRESENTATION */
    return (
      <div id="floating_assistant_widget" className="fixed bottom-6 right-6 w-80 sm:w-96 h-[550px] bg-white rounded-2xl border border-slate-250 shadow-2xl z-50 flex flex-col overflow-hidden font-sans border-slate-100">
        {/* Header bar widget */}
        <div className="bg-blue-900 text-white p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 fill-yellow-300 text-yellow-300" />
            <div>
              <h4 className="text-xs font-extrabold tracking-wide">Campus AI Companion</h4>
              <p className="text-[10px] text-blue-100">Live academic advisor</p>
            </div>
          </div>
          <button onClick={onCloseFloating} className="text-blue-100 hover:text-white cursor-pointer p-1">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Message body widget */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          
          <div className="space-y-4 text-xs font-sans">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-2.5 items-start ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border text-[10px] ${m.role === "user" ? "bg-blue-900 text-white border-blue-950" : "bg-white text-indigo-905 text-indigo-700 border-indigo-150 shadow-xs"}`}>
                  {m.role === "user" ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                <div className={`p-3 rounded-2xl max-w-[75%] leading-relaxed ${m.role === "user" ? "bg-blue-900 text-white" : "bg-white text-slate-800 border"}`}>
                  {formatText(m.text)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center text-slate-400 pl-1">
                <Loader2 className="h-4 w-4 animate-spin text-blue-900" />
                <span className="text-[10px] font-medium">Campus AI compiles database matrixes...</span>
              </div>
            )}

            {error && (
              <div className="p-2.5 bg-red-50 border rounded-xl text-red-700 text-[11px] flex items-center justify-between gap-2">
                <span>{error}</span>
                <button onClick={() => handleSend("Hello Campus AI")} className="text-red-900 underline font-bold">Retry</button>
              </div>
            )}
          </div>
          
          <div ref={messagesEndRef} />
        </div>

        {/* Widget footer starter prompts */}
        {messages.length === 1 && (
          <div className="p-3 bg-white border-t border-slate-100 space-y-1.5 shrink-0 select-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Starter inquiries</p>
            <div className="flex flex-col gap-1 text-[11px]">
              {starterPrompts.slice(0, 3).map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="w-full text-left p-1.5 border border-slate-102 hover:bg-slate-50 text-slate-705 text-slate-700 hover:text-slate-900 rounded-lg truncate text-[10.5px] cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sender controls widget */}
        <div className="p-3 border-t border-slate-100 bg-white shrink-0 flex gap-2">
          <input
            type="text"
            placeholder="Query details here..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            onKeyDown={e => e.key === "Enter" && handleSend(input)}
            className="flex-1 bg-slate-100 px-3 py-1.5 rounded-lg text-xs text-slate-805 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-900"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={loading || !input.trim()}
            className="p-1.5 px-3 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg shadow-sm cursor-pointer shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  /* FULL-PAGE PRESENTATION CHAT */
  return (
    <div id="full_ai_workspace" className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm min-h-[620px] max-h-[80vh] flex flex-col justify-between font-sans">
      
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-900 rounded-2xl text-white shadow-sm shrink-0">
            <Sparkles className="h-6 w-6 text-yellow-300 fill-yellow-300" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-blue-950">Campus AI Advisor Workspace</h2>
            <p className="text-xs text-slate-550 text-slate-500">
              Interactive contextual AI assistant connected to student resume arrays, lost reports databases, and active internships.
            </p>
          </div>
        </div>

        <button 
          onClick={clearChat}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 font-bold text-xs rounded-xl shadow-xs cursor-pointer select-none"
        >
          <RefreshCw className="h-3 w-3 shrink-0" />
          Reset Canvas
        </button>
      </div>

      {/* Main chat log workspace */}
      <div className="flex-1 overflow-y-auto my-6 px-4 py-2 space-y-6 bg-slate-50/50 rounded-2xl border border-inner">
        <div className="space-y-6 text-sm font-sans max-w-4xl mx-auto">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3.5 items-start ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border text-xs ${m.role === "user" ? "bg-blue-900 text-white border-blue-950" : "bg-white text-indigo-905 text-indigo-700 border-indigo-150 shadow-sm"}`}>
                {m.role === "user" ? <UserIcon className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
              </div>

              <div className={`p-4 rounded-2xl max-w-[70%] leading-relaxed shadow-xs ${m.role === "user" ? "bg-blue-900 text-white border border-blue-950" : "bg-white text-slate-800 border border-slate-100"}`}>
                {formatText(m.text)}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 items-center text-slate-400 pl-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-900" />
              <span className="text-xs font-semibold">Campus AI is synchronizing and evaluating your inquiries...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border rounded-xl text-red-700 text-xs flex items-center justify-between max-w-md mx-auto">
              <span>{error}</span>
              <button onClick={() => handleSend("Hello Campus AI")} className="text-red-900 font-bold underline">Re-sync Connection</button>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Footer starter prompts & input */}
      <div className="space-y-4 shrink-0 max-w-4xl w-full mx-auto">
        {messages.length === 1 && (
          <div className="space-y-2 select-none">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Target Inquiries Dashboard</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {starterPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="text-left p-3 border border-slate-150 hover:bg-slate-50 text-slate-705 text-slate-700 hover:text-slate-900 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <HelpCircle className="h-4 w-4 text-blue-900 shrink-0" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-2 items-center">
          <input
            type="text"
            placeholder="Instruct advisor here (e.g. recommend a solid Node.js research project)"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            onKeyDown={e => e.key === "Enter" && handleSend(input)}
            className="flex-1 bg-transparent border-0 text-sm text-slate-805 text-slate-800 focus:outline-none px-3"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={loading || !input.trim()}
            className="inline-flex h-10 w-10 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl items-center justify-center shadow-md cursor-pointer shrink-0 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
