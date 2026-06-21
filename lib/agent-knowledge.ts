import { createServiceClient } from "@/lib/supabase/server";
import { isNovaCareAgentId } from "@/lib/novacare-knowledge";

const CHUNK_SIZE = 900;
const MAX_CHUNKS_STORED = 120;
const MAX_RETRIEVAL_CHARS = 2200;

export function chunkDocumentText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    if (`${buffer}\n\n${para}`.length <= CHUNK_SIZE) {
      buffer = buffer ? `${buffer}\n\n${para}` : para;
      continue;
    }
    if (buffer) chunks.push(buffer);
    if (para.length <= CHUNK_SIZE) {
      buffer = para;
      continue;
    }
    for (let i = 0; i < para.length; i += CHUNK_SIZE) {
      chunks.push(para.slice(i, i + CHUNK_SIZE).trim());
    }
    buffer = "";
  }
  if (buffer) chunks.push(buffer);
  return chunks.slice(0, MAX_CHUNKS_STORED);
}

function tokenEstimate(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function rebuildAgentKnowledgeChunks(args: {
  tenantId: string;
  agentId: string;
  documentId: string;
  content: string;
}) {
  const svc = createServiceClient();
  await svc.from("agent_knowledge_chunks").delete().eq("document_id", args.documentId);

  const chunks = chunkDocumentText(args.content);
  if (!chunks.length) return;

  const rows = chunks.map((content, index) => ({
    id: `chk-${args.documentId}-${index}`,
    tenant_id: args.tenantId,
    agent_id: args.agentId,
    document_id: args.documentId,
    chunk_index: index,
    content,
    token_estimate: tokenEstimate(content),
  }));

  await svc.from("agent_knowledge_chunks").insert(rows);
}

function scoreChunk(query: string, chunk: string): number {
  const q = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const hay = chunk.toLowerCase();
  let score = 0;
  for (const word of q) {
    if (hay.includes(word)) score += 1;
  }
  return score;
}

export async function retrieveAgentKnowledgeContext(
  agentId: string,
  userQuery: string
): Promise<string> {
  if (isNovaCareAgentId(agentId)) return "";

  const svc = createServiceClient();
  const { data: agent } = await svc
    .from("agents")
    .select("knowledge_enabled")
    .eq("id", agentId)
    .maybeSingle();

  if (agent?.knowledge_enabled === false) return "";

  const { data: chunks } = await svc
    .from("agent_knowledge_chunks")
    .select("content")
    .eq("agent_id", agentId)
    .limit(80);

  if (!chunks?.length) return "";

  const ranked = chunks
    .map((c) => ({ content: c.content as string, score: scoreChunk(userQuery, c.content as string) }))
    .sort((a, b) => b.score - a.score);

  const top = ranked.filter((r) => r.score > 0).slice(0, 6);
  const picked = top.length > 0 ? top : ranked.slice(0, 3);

  let out = "";
  for (const row of picked) {
    const block = row.content.trim();
    if (!block) continue;
    if (out.length + block.length > MAX_RETRIEVAL_CHARS) break;
    out += `${out ? "\n\n" : ""}${block}`;
  }

  return out.trim();
}