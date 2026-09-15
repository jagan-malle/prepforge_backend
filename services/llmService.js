const provider = () =>
  String(process.env.LLM_PROVIDER || "openai").toLowerCase();
const apiKey = () => process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
export const isLLMConfigured = () => provider() !== "mock" && Boolean(apiKey());
export async function generateJSON(
  prompt,
  {
    system = "You are PrepForge, a precise interview coach. Return valid JSON only. Use only supplied context and do not invent candidate experience.",
  } = {},
) {
  if (provider() === "mock" || !apiKey()) return null;
  if (provider() !== "openai")
    throw new Error("Unsupported LLM provider. Use openai or mock.");
  const controller = new AbortController(),
    timeout = setTimeout(
      () => controller.abort(),
      Number(process.env.AI_TIMEOUT_MS) || 20000,
    );
  try {
    const response = await fetch(
      process.env.LLM_API_URL || "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey()}`,
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
          temperature: 0.35,
        }),
      },
    );
    if (!response.ok)
      throw new Error(
        "AI service is temporarily unavailable. Please try again.",
      );
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI service returned an empty response.");
    return JSON.parse(content);
  } catch (error) {
    if (error.name === "AbortError")
      throw new Error("AI service timed out. Please try again.");
    if (error instanceof SyntaxError)
      throw new Error("AI service returned an invalid response.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
