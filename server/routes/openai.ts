import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function generateFutureSelf(career: string, skills: string[]) {
  const prompt = `
Imagine the user in 5 years working as a ${career}.
They currently have skills: ${skills.join(", ") || "none"}.
Write a motivational narrative of their future self, including lifestyle, daily work, and career growth.
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0].message?.content || "";
}
