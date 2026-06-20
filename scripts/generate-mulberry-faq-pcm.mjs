import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const audioDir = path.join(root, "public", "audio");
const envPath = path.join(root, ".env.local");

function loadEnv() {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const FAQ_ITEMS = [
  { id: "script-missing", text: "I don't have the answer to this question from my support script, so I cannot help you with that." },
  { id: "greeting", text: "Hi! I'm Priya, your NovaCare support agent. I can help with plan prices, coverage, claims, reimbursement, and network hospitals. What would you like to check?" },
  { id: "plans", text: "For NovaCare, Basic is four hundred ninety nine rupees per month for one adult. Standard is eight hundred ninety nine rupees for two adults and two children. Premium is one thousand four hundred ninety nine rupees for a full family. For most families, Standard is the practical starting point." },
  { id: "plan-basic", text: "NovaCare Basic is four hundred ninety nine rupees per month, with three lakh rupees sum insured for one adult. It includes cashless hospitalization, I C U cover, road ambulance up to two thousand rupees per claim, and one free annual health check." },
  { id: "plan-standard", text: "NovaCare Standard is eight hundred ninety nine rupees per month, with five lakh rupees sum insured for two adults and two children. It includes cashless hospitalization, O P D cover up to ten thousand rupees per year, maternity add-on eligibility, and free tele-consultations." },
  { id: "plan-premium", text: "NovaCare Premium is one thousand four hundred ninety nine rupees per month, with ten lakh rupees sum insured for a full family. It includes O P D cover up to twenty five thousand rupees per year, a critical illness rider, international emergency support, and private-room eligibility." },
  { id: "coverage", text: "Basic covers three lakh rupees, Standard covers five lakh rupees, and Premium covers ten lakh rupees. Hospitalization, I C U, ambulance, and annual health check are included across all plans." },
  { id: "claims", text: "For a cashless claim, go to a network hospital and show your NovaCare e-card. The hospital sends pre-auth to NovaCare, and the normal target time is thirty minutes. Keep your policy ID, e-card, government ID, diagnosis note, and admission request ready." },
  { id: "network-hospitals", text: "NovaCare has over ten thousand cashless network hospitals across India, including Apollo, Fortis, Max, Manipal, Narayana Health, Medanta, and Aster partner hospitals." },
  { id: "relocation", text: "Yes, your NovaCare policy stays active across India. Before treatment in a new city, check the NovaCare app for cashless network hospitals there." },
  { id: "reimbursement", text: "For reimbursement, pay the hospital, then upload bills, the discharge summary, prescriptions, and bank details in the NovaCare app. Approved claims are usually paid within seven working days." },
  { id: "waiting", text: "All plans have a thirty day general waiting period. Pre-existing conditions are covered after two years of continuous NovaCare coverage. Maternity cover is available on Standard and Premium with a two year waiting period." },
  { id: "support", text: "For emergency admission, call one eight zero zero, six six eight, two two seven three. You can also use app chat or email support at support at novacare dot in." },
  { id: "add-dependents", text: "You can add a family member in the NovaCare app. Open My Policy, choose Add Dependents, and follow the steps. For parent or spouse additions, the app will show any underwriting or premium change before confirmation." },
  { id: "renewals", text: "Auto-renew is on by default. NovaCare sends an S M S and app notification thirty days before renewal. You can review or change renewal settings in the NovaCare app." },
  { id: "exclusions", text: "Cosmetic treatment, non-prescribed supplements, self-inflicted injury, and unapproved experimental treatment are not covered." },
  { id: "account-specific", text: "For account-specific claim status, share your policy ID or claim ID. A specialist can verify the exact account data and follow up with you." },
  { id: "out-of-scope", text: "I don't have that information in this support script. I can help with NovaCare plans, claims, coverage, support, or network hospitals." },
  { id: "about", text: "NovaCare is a health insurance provider in India offering Basic, Standard, and Premium family plans with cashless hospitalization, reimbursement, and twenty four seven support." },
];

const SILK_ENDPOINT = process.env.SILK_TTS_URL?.trim() || "https://silk-api.rumik.ai/v1/tts";
const SAMPLE_RATE = 24000;

function parseWav(buffer) {
  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let data = null;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkSize;
    if (chunkEnd > buffer.length) break;
    if (chunkId === "fmt ") {
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    }
    if (chunkId === "data") data = buffer.subarray(chunkStart, chunkEnd);
    offset = chunkEnd + (chunkSize % 2);
  }
  if (!data || sampleRate !== SAMPLE_RATE || channels !== 1 || bitsPerSample !== 16) {
    throw new Error(`Unexpected WAV format: ${sampleRate}Hz ${channels}ch ${bitsPerSample}bit`);
  }
  return data;
}

async function synthesize(apiKey, text) {
  const payload = {
    model: "mulberry",
    text,
    description: "Priya, a warm and professional Indian female customer support agent.",
    speaker: "priya",
    f0_up_key: 0,
    temperature: 0.6,
    top_p: 0.95,
    repetition_penalty: 1.2,
  };
  const res = await fetch(SILK_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`SILK ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  loadEnv();
  const apiKey = process.env.SILK_API_KEY?.trim();
  if (!apiKey) {
    console.error("SILK_API_KEY missing in .env.local");
    process.exit(1);
  }
  fs.mkdirSync(audioDir, { recursive: true });

  let generated = 0;
  let skipped = 0;
  for (const item of FAQ_ITEMS) {
    const outPath = path.join(audioDir, `mulberry-${item.id}-24k.pcm`);
    if (fs.existsSync(outPath)) {
      skipped++;
      console.log(`skip ${item.id}`);
      continue;
    }
    console.log(`synth ${item.id}...`);
    const wav = await synthesize(apiKey, item.text);
    const pcm = parseWav(wav);
    fs.writeFileSync(outPath, pcm);
    generated++;
  }
  console.log(`done generated=${generated} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});