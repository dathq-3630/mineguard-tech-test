import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function generateSummaryAndKeyPoints(
  text: string
): Promise<{ summary: string; keyPoints: string[] }> {
  const prompt = `You are a compliance assistant. Summarize the following document in simple English (120-200 words) and extract 5-8 bullet key points focused on compliance requirements, mandatory PPE, roles/responsibilities, and critical steps. Respond strictly in JSON with keys summary and keyPoints (array of strings). Document:\n\n${text.slice(
    0,
    12000
  )}`;
  const resp = await anthropic.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 1024,
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
  });
  const first = resp.content?.[0];
  const content = (first && first.type === "text" ? first.text : "") || "{}";
  try {
    const json = JSON.parse(content);
    return {
      summary: String(json.summary ?? ""),
      keyPoints: Array.isArray(json.keyPoints)
        ? json.keyPoints.map(String)
        : [],
    };
  } catch {
    return { summary: content.trim(), keyPoints: [] };
  }
}

export async function answerQuestion(
  text: string,
  question: string
): Promise<string> {
  const prompt = `Answer the user question using ONLY the provided document. If not present, say you can't find it. Be specific and cite short quotes when possible.\n\nDocument:\n${text.slice(
    0,
    12000
  )}\n\nQuestion: ${question}`;
  const resp2 = await anthropic.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 512,
    temperature: 0.1,
    messages: [{ role: "user", content: prompt }],
  });
  const first2 = resp2.content?.[0];
  return (first2 && first2.type === "text" ? first2.text : "").trim();
}
