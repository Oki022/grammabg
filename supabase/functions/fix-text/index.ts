import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import JSZip from "https://esm.sh/jszip"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TEMPERATURE = 0.3;
type ToneKey = "standard" | "formal" | "friendly" | "academic";

const TONE_PROFILES: Record<ToneKey, string> = {
  standard: `
TONE — STANDARD (Default Modern Bulgarian):
- Write like an educated Bulgarian adult in 2026 writing a clear email or news article.
- Use contemporary vocabulary from quality Bulgarian journalism (Дневник, Капитал).
- Mix of short and longer sentences. No stylistic extremes.
- No slang, no emojis, no archaic words. Professional but human — not robotic.`,

  formal: `
TONE — FORMAL (Modern Professional Bulgarian):
- Write like a senior Bulgarian manager, lawyer, or government official writing in 2026.
- Use elevated but natural vocabulary: "поради", "вследствие на", "предвид", "в тази връзка", "с оглед на".
- Sentences are longer and more structured than everyday speech. Subordinate clauses are natural here.
- Replace casual words with formal equivalents: "много" → "значителен", "дойде" → "се яви", "легнахме" → "се оттеглихме за почивка", "прибрах се" → "върнах се у дома".
- FORBIDDEN: archaic passive ("бе предприето", "бива извършвано"), slang, emojis, contractions.`,

  friendly: `
TONE — FRIENDLY (Warm, Conversational Bulgarian):
- Write like a close Bulgarian friend who is also knowledgeable — casual but not childish.
- Use "ти" form throughout. Mix short punchy sentences with natural connectors: "ама", "пък", "все пак".
- Replace formal words: "върнах се" → "прибрах се", "изтощен" → "уморен", "консумирахме" → "хапнахме".
- Sentence rhythm should feel spoken. Vary length — short sentences for emphasis.
- FORBIDDEN: emojis, teen slang ("яко", "кефя се", "мега"), excessive exclamation marks (max 1 total).`,

  academic: `
TONE — ACADEMIC (Contemporary Scholarly Bulgarian):
- Write like a Bulgarian researcher publishing in a peer-reviewed journal in 2026.
- Use precise, domain-appropriate terminology. Introduce terms before using them.
- No sentence over 50 words. Formal but readable — a PhD student should find it natural.
- FORBIDDEN: invented archaisms, bureaucratic filler, emojis, casual slang.
- Hedging is appropriate: "предполага се", "данните сочат", "може да се твърди".`,
};

function buildSystemPrompt(tone: ToneKey): string {
  return `You are an expert Bulgarian language editor. You receive paragraphs of Bulgarian text and must correct them.

WHAT TO FIX:
1. Spelling errors
2. Words accidentally split across runs
3. Missing spaces between words
4. Punctuation errors
5. Grammar and natural phrasing

WHAT NOT TO CHANGE:
- Proper nouns (person names, city names, institution names, abbreviations)
- Numbers, dates, reference codes
- Legal/official terminology that is intentionally formal

${TONE_PROFILES[tone]}

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no explanation:
{
  "paragraphs": [
    {"corrected": "the fixed paragraph text", "changed": true},
    {"corrected": "unchanged paragraph", "changed": false}
  ],
  "corrections": [
    {"original": "wrong text", "corrected": "fixed text", "reason": "explanation in English"}
  ]
}`;
}

function buildPlainTextPrompt(tone: ToneKey): string {
  return `You are an expert Bulgarian language specialist. Your task has TWO steps:

STEP 1 — TRANSLATE/CORRECT:
- If input is in another language, translate ALL of it into Bulgarian. 100% — no skipping.
- If input is already Bulgarian, fix all spelling, grammar, punctuation, and spacing errors.

STEP 2 — APPLY TONE (MANDATORY):
${TONE_PROFILES[tone]}

RULES:
- Do NOT change proper nouns, person names, city names, numbers, dates, reference codes.
- Process 100% of the input — no skipping sentences.

Return ONLY valid JSON:
{
  "finalText": "the complete rewritten Bulgarian text — PRESERVE all line breaks with \\n",
  "corrections": [
    {"original": "wrong part", "corrected": "fixed part", "reason": "explanation in English"}
  ]
}

For corrections: ONLY log Bulgarian spelling/grammar errors. If translated from another language — return [].`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function unescapeXml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

interface NodeInfo {
  full: string; open: string; rawText: string; text: string; close: string;
  paraIndex: number; nodeIndex: number;
}

async function translateDocx(docXml: string, tone: ToneKey, apiKey: string): Promise<{ updatedXml: string; corrections: unknown[] }> {
  const allNodes: NodeInfo[] = [];
  const PARA_REGEX = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  let paraIdx = 0;
  let nodeGlobalIdx = 0;
  const paragraphs: { paraText: string; nodes: NodeInfo[] }[] = [];

  let pMatch: RegExpExecArray | null;
  while ((pMatch = PARA_REGEX.exec(docXml)) !== null) {
    const paraXml = pMatch[0];
    const paraNodes: NodeInfo[] = [];
    const localRegex = /(<w:t(?:[^>]*)>)([^<]*?)(<\/w:t>)/g;
    let nMatch: RegExpExecArray | null;
    while ((nMatch = localRegex.exec(paraXml)) !== null) {
      const info: NodeInfo = {
        full: nMatch[0], open: nMatch[1], rawText: nMatch[2],
        text: unescapeXml(nMatch[2]), close: nMatch[3],
        paraIndex: paraIdx, nodeIndex: nodeGlobalIdx++,
      };
      paraNodes.push(info);
      allNodes.push(info);
    }
    const paraText = paraNodes.map(n => n.text).join("");
    paragraphs.push({ paraText, nodes: paraNodes });
    paraIdx++;
  }

  const CHUNK_SIZE = 30;
  const correctedParas: { corrected: string; changed: boolean }[] = [];
  const corrections: unknown[] = [];

  for (let i = 0; i < paragraphs.length; i += CHUNK_SIZE) {
    const chunk = paragraphs.slice(i, i + CHUNK_SIZE);
    const payload = chunk.map((p, idx) => ({ index: i + idx, text: p.paraText }));

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o', temperature: TEMPERATURE,
        response_format: { type: "json_object" },
        messages: [
          { role: 'system', content: buildSystemPrompt(tone) },
          { role: 'user', content: `Correct these paragraphs:\n${JSON.stringify(payload)}` },
        ],
      }),
    });

    if (!res.ok) throw new Error(`OpenAI error: ${res.status} — ${await res.text()}`);
    const aiData = await res.json();
    const raw = aiData.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    correctedParas.push(...(parsed.paragraphs ?? []));
    corrections.push(...(parsed.corrections ?? []).filter(
      (c: any) => typeof c.original === 'string' && !c.original.includes('<w:') && !c.corrected?.includes('<w:')
    ));
  }

  const nodeReplacements = new Map<number, string>();
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const corrected = correctedParas[i]?.corrected ?? para.paraText;
    const nodes = para.nodes;
    if (nodes.length === 0) continue;
    if (nodes.length === 1) { nodeReplacements.set(nodes[0].nodeIndex, corrected); continue; }
    const origTotal = para.paraText.length;
    if (origTotal === 0) { nodeReplacements.set(nodes[nodes.length - 1].nodeIndex, corrected); continue; }
    let cursor = 0;
    const corrLen = corrected.length;
    for (let k = 0; k < nodes.length; k++) {
      const isLast = k === nodes.length - 1;
      if (isLast) {
        nodeReplacements.set(nodes[k].nodeIndex, corrected.slice(cursor));
      } else {
        const proportion = nodes[k].text.length / origTotal;
        let target = cursor + Math.round(proportion * corrLen);
        target = Math.max(cursor, Math.min(target, corrLen));
        const win = 10;
        let snap = target;
        for (let d = 1; d <= win; d++) {
          if (target + d <= corrLen && /\s/.test(corrected[target + d - 1] ?? "")) { snap = target + d; break; }
          if (target - d > cursor && /\s/.test(corrected[target - d - 1] ?? "")) { snap = target - d; break; }
        }
        nodeReplacements.set(nodes[k].nodeIndex, corrected.slice(cursor, snap));
        cursor = snap;
      }
    }
  }

  const MARKER = "__GM_";
  let workXml = docXml;
  for (const node of allNodes) workXml = workXml.replace(node.full, `${MARKER}${node.nodeIndex}__`);
  for (const node of allNodes) {
    const marker = `${MARKER}${node.nodeIndex}__`;
    const newText = nodeReplacements.has(node.nodeIndex) ? nodeReplacements.get(node.nodeIndex)! : node.text;
    const newOpen = node.open.includes('xml:space') ? node.open : node.open.replace('<w:t', '<w:t xml:space="preserve"');
    workXml = workXml.replace(marker, `${newOpen}${escapeXml(newText)}${node.close}`);
  }
  return { updatedXml: workXml, corrections };
}

function extractPreviewText(xml: string): string {
  const paraRegex = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  const lines: string[] = [];
  let pm: RegExpExecArray | null;
  while ((pm = paraRegex.exec(xml)) !== null) {
    let line = "";
    const runRegex = /(<w:t(?:[^>]*)>)([^<]*?)(<\/w:t>)/g;
    let rm: RegExpExecArray | null;
    while ((rm = runRegex.exec(pm[0])) !== null) line += unescapeXml(rm[2]);
    if (line.trim()) lines.push(line);
  }
  return lines.join("\n");
}

async function translateText(inputText: string, tone: ToneKey, apiKey: string): Promise<{ finalText: string; corrections: unknown[] }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o', temperature: TEMPERATURE,
      response_format: { type: "json_object" },
      messages: [
        { role: 'system', content: buildPlainTextPrompt(tone) },
        { role: 'user', content: `Process 100% of this text:\n\nINPUT:\n---\n${inputText}\n---` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} — ${await res.text()}`);
  const aiData = await res.json();
  const raw = aiData.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  if (typeof parsed.finalText !== "string") throw new Error('Missing finalText');
  return { finalText: parsed.finalText, corrections: parsed.corrections ?? [] };
}

// ── ANA HANDLER ──────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

    // ── Supabase Admin Client ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!
    );

    // ── Kullanıcıyı JWT'den al ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const isPro = user.user_metadata?.plan === 'pro';
    const { text, tone, fileBase64, fileName, isFile } = await req.json();

    // ── İşlem tipini belirle ──
    let usageType: 'text' | 'word' | 'pdf';
    if (isFile && fileName?.toLowerCase().endsWith('.docx')) {
      usageType = 'word';
    } else if (isFile && fileName?.toLowerCase().endsWith('.pdf')) {
      usageType = 'pdf';
    } else {
      usageType = 'text';
    }

    // ── BACKEND LİMİT KONTROLÜ (Atomic - Race condition yok) ──
    const { data: limitData, error: limitError } = await supabaseAdmin
      .rpc('check_and_increment_usage', {
        p_user_id: user.id,
        p_type: usageType,
        p_is_pro: isPro,
      });

    if (limitError) throw new Error('Limit check failed: ' + limitError.message);

    if (!limitData.allowed) {
      const messages: Record<string, string> = {
        daily_text_limit:  'Daily text limit reached. Resets tomorrow.',
        daily_word_limit:  'Daily Word file limit reached. Resets tomorrow.',
        monthly_word_limit:'Monthly Word file limit reached (50/month).',
        pdf_pro_only:      'PDF processing is a Pro feature.',
        pdf_limit_buy_more:'Monthly PDF limit reached. Purchase extra credits to continue.',
      };
      return new Response(
        JSON.stringify({ error: messages[limitData.reason] ?? 'Limit reached.', limitReason: limitData.reason }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // ── DOCX İŞLEME ──
    const toneKey = (String(tone || "standard").toLowerCase().trim()) as ToneKey;
    const validTones: ToneKey[] = ["standard", "formal", "friendly", "academic"];
    const resolvedTone: ToneKey = validTones.includes(toneKey) ? toneKey : "standard";

    if (fileBase64 && fileName?.toLowerCase().endsWith('.docx')) {
      const zip = new JSZip();
      const binaryData = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
      const content = await zip.loadAsync(binaryData);
      const docXmlFile = content.file("word/document.xml");
      if (!docXmlFile) throw new Error('word/document.xml not found');
      const docXml = await docXmlFile.async("string");
      const { updatedXml, corrections } = await translateDocx(docXml, resolvedTone, OPENAI_API_KEY);
      zip.file("word/document.xml", updatedXml);
      const newZipBase64 = await zip.generateAsync({ type: "base64" });
      const previewText = extractPreviewText(updatedXml);

      return new Response(JSON.stringify({
        result: previewText,
        fileResult: newZipBase64,
        fileName: `Corrected_${fileName}`,
        corrections,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── DÜZ METİN İŞLEME ──
    const inputText = text || "";
    if (!inputText.trim()) throw new Error('No text provided');
    const { finalText, corrections } = await translateText(inputText, resolvedTone, OPENAI_API_KEY);

    return new Response(
      JSON.stringify({ result: finalText, corrections }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
