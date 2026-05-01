import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import HistoryDrawer from "@/components/HistoryDrawer";

import { 
  Copy, 
  Rocket, 
  Upload, 
  Wand2, 
  FileText, 
  FileType2,
  CheckCircle2,
  ChevronDown, 
  RotateCcw, 
  Volume2, 
  Square, 
  Download, 
  FileDown, 
  History, 
  Lock, 
  Sparkles 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// BÜTÜN IMPORTLAR BİTTİ. ŞİMDİ AYARLARI YAPIYORUZ:
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const FREE_LIMIT = 5;

// Match each <w:t ...>...</w:t> occurrence (including empty self-closing? we ignore empty)
const W_T_REGEX = /<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
// Paragraph boundary marker we use to keep line-structure for the AI
const PARA_BREAK = "\n";

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const encodeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

interface DocxState {
  zip: JSZip;
  documentXml: string;
  fileName: string;
}

interface RunSlot {
  // Decoded text content of one <w:t>
  text: string;
  // Index into paragraph it belongs to
  paraIndex: number;
}

// Extract <w:t> contents grouped by paragraph (<w:p>...</w:p>)
const extractRuns = (xml: string): { slots: RunSlot[]; plain: string } => {
  const slots: RunSlot[] = [];
  // Split by paragraph boundaries to assign paraIndex
  // Find all <w:p ...>...</w:p> ranges
  const paraRegex = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  let paraMatch: RegExpExecArray | null;
  let paraIndex = 0;
  const paragraphsText: string[] = [];

  while ((paraMatch = paraRegex.exec(xml)) !== null) {
    const paraXml = paraMatch[0];
    let runMatch: RegExpExecArray | null;
    const localRegex = new RegExp(W_T_REGEX.source, "g");
    const parts: string[] = [];
    while ((runMatch = localRegex.exec(paraXml)) !== null) {
      const decoded = decodeXml(runMatch[2]);
      slots.push({ text: decoded, paraIndex });
      parts.push(decoded);
    }
    paragraphsText.push(parts.join(""));
    paraIndex++;
  }

  const plain = paragraphsText.join(PARA_BREAK);
  return { slots, plain };
};

// Given original slots and corrected plain text (paragraphs separated by \n),
// redistribute corrected text back into slots proportionally by original length per paragraph.
const redistribute = (slots: RunSlot[], corrected: string): string[] => {
  const correctedParas = corrected.split(/\r?\n/);
  // Group slot indices by paragraph
  const byPara = new Map<number, number[]>();
  slots.forEach((s, i) => {
    const arr = byPara.get(s.paraIndex) ?? [];
    arr.push(i);
    byPara.set(s.paraIndex, arr);
  });

  const result = slots.map((s) => s.text); // default = original

  for (const [pIdx, indices] of byPara) {
    const correctedPara = correctedParas[pIdx] ?? "";
    const originalLengths = indices.map((i) => slots[i].text.length);
    const totalOriginal = originalLengths.reduce((a, b) => a + b, 0);

    if (indices.length === 1) {
      result[indices[0]] = correctedPara;
      continue;
    }
    if (totalOriginal === 0) {
      // Put everything in last slot
      result[indices[indices.length - 1]] = correctedPara;
      continue;
    }

    // Proportional split, but try to break on whitespace for cleaner cuts
    let cursor = 0;
    const correctedLen = correctedPara.length;
    for (let k = 0; k < indices.length; k++) {
      const isLast = k === indices.length - 1;
      if (isLast) {
        result[indices[k]] = correctedPara.slice(cursor);
      } else {
        const proportion = originalLengths[k] / totalOriginal;
        let target = cursor + Math.round(proportion * correctedLen);
        if (target < cursor) target = cursor;
        if (target > correctedLen) target = correctedLen;
        // Snap to nearest whitespace within +/- 15 chars for cleaner break
        const window = 15;
        let snap = target;
        for (let d = 0; d <= window; d++) {
          if (target + d <= correctedLen && /\s/.test(correctedPara[target + d - 1] ?? "")) {
            snap = target + d;
            break;
          }
          if (target - d > cursor && /\s/.test(correctedPara[target - d - 1] ?? "")) {
            snap = target - d;
            break;
          }
        }
        result[indices[k]] = correctedPara.slice(cursor, snap);
        cursor = snap;
      }
    }
  }
  return result;
};

// Replace <w:t> contents in the original XML with new texts (in order).
const replaceRuns = (xml: string, newTexts: string[]): string => {
  let i = 0;
  return xml.replace(W_T_REGEX, (_match, attrs: string | undefined) => {
    const txt = newTexts[i++] ?? "";
    // Always preserve whitespace to avoid Word collapsing spaces
    const attrStr = attrs && /xml:space=/.test(attrs) ? attrs : `${attrs ?? ""} xml:space="preserve"`;
    return `<w:t${attrStr}>${encodeXml(txt)}</w:t>`;
  });
};

type Tone = "Standard" | "Formal" | "Friendly" | "Academic";
const TONES: Tone[] = ["Standard", "Formal", "Friendly", "Academic"];

const Editor = () => {
 const { user } = useAuth();
  const navigate = useNavigate();

  // 1. STATE TANIMLARI
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tone, setTone] = useState<Tone>("Standard");
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  // 1 Kere bedava Word hakkı kullanıldı mı? Tarayıcı hafızasından kontrol et
  const [freeWordUsed, setFreeWordUsed] = useState(() => localStorage.getItem("freeWordUsed") === "true");
  const [wordModalOpen, setWordModalOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [docx, setDocx] = useState<any>(null);
  const [originalSlots, setOriginalSlots] = useState([]);
  const [correctedXml, setCorrectedXml] = useState(null);
  const [correctedFileBase64, setCorrectedFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
const [corrections, setCorrections] = useState<any[]>([]);

  const FREE_LIMIT = 5;
  const isPro = true; // Şimdilik uygulamanın senin Free planda olduğunu anlaması için bunu false yapıp kaydet (CTRL+S).

  // 2. REFERANSLAR
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // 3. HESAPLAMALAR
  const limitReached = !!user && count >= FREE_LIMIT;
  const remaining = Math.max(0, FREE_LIMIT - count);
  const hasInput = !!inputText.trim();
  const canDownload = !!docx || !!correctedXml;

  const buttonLabel = isChecking ? "Checking..." : !user ? "Fix My Text" : limitReached ? "Upgrade to Pro" : loading ? "Fixing..." : `Fix Text (${remaining}/${FREE_LIMIT})`;

  // 4. ANA MOTOR (handleFix) - Krediyi de düşürür
  // 4. ANA MOTOR (SUPABASE EDGE FUNCTION İLE GÜVENLİ BAĞLANTI)
  // 4. ANA MOTOR (SUPABASE EDGE FUNCTION İLE GÜVENLİ BAĞLANTI)
 // 4. ANA MOTOR (PREMIUM XML MİMARİSİ)
// --- ANA MOTOR (PREMIUM CIMBIZ MİMARİSİ + DEDEKTİF) ---
// --- 1. CIMBIZ YARDIMCI FONKSİYONLARI (İşte eksik olanlar bunlar!) ---
 // --- 1. PRO PARAGRAF YARDIMCILARI VE ZIRH ---
// --- 1. HİBRİT XML CIMBIZLARI (Hem paragraf hem font korur) ---
  // --- 1. GÜVENLİ KAPSÜL VE ZIRH (Belgeyi Asla Çökertmez) ---
  // --- 1. KUSURSUZ XML CERRAH MİMARİSİ (DOM Parser - Asla Çökmez) ---
  const handleFix = async () => {
    // Yüklenen dosyayı direkt HTML input'un içinden alıyoruz (Hata vermez)
    const currentWordFile = docxInputRef.current?.files?.[0];

    if ((!currentWordFile && !inputText) || loading || limitReached) return;
    setLoading(true);
    
    try {
      // 1. EĞER WORD DOSYASI YÜKLENDİYSE (DeepL Devreye Girer)
      if (currentWordFile) {
        const reader = new FileReader();
        reader.readAsDataURL(currentWordFile);
        reader.onload = async () => {
          try {
            // 1. Dosyayı paketle
            const base64 = (reader.result as string).split(',')[1];

            // 2. Arka plana (Supabase) gönder
            const { data, error } = await supabase.functions.invoke('fix-text', {
              body: { fileBase64: base64, fileName: currentWordFile.name, tone: tone, isFile: true }
            });

            // 3. Hata varsa burada yakala
            if (error) throw error;
            if (data && data.error) throw new Error(data.error);

            // 4. Başarılıysa dosyayı hazırla
            console.log("ARKADAN GELEN PAKET:", data);
            // Mevcut olan satırın altına şunları ekle veya böyle güncelle:
           setCorrectedFileBase64(data.fileResult); // Dosyayı rafa koy
           setCorrections(data.corrections || []);
           setOutputText(
           (data.result || "")
           .replace(/\r\n/g, "\n")
           .replace(/([.!?])\s{2,}/g, "$1\n\n")
           .replace(/([.!?])\s+([А-ЯA-Z])/g, "$1\n$2")
           .trim()
          );
           setFileName(data.fileName);
            toast.success("The Word file has been translated flawlessly, both in terms of colors and structure!");
            setLoading(false);

          } catch (err: any) {
            // 5. BİR BOK OLMAZSA BURASI ÇALIŞIR VE NEDENİNİ SÖYLER
            console.error("TRANSLATION ERROR DETAIL:", err);
            toast.error(err.message || "An error occurred during translation.");
            setLoading(false);
          }
        };
      } 
      // 2. EĞER SADECE KUTUYA YAZI YAZILDIYSA (OpenAI Devreye Girer)
      else {
        const { data, error } = await supabase.functions.invoke('fix-text', {
          body: { text: inputText, tone: tone, isFile: false }
        });
        
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        
      setOutputText(
      (data.result || "")
      .replace(/\r\n/g, "\n")
      .replace(/([.!?])\s{2,}/g, "$1\n\n")
      .replace(/([.!?])\s+([А-ЯA-Z])/g, "$1\n$2")
      .trim()
      );
        setCorrections(data.corrections || []);
        toast.success("Text successfully polished in the selected tone!");
        setLoading(false);
      }
      
      // 3. KREDİ DÜŞÜRME
      if (user) {
        const { data: currentData }: any = await supabase.from('user_credits' as any).select('credits').eq('user_id', user.id).single();
        if (currentData && currentData.credits > 0) {
          const newCredits = currentData.credits - 1;
          await supabase.from('user_credits' as any).update({ credits: newCredits }).eq('user_id', user.id);
          setCount(5 - newCredits);
        }
      }

    } catch (error: any) {
      console.error(error);
      toast.error("Mistake: " + error.message);
      setLoading(false);
    }
  };
  // 5. YARDIMCI FONKSİYONLAR (Temizle, Kopyala, Dinle, Git)
  const handleClear = () => {
    setInputText(""); setOutputText(""); setDocx(null);
    if (docxInputRef.current) docxInputRef.current.value = "";
    toast.success("Cleared");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    toast.success("Copied!");
  };

  const handleListen = () => {
    if (speaking) { 
      window.speechSynthesis.cancel(); 
      setSpeaking(false); 
    } else {
      const utt = new SpeechSynthesisUtterance(outputText);
      utt.lang = "bg-BG"; // Bulgarca
      utt.rate = 0.9;     // Biraz yavaş — daha anlaşılır
      utt.pitch = 1.0;
      utt.volume = 1.0;
      utt.onend = () => setSpeaking(false);
      utt.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utt);
    }
  };

  const goToPricing = () => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });

  const handleExportTxt = () => {
    const element = document.createElement("a");
    element.href = URL.createObjectURL(new Blob([outputText], {type: 'text/plain'}));
    element.download = "fixed_text.txt";
    element.click();
  };

  // 6. DOSYA İŞLEMLERİ (Buton isimleriyle tam uyumlu)
  const handleDocxClick = () => docxInputRef.current?.click();
  const handlePdfClick = () => {
  if (!isPro) {
    setPdfModalOpen(true);
    return;
  }
  pdfInputRef.current?.click();
};
  const handleUploadClick = (e: React.MouseEvent) => {
    if (!isPro && freeWordUsed) {
      e.preventDefault();
      setWordModalOpen(true); // Pro ekranını açar
      return;
    }
    handleDocxClick(); // Sorun yoksa dosyayı seçtirir
  };

const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;

        // 1. Ekran için düz metni alıyoruz
        const res = await mammoth.extractRawText({ arrayBuffer });
        setInputText(res.value);

        // 2. Formatı korumak için JSZip ile Word'ün kalbine (XML) giriyoruz
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(arrayBuffer);
        const xmlContent = await loadedZip.file("word/document.xml")?.async("string");

        if (xmlContent) {
          // Kodun üstündeki motoru çalıştırıp renk/font yuvalarını buluyoruz
          const { slots } = extractRuns(xmlContent);
          setOriginalSlots(slots); // Yuvaları hafızaya al
          setDocx({ zip: loadedZip, documentXml: xmlContent, fileName: file.name.replace(".docx", "") });
        } else {
          setDocx({ fileName: file.name.replace(".docx", "") });
        }

        toast.success("Word file loaded with formatting!");
      } catch (error) {
        console.error("Word read Error:", error);
        toast.error("Error occurred while reading the Word file.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePdfChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const pdf = await pdfjsLib.getDocument({ data: e.target.result }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          let lastY: number | null = null;
          for (const item of content.items as any[]) {
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
              text += "\n";
            }
            text += item.str + " ";
            lastY = item.transform[5];
          }
          text += "\n";
        }
        const meaninglessChars = (text.match(/[<>=@;]/g) || []).length;
        const totalChars = text.replace(/\s/g, "").length;
        const isScanned = totalChars > 0 && meaninglessChars / totalChars > 0.1;
        setInputText(isScanned ? "" : text);
        if (isScanned) {
          toast.error("❌ This PDF is scanned or image-based and cannot be read. Please use a text-based PDF or copy-paste the text manually.", { duration: 6000 });
          return;
        }
        toast.success("PDF loaded!");
        
      } catch (err: any) { 
  console.error("PDF Mistake:", err);
  toast.error("PDF error: " + err?.message); 
      } 
      finally { setUploading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  // KÖPRÜLER
  const setHistoryModalOpen = setHistoryDrawerOpen;
  const historyModalOpen = historyDrawerOpen;


  useEffect(() => {
    if (user) {
      const fetchCredits = async () => {
        const { data }: any = await supabase.from('user_credits' as any).select('credits').eq('user_id', user.id).single();
        if (data) setCount(5 - data.credits);
        setIsChecking(false);
      };
      fetchCredits();
    } else { setIsChecking(false); }
  }, [user]);
const handleDownloadWord = async () => {
  // Kontrolü en standart isimle yapıyoruz
  if (!correctedFileBase64) {
    toast.error("Document is not ready yet. Please click 'Fix' first.");
    return;
  }

  try {
    const byteCharacters = atob(correctedFileBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    
    // Değişken ismini en temiz haliyle kullanıyoruz
    link.download = fileName || "corrected_document.docx";
    link.click();
    
    toast.success("Download started...");
    if (!isPro) {
      localStorage.setItem("freeWordUsed", "true");
      setFreeWordUsed(true);
    }
  } catch (err) {
    console.error("Download error:", err);
    toast.error("An error occurred during the download..");
  }
};
const handleDownloadPdf = async () => {
  if (!outputText) {
    toast.error("No corrected text to download.");
    return;
  }

  try {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups.");
      return;
    }

    const pdfName = fileName
      ? `Corrected_${fileName.replace(/\.[^.]+$/, "")}`
      : "corrected_document";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${pdfName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.6;
              margin: 40px;
              color: #000;
            }
            p { margin: 0 0 6px 0; }
            word-spacing: 2px;
          }    
          </style>
        </head>
        <body>
          ${outputText.split("\n").map(line => 
            line.trim() ? `<p>${line.trim()}</p>` : `<br/>`
          ).join("\n")}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success("PDF ready — use 'Save as PDF' in the print dialog.");
  } catch (err) {
    console.error("PDF error:", err);
    toast.error("An error occurred during PDF download.");
  }
};

  return (
    <section id="editor" className="container py-16 md:py-24">
      <div className="text-center mb-10">
        <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-3">
          The Editor
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Paste text in ANY language or upload your documents. Watch our AI instantly translate and polish it into flawless Bulgarian, perfectly adapted to your chosen tone.
        </p>
      </div>

      <div className="relative mx-auto max-w-4xl rounded-2xl border border-border bg-gradient-card p-4 md:p-6 shadow-card-premium backdrop-blur">
        {/* TOP ROW: History (left) + Tone (right) */}
        <div className="mb-5 flex items-center justify-between gap-3">
          {/* HISTORY (premium feature, locked on Free) */}
          <button
            type="button"
            onClick={() => {
              if (isPro) {
                setHistoryDrawerOpen(true);
                return;
              }
              setHistoryModalOpen(true);
            }}
            aria-label={isPro ? "Open history" : "History — Pro feature"}
            title={isPro ? "History" : "History — Pro feature"}
            className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-1 text-muted-foreground/70 hover:text-primary hover:border-primary/40 hover:bg-background/80 transition-smooth backdrop-blur"
          >
            <History className="h-4 w-4" />
            {!isPro && <Lock className="h-3 w-3" />}
          </button>

          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-1 sm:pl-3 backdrop-blur">
            <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0">
              Tone
            </span>
            <div
              role="radiogroup"
              aria-label="Writing tone"
              className="grid grid-cols-4 gap-1 w-full sm:w-auto sm:flex sm:items-center"
            >
              {TONES.map((t) => {
                const active = tone === t;
                return (
                  <button
                    key={t}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTone(t)}
                    className={
                      (active
                        ? "bg-gradient-emerald text-primary-foreground shadow-emerald font-semibold "
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/70 font-medium ") +
                      "px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs text-center transition-smooth whitespace-nowrap"
                    }
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* INPUT */}
        <div>
          {/* Toolbar row — sits above the textarea on every breakpoint */}
          <div className="mb-3 flex flex-row flex-wrap items-center justify-end gap-2">
            <button
              onClick={handleUploadClick}
              disabled={uploading}
              aria-label="Upload .docx file"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-smooth backdrop-blur"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Reading..." : "Upload .docx"}
              {!isPro && freeWordUsed && <Lock className="ml-1 h-3 w-3 text-primary/80" />}
            </button>
            <button
              onClick={handlePdfClick}
              disabled={uploading}
              aria-label={isPro ? "Upload .pdf file" : "Upload .pdf (Pro feature)"}
              title={isPro ? "Upload .pdf" : "PDF Upload is a Pro Feature"}
              className="relative inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-smooth backdrop-blur"
            >
              <FileType2 className="h-3.5 w-3.5" />
              {uploading ? "Reading..." : "Upload .pdf"}
              {!isPro && <Lock className="h-3 w-3 text-primary/80" />}
            </button>
            <button
              onClick={handleClear}
              disabled={!inputText && !outputText && !docx}
              aria-label="Clear editor"
              title="Clear editor"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-40 disabled:cursor-not-allowed transition-smooth"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>

          <input
            ref={docxInputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handlePdfChange}
            className="hidden"
          />

          {/* Floating label + textarea — mirrors the output structure exactly */}
          <div className="relative">
            <label className="absolute -top-2 left-4 px-2 bg-card text-[11px] uppercase tracking-wider text-muted-foreground font-semibold z-10">
              Your text
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your text in ANY language or upload a .docx / .pdf file..."
              className="w-full min-h-[200px] md:min-h-[220px] rounded-xl bg-input/60 border border-border p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-smooth resize-y"
            />
          </div>
          {/* Word/char count */}
          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
            <div className="text-muted-foreground">
              {docx && (
                <>
                  📄 Loaded: <span className="text-foreground">{docx.fileName}.docx</span> — original formatting will be preserved on download.
                </>
              )}
            </div>
            <div className="inline-flex items-center gap-3 text-muted-foreground tabular-nums shrink-0">
              <span>
                <span className="text-foreground font-semibold">
                  {inputText.trim() ? inputText.trim().split(/\s+/).length : 0}
                </span>{" "}
                words
              </span>
              <span className="opacity-40">•</span>
              <span>
                <span className="text-foreground font-semibold">{inputText.length}</span>{" "}
                chars
              </span>
            </div>
          </div>
        </div>

        {/* ACTION */}
        <div className="flex flex-col items-center gap-3 my-5">
          <Button
  variant="emerald"
  size="lg"
  // Sadece gerçekten bir şey yükleniyorsa veya (limit dolmadıysa VE yazı yoksa) kapalı kalsın
  disabled={loading || (!limitReached && !hasInput)} 
  onClick={limitReached ? goToPricing : handleFix}
  className={`min-w-[220px] transition-all duration-300 ${isChecking ? "opacity-70 cursor-wait" : "opacity-100"}`}
>
  {/* İkonlar sadece kontrol bitince ve durumlarına göre gözüksün */}
  {!isChecking && !loading && !limitReached && <Wand2 className="mr-2 h-4 w-4" />}
  {!isChecking && limitReached && <Rocket className="mr-2 h-4 w-4" />}
  
  {/* Yazı zaten bizim şelaleden (buttonLabel) geliyor */}
  {buttonLabel}
</Button>

          <p className="text-xs text-muted-foreground">
            {isChecking
          ? "Checking credits..."
          : !user
          ? "Login to get 5 free daily credits"
          : limitReached
          ? "You've used all 5 free checks today."
          : `${remaining} free check${remaining === 1 ? "" : "s"} left`}
          </p>
        </div>

        {/* OUTPUT */}
        <div className="relative">
          <label className="absolute -top-2 left-4 px-2 bg-card text-[11px] uppercase tracking-wider text-muted-foreground font-semibold z-10">
            Perfect version
          </label>
          <button
            onClick={handleCopy}
            disabled={!outputText}
            aria-label="Copy text"
            className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-smooth backdrop-blur"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
          <textarea
            value={outputText}
            readOnly
            placeholder="Your corrected and professionally polished Bulgarian text will appear here..."
            className="w-full min-h-[200px] md:min-h-[220px] rounded-xl bg-input/40 border border-border p-4 pr-20 text-foreground resize-y"
          />

          {/* Output action bar */}
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={handleListen}
              disabled={!outputText}
              aria-label={speaking ? "Stop reading" : "Listen to corrected text"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-smooth backdrop-blur"
            >
              {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              {speaking ? "Stop" : "Listen"}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={!outputText}
                  aria-label="Export corrected text"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-smooth backdrop-blur"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-popover border-border">
                <DropdownMenuItem onClick={handleExportTxt} className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  Download .txt
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    if (!isPro) {
                      e.preventDefault();
                      setPdfModalOpen(true);
                      return;
                    }
                    handleDownloadPdf();
                  }}
                  className="cursor-pointer"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Download .pdf
                  {!isPro && <Lock className="ml-auto h-3 w-3 text-primary/80" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
{/* CORRECTIONS & SUGGESTIONS */}
        {outputText && (
          <div className="mt-6 rounded-xl border border-border bg-background/50 p-4 md:p-5 backdrop-blur animate-fade-in-up">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-emerald shadow-emerald">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold leading-tight">
                    Corrections & Suggestions
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {corrections.length > 0
                      ? `${corrections.length} change${corrections.length === 1 ? "" : "s"} applied`
                      : "No issues found"}
                  </p>
                </div>
              </div>
              {corrections.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  <CheckCircle2 className="h-3 w-3" />
                  {corrections.length}
                </span>
              )}
            </div>

            {corrections.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                Your text looks great — no corrections needed.
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {corrections.map((c, i) => (
                  <li
                    key={`${i}-${c.original}`}
                    className="group rounded-xl border border-border bg-card/80 p-3.5 shadow-sm transition-smooth hover:border-primary/40 hover:shadow-emerald"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-md bg-destructive/10 px-2 py-0.5 font-medium text-destructive line-through decoration-destructive/60">
                        {c.original}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                        {c.corrected}
                      </span>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-primary/70" />
                      {c.reason}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* DOWNLOAD ACTION */}
        <div className="flex flex-col items-center gap-2 mt-5">
          <Button
            variant="outline"
            size="lg"
            disabled={!outputText}
            onClick={correctedFileBase64 ? handleDownloadWord : handleDownloadPdf}
            className="min-w-[260px]"
            title={!docx ? "Upload a file to enable download" : ""}
          >
            <FileText className="mr-2 h-4 w-4" />
            Download Corrected Version
            <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Supports .docx and .pdf formats
          </span>
        </div>
        {!docx && outputText && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Upload a .docx file to download a corrected Word document with original formatting preserved.
          </p>
        )}
      </div>

      {/* Pro: History slide-out drawer */}
      <HistoryDrawer open={historyDrawerOpen} onOpenChange={setHistoryDrawerOpen} history={history} />

      {/* Premium-feature modal for History */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-md border-primary/30 bg-gradient-card shadow-emerald backdrop-blur">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-emerald shadow-emerald">
              <History className="h-7 w-7 text-primary-foreground" />
            </div>
            <DialogTitle className="text-center font-display text-2xl">
              Unlock <span className="text-gradient-emerald">History</span>
            </DialogTitle>
            <DialogDescription className="text-center">
              Save and access your previous corrections with the Pro Plan for only{" "}
              <span className="font-semibold text-foreground">€5.99/month</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-col sm:space-x-0 gap-2">
            <Button
              variant="emerald"
              size="lg"
              className="w-full"
              onClick={() => {
                setHistoryModalOpen(false);
                goToPricing();
              }}
            >
              <Sparkles className="h-4 w-4" />
              Get Pro Now
            </Button>
            <button
              type="button"
              onClick={() => setHistoryModalOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-smooth"
            >
              Maybe later
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Premium-feature modal for PDF Upload */}
      <Dialog open={pdfModalOpen} onOpenChange={setPdfModalOpen}>
        <DialogContent className="sm:max-w-md border-primary/30 bg-gradient-card shadow-emerald backdrop-blur">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-emerald shadow-emerald">
              <FileType2 className="h-7 w-7 text-primary-foreground" />
            </div>
            <DialogTitle className="text-center font-display text-2xl">
              PDF Upload is a <span className="text-gradient-emerald">Pro Feature</span>
            </DialogTitle>
            <DialogDescription className="text-center">
              PDF processing is a Pro feature. Word (.docx) remains free for everyone — upgrade to unlock PDF uploads & exports for only{" "}
              <span className="font-semibold text-foreground">€5.99/month</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-col sm:space-x-0 gap-2">
            <Button
              variant="emerald"
              size="lg"
              className="w-full"
              onClick={() => {
                setPdfModalOpen(false);
                goToPricing();
              }}
            >
              <Sparkles className="h-4 w-4" />
              Get Pro Now
            </Button>
            <button
              type="button"
              onClick={() => setPdfModalOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-smooth"
            >
              Maybe later
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* WORD PRO MODAL (KAFES) */}
        <Dialog open={wordModalOpen} onOpenChange={setWordModalOpen}>
          <DialogContent className="sm:max-w-md border-primary/30 bg-gradient-card shadow-emerald backdrop-blur">
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-emerald shadow-emerald">
                <Upload className="h-7 w-7 text-primary-foreground" />
              </div>
              <DialogTitle className="text-center font-display text-2xl">
                Word Upload is a <span className="text-gradient-emerald">Pro Feature</span>
              </DialogTitle>
              <DialogDescription className="text-center">
                You've used your 1 free Word document translation! 
                Upgrade to Pro to unlock unlimited Word & PDF processing with perfect formatting preserved.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:flex-col sm:space-x-0 gap-2 mt-4">
              <Button
                variant="emerald"
                size="lg"
                className="w-full"
                onClick={() => {
                  setWordModalOpen(false);
                  goToPricing();
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Get Pro Now
              </Button>
              <button
                type="button"
                onClick={() => setWordModalOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-smooth mt-2"
              >
                Maybe later
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </section>
  );
};

export default Editor;