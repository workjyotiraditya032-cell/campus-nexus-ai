import React, { useState } from "react";
import { askGroq } from "../services/groq";

export default function AIAssistant() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("Thinking...");

    try {
      const result = await askGroq(question);
      setAnswer(result);
    } catch (error) {
      console.error(error);
      setAnswer("AI service unavailable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-blue-900">
        Campus AI Assistant
      </h2>

      <p className="text-gray-600 mb-4">
        Ask about internships, placements, projects, skills, careers, resumes,
        and learning roadmaps.
      </p>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Example: How can I become a Data Scientist?"
        className="w-full border p-3 rounded-lg min-h-[120px]"
      />

      <button
        onClick={askAI}
        disabled={loading}
        className="mt-4 px-5 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
      >
        {loading ? "Thinking..." : "Ask AI"}
      </button>

      <div className="mt-6 border rounded-lg p-4 bg-gray-50 min-h-[150px]">
        <h3 className="font-semibold text-blue-900 mb-2">
          AI Response
        </h3>

        <div className="whitespace-pre-wrap text-gray-800">
          {answer || "AI response will appear here..."}
        </div>
      </div>
    </div>
  );
}