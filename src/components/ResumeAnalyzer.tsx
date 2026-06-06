import React, { useState } from "react";

export default function ResumeAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const analyzeResume = async () => {
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const response = await fetch("/api/resume/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      setResult(data.analysis || data.error);
    } catch (err) {
      setResult("Resume analysis failed.");
    }

    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-900">
        Resume Analyzer
      </h1>

      <input
        type="file"
        accept=".pdf"
        onChange={(e) =>
          setFile(e.target.files?.[0] || null)
        }
      />

      <button
        onClick={analyzeResume}
        className="ml-4 px-4 py-2 bg-blue-900 text-white rounded-lg"
      >
        {loading ? "Analyzing..." : "Analyze Resume"}
      </button>

      <div className="mt-6 border rounded-lg p-4 whitespace-pre-wrap">
        {result || "Upload a resume PDF to begin."}
      </div>
    </div>
  );
}