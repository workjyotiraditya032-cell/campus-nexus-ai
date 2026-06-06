import React, { useState } from "react";

interface InternshipRecommendationProps {
  userId: string;
}

export default function InternshipRecommendation({
  userId,
}: InternshipRecommendationProps) {
  const [recommendations, setRecommendations] = useState("");
  const [loading, setLoading] = useState(false);

  const findRecommendations = async () => {
    alert("User ID = " + userId);
    setLoading(true);

    try {
     console.log("Sending User ID:", userId);
      const response = await fetch(
        "/api/internship/recommend",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          
          body: JSON.stringify({
            userId,
          }),
        }
      );

      const data = await response.json();

      setRecommendations(
        data.recommendations || data.error
      );
    } catch (error) {
      setRecommendations(
        "Unable to generate recommendations."
      );
    }

    setLoading(false);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow">
      <h1 className="text-3xl font-bold text-blue-900 mb-4">
        Internship Recommendation Engine
      </h1>

      <button
        onClick={findRecommendations}
        className="bg-blue-900 text-white px-5 py-2 rounded-lg"
      >
        {loading
          ? "Analyzing..."
          : "Find Best Opportunities"}
      </button>

      <div className="mt-6 border rounded-lg p-4 whitespace-pre-wrap">
        {recommendations ||
          "Click the button to get personalized internship recommendations."}
      </div>
    </div>
  );
}