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

/**
 * chatFull — like chat() but returns the FULL assistant message (so tool_calls survive).
 * Pass opts.tools to let the model request a tool; tool_choice defaults to "auto".
 */
export async function chatFull(role, messages, opts = {}) {
  const body = { model: modelOf[role](), messages, temperature: opts.temperature ?? 0.7, max_tokens: opts.maxTokens ?? 512 };
  if (opts.tools) { body.tools = opts.tools; body.tool_choice = opts.tool_choice ?? "auto"; }
  const res = await clients[role].chat.completions.create(body);
  return res.choices?.[0]?.message ?? { content: "" };
}

/**
 * see — describe an image with the vision model (Reed's "eyes"). Runs on the BIG provider/endpoint
 * (the VL model is the same Nemotron family on the same Nebius host). Returns a short description.
 */
export async function see(imageDataUrl, instruction, opts = {}) {
  const res = await clients.big.chat.completions.create({
    model: process.env.VISION_MODEL || "nvidia/Nemotron-3.5-Super-VL",
    messages: [{ role: "user", content: [
      { type: "text", text: instruction },
      { type: "image_url", image_url: { url: imageDataUrl } },
    ] }],
    temperature: opts.temperature ?? 0.4,
    // The VL model REASONS before answering; a tight cap truncates .content to "". 1500 gives it room.
    max_tokens: opts.maxTokens ?? 1500,
  });
  return res.choices?.[0]?.message?.content?.trim() ?? "";
}

export const provider = () => process.env.MODEL_PROVIDER || "ollama";
