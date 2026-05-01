import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import JSZip from "https://esm.sh/jszip"

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
- FORBIDDEN: archaic passive ("бе предприето", "бива извършвано"), slang, emojis, contractions.
- Example: "Вчера се прибрах вкъщи, имах много работа" → "Вчера се върнах у дома поради значителна служебна натовареност."`,

  friendly: `
TONE — FRIENDLY (Warm, Conversational Bulgarian):
- Write like a close Bulgarian friend who is also knowledgeable — casual but not childish.
- Use "ти" form throughout. Mix short punchy sentences with natural connectors: "ама", "пък", "все пак".
- Replace formal words: "върнах се" → "прибрах се", "изтощен" → "уморен", "консумирахме" → "хапнахме".
- Sentence rhythm should feel spoken. Vary length — short sentences for emphasis.
- FORBIDDEN: emojis, teen slang ("яко", "кефя се", "мега"), excessive exclamation marks (max 1 total).
- Example: "Вчера се прибрах по-рано — работата беше много. Приятелят ми не дойде, ама беше изморен. Хапнахме пица и после си легнахме."`,

  academic: `
TONE — ACADEMIC (Contemporary Scholarly Bulgarian):
- Write like a Bulgarian researcher publishing in a peer-reviewed journal in 2026.
- Use precise, domain-appropriate terminology. Introduce terms before using them.
- No sentence over 50 words. Formal but readable — a PhD student should find it natural.
- FORBIDDEN: invented archaisms, bureaucratic filler, emojis, casual slang.
- Hedging is appropriate: "предполага се", "данните сочат", "може да се твърди".
- Example rewrite: "Много важно е" → "От съществено значение е"`,
};

function buildSystemPrompt(tone: ToneKey): string {
  return `You are an expert Bulgarian language editor. You receive paragraphs of Bulgarian text and must correct them.

WHAT TO FIX:
1. Spelling errors — e.g. "Внесеноо" → "Внесено", "уведомелние" → "уведомление"
2. Words accidentally split across runs — e.g. "вне" + "сено" is one word "внесено", treat them as one
3. Missing spaces between words
4. Punctuation errors
5. Grammar and natural phrasing

WHAT NOT TO CHANGE:
- Proper nouns (person names, city names, institution names, abbreviations like "ИП", "РИОСВ", "УИН")
- Numbers, dates, reference codes
- Legal/official terminology that is intentionally formal
- Do NOT add spaces inside abbreviations like "/ИП/:" or "чл.10"

${TONE_PROFILES[tone]}

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no explanation:
{
  "paragraphs": [
    {"corrected": "the fixed paragraph text", "changed": true},
    {"corrected": "unchanged paragraph", "changed": false}
  ],
  "corrections": [
    {
      "original": "wrong text (plain text only, NO XML)",
      "corrected": "fixed text",
      "reason": "кратко обяснение на български"
    }
  ]
}

For corrections array — STRICT:
- If input was in another language and you translated it — return empty array [].
- ONLY log Bulgarian spelling, grammar or punctuation errors found in the original Bulgarian text.
- NEVER log translations, rephrasing, or tone changes as corrections.
- NEVER include XML tags.
- If no real errors found — return [].
- The "original" field must contain ONLY the specific wrong word or short phrase — NOT the entire sentence.
- The "corrected" field must contain ONLY the fixed word or short phrase.
- Example: {"original": "Внесеноо", "corrected": "Внесено", "reason": "правописна грешка"}
- Example: {"original": "госпожо димитрова", "corrected": "госпожо Димитрова,", "reason": "главна буква и запетая"}`;
}

function buildPlainTextPrompt(tone: ToneKey): string {
  const toneExamples: Record<ToneKey, string> = {
    standard: "Output example style: 'Вчера се прибрах вкъщи, защото имах много работа. Приятелят ми не дойде с мен — беше уморен.'",
    formal: "Output example style: 'Вчера се върнах у дома поради значителна натовареност. Моят колега не се присъедини, тъй като изпитваше умора.'",
    friendly: "Output example style: 'Вчера се прибрах по-рано, ама работата беше много. Приятелят ми не дойде — беше изморен, разбира се. Хапнахме пица и си легнахме.'",
    academic: "Output example style: 'На предходния ден субектът се е върнал в дома си поради значителен обем служебни ангажименти. Придружаващото лице не е взело участие в последващите дейности вследствие на физическо изтощение.'",
  };

  return `You are an expert Bulgarian language specialist. Your task has TWO steps — you must do BOTH:

STEP 1 — TRANSLATE/CORRECT:
- If input is in another language (German, English, etc.), translate ALL of it into Bulgarian. 100% — no skipping.
- If input is already Bulgarian, fix all spelling, grammar, punctuation, and spacing errors.

STEP 2 — APPLY TONE (THIS IS MANDATORY, NOT OPTIONAL):
After translating/correcting, you MUST rewrite the Bulgarian text in this specific tone:

${TONE_PROFILES[tone]}

TONE EXAMPLE — your output should sound like this:
${toneExamples[tone]}

The difference between tones must be clearly audible. A FRIENDLY text sounds like a friend talking. A FORMAL text sounds like an official letter. An ACADEMIC text sounds like a research paper. Do NOT produce the same neutral text regardless of tone.

RULES:
- Do NOT change proper nouns, person names, city names, numbers, dates, reference codes.
- Process 100% of the input — no skipping sentences.

Return ONLY valid JSON, no markdown, no explanation:
{
  "finalText": "the complete rewritten Bulgarian text in the correct tone — PRESERVE all line breaks from the original. Each section, bullet point, and paragraph must be on its own line, separated by \\n",
  "corrections": [
    {"original": "wrong part", "corrected": "fixed part", "reason": "обяснение на български"}
  ]
}

For corrections array — STRICT:
- If input was in another language and you translated it — return empty array [].
- ONLY log Bulgarian spelling, grammar or punctuation errors found in the original Bulgarian text.
- NEVER log translations, rephrasing, or tone changes as corrections.
- NEVER include XML tags.
- If no real errors found — return [].
- The "original" field must contain ONLY the specific wrong word or short phrase — NOT the entire sentence.
- The "corrected" field must contain ONLY the fixed word or short phrase.
- Example: {"original": "Внесеноо", "corrected": "Внесено", "reason": "правописна грешка"}
- Example: {"original": "госпожо димитрова", "corrected": "госпожо Димитрова,", "reason": "главна буква и запетая"}`;
}

// XML helpers
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function unescapeXml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

interface NodeInfo {
  full: string;
  open: string;
  rawText: string;
  text: string;
  close: string;
  paraIndex: number;
  nodeIndex: number;
}

async function translateDocx(
  docXml: string,
  tone: ToneKey,
  apiKey: string
): Promise<{ updatedXml: string; corrections: unknown[] }> {

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
        full: nMatch[0],
        open: nMatch[1],
        rawText: nMatch[2],
        text: unescapeXml(nMatch[2]),
        close: nMatch[3],
        paraIndex: paraIdx,
        nodeIndex: nodeGlobalIdx++,
      };
      paraNodes.push(info);
      allNodes.push(info);
    }

    const paraText = paraNodes.map(n => n.text).join("");
    if (paraText.trim()) {
      paragraphs.push({ paraText, nodes: paraNodes });
    }
    paraIdx++;
  }

  if (paragraphs.length === 0) {
    return { updatedXml: docXml, corrections: [] };
  }

  // CHUNKING: 20 paragraflık paketler halinde gönder — timeout ve token limitini önler
  const CHUNK_SIZE = 20;
  const correctedParas: { corrected: string }[] = [];
  const corrections: unknown[] = [];

  for (let chunkStart = 0; chunkStart < paragraphs.length; chunkStart += CHUNK_SIZE) {
    const chunk = paragraphs.slice(chunkStart, chunkStart + CHUNK_SIZE);
    const numberedParas = chunk.map((p, i) => `[${i}] ${p.paraText}`).join("\n");

    const userMessage = `Correct the following ${chunk.length} Bulgarian paragraphs from a Word document.
Each paragraph may contain words split across multiple runs — treat joined text as one word.
Return EXACTLY ${chunk.length} items in the "paragraphs" array, same order.

Paragraphs:
---
${numberedParas}
---`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: TEMPERATURE,
        response_format: { type: "json_object" },
        messages: [
          { role: 'system', content: buildSystemPrompt(tone) },
          { role: 'user', content: userMessage },
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

  // Redistribute corrected paragraph text back into original nodes proportionally
  const nodeReplacements = new Map<number, string>();

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const corrected = correctedParas[i]?.corrected ?? para.paraText;
    const nodes = para.nodes;

    if (nodes.length === 0) continue;
    if (nodes.length === 1) {
      nodeReplacements.set(nodes[0].nodeIndex, corrected);
      continue;
    }

    const origTotal = para.paraText.length;
    if (origTotal === 0) {
      nodeReplacements.set(nodes[nodes.length - 1].nodeIndex, corrected);
      continue;
    }

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

  // MARKER-BASED XML replacement — safe, no index drift
  const MARKER = "__GM_";
  let workXml = docXml;

  for (const node of allNodes) {
    workXml = workXml.replace(node.full, `${MARKER}${node.nodeIndex}__`);
  }

  for (const node of allNodes) {
    const marker = `${MARKER}${node.nodeIndex}__`;
    const newText = nodeReplacements.has(node.nodeIndex)
      ? nodeReplacements.get(node.nodeIndex)!
      : node.text;
    const escapedText = escapeXml(newText);
    const newOpen = node.open.includes('xml:space')
      ? node.open
      : node.open.replace('<w:t', '<w:t xml:space="preserve"');
    workXml = workXml.replace(marker, `${newOpen}${escapedText}${node.close}`);
  }

  return { updatedXml: workXml, corrections };
}

// Extract clean preview text
function extractPreviewText(xml: string): string {
  const paraRegex = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  const lines: string[] = [];
  let pm: RegExpExecArray | null;
  while ((pm = paraRegex.exec(xml)) !== null) {
    let line = "";
    const runRegex = /(<w:t(?:[^>]*)>)([^<]*?)(<\/w:t>)/g;
    let rm: RegExpExecArray | null;
    while ((rm = runRegex.exec(pm[0])) !== null) {
      line += unescapeXml(rm[2]);
    }
    if (line.trim()) lines.push(line);
  }
  return lines.join("\n");
}

// Plain text processing
async function translateText(
  inputText: string, tone: ToneKey, apiKey: string
): Promise<{ finalText: string; corrections: unknown[] }> {

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: TEMPERATURE,
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
  if (!Array.isArray(parsed.corrections)) throw new Error('Missing corrections');
  return { finalText: parsed.finalText, corrections: parsed.corrections };
}

// Main handler
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { text, tone, fileBase64, fileName } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

    const toneKey = String(tone || "standard").toLowerCase().trim() as ToneKey;
    const validTones: ToneKey[] = ["standard", "formal", "friendly", "academic"];
    const resolvedTone: ToneKey = validTones.includes(toneKey) ? toneKey : "standard";

    if (fileBase64 && fileName?.toLowerCase().endsWith('.docx')) {
      const zip = new JSZip();
      const binaryData = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
      const content = await zip.loadAsync(binaryData);

      const docXmlPath = "word/document.xml";
      const docXmlFile = content.file(docXmlPath);
      if (!docXmlFile) throw new Error('word/document.xml not found');

      const docXml = await docXmlFile.async("string");
      const { updatedXml, corrections } = await translateDocx(docXml, resolvedTone, OPENAI_API_KEY);

      zip.file(docXmlPath, updatedXml);
      const newZipBase64 = await zip.generateAsync({ type: "base64" });
      const previewText = extractPreviewText(updatedXml);

      return new Response(JSON.stringify({
        result: previewText,
        fileResult: newZipBase64,
        fileName: `Corrected_${fileName}`,
        corrections,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const inputText = text || "";
    if (!inputText.trim()) throw new Error('No text provided');
    const { finalText, corrections } = await translateText(inputText, resolvedTone, OPENAI_API_KEY);

    return new Response(JSON.stringify({ result: finalText, corrections }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});
