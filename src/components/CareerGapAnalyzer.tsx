import React, { useState } from "react";

export default function CareerGapAnalyzer() {
  const [careerGoal, setCareerGoal] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const analyzeCareer = async () => {
    if (!careerGoal.trim()) return;

    setLoading(true);

    try {
      const userId = localStorage.getItem("userId");

      const response = await fetch("/api/career/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          careerGoal,
        }),
      });

      const data = await response.json();

      setAnalysis(data.analysis);
    } catch (error) {
      console.error(error);
      setAnalysis("Unable to analyze career path.");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow">
      <h2 className="text-2xl font-bold text-green-700 mb-4">
        Career Gap Analyzer
      </h2>

      <input
        type="text"
        placeholder="Enter your dream career (e.g. Data Scientist)"
        value={careerGoal}
        onChange={(e) => setCareerGoal(e.target.value)}
        className="w-full border rounded-lg p-3"
      />

      <button
        onClick={analyzeCareer}
        disabled={loading}
        className="mt-4 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg"
      >
        {loading ? "Analyzing..." : "Analyze Career"}
      </button>

      <div className="mt-6 border rounded-lg p-4 min-h-[250px] whitespace-pre-wrap">
        {analysis || "Career analysis will appear here..."}
      </div>
    </div>
  );
}