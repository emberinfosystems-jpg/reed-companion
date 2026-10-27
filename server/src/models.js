// Model adapter. One OpenAI-compatible client per role (BIG / FAST), configured by env.
// Works unchanged against Ollama (dev) or Nebius Token Factory (submission).
import OpenAI from "openai";
import "dotenv/config";

function client(prefix) {
  return new OpenAI({
    baseURL: process.env[`${prefix}_BASE_URL`],
    apiKey: process.env[`${prefix}_API_KEY`] || "x",
  });
}
const clients = { big: client("BIG"), fast: client("FAST") };
const modelOf = { big: () => process.env.BIG_MODEL, fast: () => process.env.FAST_MODEL };

/**
 * chat(role, messages, opts) -> string
 * role: "big" | "fast". messages: [{role, content}]. opts: {temperature, maxTokens}
 */
export async function chat(role, messages, opts = {}) {
  const res = await clients[role].chat.completions.create({
    model: modelOf[role](),
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 512,
  });
  return res.choices?.[0]?.message?.content?.trim() ?? "";
}

export const provider = () => process.env.MODEL_PROVIDER || "ollama";
