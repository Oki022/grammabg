import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import jsPDF from "jspdf";
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

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const FREE_LIMIT = 5;

const W_T_REGEX = /<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
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
  text: string;
  paraIndex: number;
}

const extractRuns = (xml: string): { slots: RunSlot[]; plain: string } => {
  const slots: RunSlot[] = [];
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

const redistribute = (slots: RunSlot[], corrected: string): string[] => {
  const correctedParas = corrected.split(/\r?\n/);
  const byPara = new Map<number, number[]>();
  slots.forEach((s, i) => {
    const arr = byPara.get(s.paraIndex) ?? [];
    arr.push(i);
    byPara.set(s.paraIndex, arr);
  });

  const result = slots.map((s) => s.text);

  for (const [pIdx, indices] of byPara) {
    const correctedPara = correctedParas[pIdx] ?? "";
    const originalLengths = indices.map((i) => slots[i].text.length);
    const totalOriginal = originalLengths.reduce((a, b) => a + b, 0);

    if (indices.length === 1) {
      result[indices[0]] = correctedPara;
      continue;
    }
    if (totalOriginal === 0) {
      result[indices[indices.length - 1]] = correctedPara;
      continue;
    }

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

const replaceRuns = (xml: string, newTexts: string[]): string => {
  let i = 0;
  return xml.replace(W_T_REGEX, (_match, attrs: string | undefined) => {
    const txt = newTexts[i++] ?? "";
    const attrStr = attrs && /xml:space=/.test(attrs) ? attrs : `${attrs ?? ""} xml:space="preserve"`;
    return `<w:t${attrStr}>${encodeXml(txt)}</w:t>`;
  });
};

type Tone = "Standard" | "Formal" | "Friendly" | "Academic";
const TONES: Tone[] = ["Standard", "Formal", "Friendly", "Academic"];

const Editor = () => {
  const navigate = useNavigate();

  // STATE TANIMLARI
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
  const [freeWordUsed, setFreeWordUsed] = useState(() => localStorage.getItem("freeWordUsed") === "true");
  const [wordModalOpen, setWordModalOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [docx, setDocx] = useState<any>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [originalSlots, setOriginalSlots] = useState([]);
  const [correctedXml, setCorrectedXml] = useState(null);
  const [correctedFileBase64, setCorrectedFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [corrections, setCorrections] = useState<any[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // ── YENİ STATE'LER ──
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [buyingCredits, setBuyingCredits] = useState(false);

  // REFLER
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const { user, isPro } = useAuth();
  console.log("Editor isPro:", isPro, "user plan:", user?.user_metadata?.plan);

  // HESAPLAMALAR
  const limitReached = !isPro && !!user && count >= FREE_LIMIT;
  const remaining = isPro ? "Unlimited" : Math.max(0, FREE_LIMIT - count);
  const hasInput = !!inputText.trim();
  const canDownload = !!docx || !!correctedXml;

  const buttonLabel = isChecking
    ? "Checking..."
    : !user
      ? "Fix My Text"
      : limitReached
        ? "Upgrade to Pro"
        : loading
          ? "Fixing..."
          : `Fix Text (${isPro ? 'Pro' : remaining + ' left'})`;

  // ── YENİ: payment=success URL kontrolü ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      toast.success('🎉 20 PDF credits added to your account!', { duration: 5000 });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // ANA MOTOR
  const handleFix = async () => {
    const currentWordFile = docxInputRef.current?.files?.[0];
    if ((!currentWordFile && !inputText) || loading || limitReached) return;
    
    if (!user) {
      navigate("/login");
      return;
    }
    
    setLoading(true);
    
    try {
      if (currentWordFile) {
        const reader = new FileReader();
        reader.readAsDataURL(currentWordFile);
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];

            const { data, error } = await supabase.functions.invoke('fix-text', {
              body: { fileBase64: base64, fileName: currentWordFile.name, tone: tone, isFile: true }
            });

            // ── YENİ: Limit hata kontrolü ──
            if (error) {
              if (data?.limitReason) {
                if (data.limitReason === 'pdf_limit_buy_more') {
                  setCreditModalOpen(true);
                } else {
                  toast.error(data.error || 'Limit reached.');
                }
                setLoading(false);
                return;
              }
              throw error;
            }
            if (data && data.error) {
              if (data.limitReason === 'pdf_limit_buy_more') {
                setCreditModalOpen(true);
                setLoading(false);
                return;
              }
              throw new Error(data.error);
            }

            console.log("ARKADAN GELEN PAKET:", data);
            setCorrectedFileBase64(data.fileResult);
            setCorrections(data.corrections || []);

            if (user && isPro && data.result) {
              console.log("History kaydediliyor...", user.id, isPro);
              const { error: histError } = await supabase.from('history' as any).insert({
                user_id: user.id,
                original_text: inputText,
                fixed_text: data.result,
                tone: tone,
              });
              console.log("Sonuç:", histError ? "HATA: " + histError.message : "BAŞARILI");
            }

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
            console.error("TRANSLATION ERROR DETAIL:", err);
            toast.error(err.message || "An error occurred during translation.");
            setLoading(false);
          }
        };
      } else {
        const { data, error } = await supabase.functions.invoke('fix-text', {
        body: { 
        text: inputText, 
        tone: tone, 
        isFile: pdfLoaded,
        fileName: pdfLoaded ? 'document.pdf' : undefined
         }
       });

        // ── YENİ: Limit hata kontrolü ──
        if (error) {
          if (data?.limitReason) {
            if (data.limitReason === 'pdf_limit_buy_more') {
              setCreditModalOpen(true);
            } else {
              toast.error(data.error || 'Limit reached.');
            }
            setLoading(false);
            return;
          }
          throw error;
        }
        if (data && data.error) {
          if (data.limitReason === 'pdf_limit_buy_more') {
            setCreditModalOpen(true);
            setLoading(false);
            return;
          }
          throw new Error(data.error);
        }

        setOutputText(
          (data.result || "")
          .replace(/\r\n/g, "\n")
          .replace(/([.!?])\s{2,}/g, "$1\n\n")
          .replace(/([.!?])\s+([А-ЯA-Z])/g, "$1\n$2")
          .trim()
        );
        setCorrections(data.corrections || []);

        if (user && isPro && data.result) {
          console.log("History kaydediliyor...", user.id, isPro);
          const { error: histError } = await supabase.from('history' as any).insert({
            user_id: user.id,
            original_text: inputText,
            fixed_text: data.result,
            tone: tone,
          });
          console.log("Sonuç:", histError ? "HATA: " + histError.message : "BAŞARILI");
        }

        toast.success("Text successfully polished in the selected tone!");
        setLoading(false);
      }

      // KREDİ DÜŞÜRME BLOĞU KALDIRILDI — artık backend yapıyor

    } catch (error: any) {
      console.error(error);
      toast.error("Mistake: " + error.message);
      setLoading(false);
    }
  };

  // YARDIMCI FONKSİYONLAR
  const handleClear = () => {
    setPdfLoaded(false);
    setInputText(""); 
    setOutputText(""); 
    setDocx(null);
    setCorrectedFileBase64(null);
    setFileName("");
    setCorrections([]);
    if (docxInputRef.current) docxInputRef.current.value = "";
    if (pdfInputRef.current) pdfInputRef.current.value = "";
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
      utt.lang = "bg-BG";
      const voices = window.speechSynthesis.getVoices();
      const bgVoices = voices.filter(voice => voice.lang.includes('bg'));
      let bestVoice = bgVoices.find(voice => 
        voice.name.includes('Google') || voice.name.includes('Premium')
      );
      if (!bestVoice && bgVoices.length > 0) bestVoice = bgVoices[0];
      if (bestVoice) utt.voice = bestVoice;
      utt.rate = 0.9;
      utt.pitch = 0.85;
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

  // DOSYA İŞLEMLERİ
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
      setWordModalOpen(true);
      return;
    }
    handleDocxClick();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const res = await mammoth.extractRawText({ arrayBuffer });
        setInputText(res.value);
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(arrayBuffer);
        const xmlContent = await loadedZip.file("word/document.xml")?.async("string");

        if (xmlContent) {
          const { slots } = extractRuns(xmlContent);
          setOriginalSlots(slots);
          setDocx({ zip: loadedZip, documentXml: xmlContent, fileName: file.name.replace(".docx", "") });
        } else {
          setDocx({ fileName: file.name.replace(".docx", "") });
        }
        setTone("Standard");
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
        setTone("Standard");
        setPdfLoaded(true);
        toast.success("PDF loaded!");
      } catch (err: any) { 
        console.error("PDF Mistake:", err);
        toast.error("PDF error: " + err?.message); 
      } finally { 
        setUploading(false); 
      }
    };
    reader.readAsArrayBuffer(file);
  };

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
      toast.info("Preparing PDF...");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const fontUrl = "https://fonts.gstatic.com/s/notosans/v36/o-0IIpQlx3QUlC5A4PNb4j5Ba_2c7A.ttf";
      const fontResponse = await fetch(fontUrl);
      if (!fontResponse.ok) throw new Error("Font could not be loaded.");
      const fontBuffer = await fontResponse.arrayBuffer();
      const fontBase64 = btoa(
        new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      doc.addFileToVFS("NotoSans-Regular.ttf", fontBase64);
      doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
      doc.setFont("NotoSans");
      doc.setFontSize(11);
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight();
      const lineHeight = 7;
      let y = 25;
      const lines = outputText.split("\n");
      for (const line of lines) {
        if (line.trim() === "") { y += lineHeight * 0.5; continue; }
        const wrapped = doc.splitTextToSize(line.trim(), maxWidth);
        for (const wLine of wrapped) {
          if (y + lineHeight > pageHeight - 15) { doc.addPage(); y = 25; }
          doc.text(wLine, margin, y);
          y += lineHeight;
        }
      }
      const safeName = fileName ? fileName.replace(/\.[^.]+$/, "") : "corrected_document";
      doc.save(`${safeName}.pdf`);
      toast.success("PDF downloaded!");
    } catch (err: any) {
      console.error("PDF error:", err);
      toast.error("PDF export failed: " + err.message);
    }
  };

  // ── YENİ: Ekstra kredi satın al ──
  const handleBuyCredits = async () => {
    setBuyingCredits(true);
    try {
      const { data, error } = await supabase.functions.invoke('buy-credits', {});
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Buy credits error:', err);
      toast.error('Something went wrong. Please try again.');
      setBuyingCredits(false);
    }
  };

  return (
    <section id="editor" className="container py-16 md:py-24">
      <div className="text-center mb-10">
        <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-3">
          The Editor
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Paste text in ANY language or upload your documents. Watch our AI instantly translate and polish it into flawless Bulgarian perfectly .
        </p>
      </div>

      <div className="relative mx-auto max-w-4xl rounded-2xl border border-border bg-gradient-card p-4 md:p-6 shadow-card-premium backdrop-blur">
        {/* TOP ROW: History (left) + Tone (right) */}
        <div className="mb-5 flex items-center gap-2 w-full">

          {/* HISTORY BUTTON */}
          <button
            type="button"
            onClick={async () => {
              if (isPro) {
                const { data: historyData } = await supabase
                  .from('history' as any)
                  .select('*')
                  .eq('user_id', user!.id)
                  .order('created_at', { ascending: false })
                  .limit(20);
                if (historyData) setHistory(historyData);
                setHistoryDrawerOpen(true);
                return;
              }
              setHistoryModalOpen(true);
            }}
            aria-label={isPro ? "Open history" : "History — Pro feature"}
            className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-1 text-muted-foreground/70 hover:text-primary hover:border-primary/40 hover:bg-background/80 transition-smooth backdrop-blur"
          >
            <History className="h-4 w-4" />
            {!isPro && <Lock className="h-3 w-3" />}
          </button>

          {/* TONE SELECTOR ASKIYA ALINDI */}
          {false && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-1 sm:pl-3 backdrop-blur ml-auto">
              <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0 px-2">
                Tone
              </span>
              <div className="flex sm:grid sm:grid-cols-4 gap-1 w-full overflow-x-auto scrollbar-hide">
                {TONES.filter(t => (!docx && !pdfLoaded) || t === "Standard").map((t) => {
                  const active = tone === t;
                  return (
                    <button
                      key={t}
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
          )}

        </div>

        {/* INPUT */}
        <div>
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
            disabled={loading || (!limitReached && !hasInput)} 
            onClick={limitReached ? goToPricing : handleFix}
            className={`min-w-[220px] transition-all duration-300 ${isChecking ? "opacity-70 cursor-wait" : "opacity-100"}`}
          >
            {!isChecking && !loading && !limitReached && <Wand2 className="mr-2 h-4 w-4" />}
            {!isChecking && limitReached && <Rocket className="mr-2 h-4 w-4" />}
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

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {false && (
              <button
                onClick={handleListen}
                disabled={!outputText}
                aria-label={speaking ? "Stop reading" : "Listen to corrected text"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-smooth backdrop-blur"
              >
                {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                {speaking ? "Stop" : "Listen"}
              </button>
            )}

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
        <div className="flex flex-col items-center gap-2 mt-5 w-full">
          <Button
            variant="outline"
            size="lg"
            disabled={!outputText}
            onClick={correctedFileBase64 ? handleDownloadWord : handleDownloadPdf}
            className="w-full sm:w-auto px-4 text-sm sm:text-base flex items-center justify-center"
            title={!docx ? "Upload a file to enable download" : ""}
          >
            <FileText className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">Download Corrected Version</span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-70 shrink-0" />
          </Button>
          <span className="text-[11px] text-muted-foreground text-center">
            Supports .docx and .pdf formats
          </span>
        </div>
        {!docx && outputText && (
          <p className="mt-3 text-center text-xs text-muted-foreground px-4">
            Upload a .docx file to download a corrected Word document with original formatting preserved.
          </p>
        )}
      </div>

      {/* Pro: History slide-out drawer */}
      <HistoryDrawer 
        open={historyDrawerOpen} 
        onOpenChange={setHistoryDrawerOpen} 
        history={history}
        onSelect={(item) => {
          setInputText(item.original_text);
          setOutputText(item.fixed_text);
          setTone(item.tone || "Standard");
        }}
      />

      {/* History modal */}
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
              onClick={() => { setHistoryModalOpen(false); goToPricing(); }}
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

      {/* PDF Pro modal */}
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
              onClick={() => { setPdfModalOpen(false); goToPricing(); }}
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

      {/* Word Pro modal */}
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
              onClick={() => { setWordModalOpen(false); goToPricing(); }}
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

      {/* ── YENİ: PDF Limit / Ekstra Kredi modal ── */}
      <Dialog open={creditModalOpen} onOpenChange={setCreditModalOpen}>
        <DialogContent className="sm:max-w-md border-primary/30 bg-gradient-card shadow-emerald backdrop-blur">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-emerald shadow-emerald">
              <FileDown className="h-7 w-7 text-primary-foreground" />
            </div>
            <DialogTitle className="text-center font-display text-2xl">
              PDF Limit <span className="text-gradient-emerald">Reached</span>
            </DialogTitle>
            <DialogDescription className="text-center">
              You've used all 15 monthly PDF credits.
              Get <span className="font-semibold text-foreground">20 extra PDF credits</span> for only{" "}
              <span className="font-semibold text-foreground">€3.99</span> — no subscription, one-time payment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-col sm:space-x-0 gap-2">
            <Button
              variant="emerald"
              size="lg"
              className="w-full"
              disabled={buyingCredits}
              onClick={handleBuyCredits}
            >
              {buyingCredits ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Redirecting...
                </span>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Buy 20 PDF Credits — €3.99
                </>
              )}
            </Button>
            <button
              type="button"
              onClick={() => setCreditModalOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-smooth"
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
