import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");
const env = fs.readFileSync(envPath, "utf8");
const publicKey = env.match(/VAPI_PUBLIC_KEY=(.+)/)?.[1]?.trim();
if (!publicKey) {
  console.error("Missing VAPI_PUBLIC_KEY");
  process.exit(1);
}

const origin = "https://silk-resolve.vercel.app";
const assistant = {
  name: "Priya",
  model: {
    provider: "custom-llm",
    url: `${origin}/api/voice/vapi-llm?voice=silk-mulberry&fast=1`,
    timeoutSeconds: 6,
    messages: [{ role: "system", content: "You are a helpful voice agent." }],
    model: "gemini-2.5-flash-lite",
    maxTokens: 80,
  },
  voice: {
    provider: "custom-voice",
    server: { url: `${origin}/api/voice/silk-tts?transport=ws&model=mulberry`, timeoutSeconds: 45 },
  },
  transcriber: {
    provider: "deepgram",
    model: "flux-general-en",
    language: "en",
    eotThreshold: 0.5,
    eotTimeoutMs: 500,
  },
  firstMessage: "Hi, how can I help?",
  firstMessageMode: "assistant-speaks-first",
};

const res = await fetch("https://api.vapi.ai/call/web", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${publicKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ assistant }),
});

const text = await res.text();
console.log(res.status, text.slice(0, 800));