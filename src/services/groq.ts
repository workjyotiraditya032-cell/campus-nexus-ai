import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function askGroq(prompt: string) {
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `
You are Campus Nexus AI.

You help students with:
- Career guidance
- Internships
- Resume building
- Placement preparation
- Project ideas
- Learning roadmaps

Keep answers practical and student-friendly.
`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || "No response.";
}