import React, { useState, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { uploadPdfToSupabaseStorage } from '../lib/supabaseSync';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  MapPin, 
  UserCheck, 
  Users, 
  BookOpen, 
  Award, 
  Filter, 
  Sparkles,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  ArrowRight,
  Search,
  Trash2,
  Pencil,
  Zap,
  X,
  AlertTriangle,
  SlidersHorizontal,
  Check,
  Upload,
  Eye,
  ExternalLink,
  RefreshCw,
  Printer
} from 'lucide-react';
import { TrainingLog, Collaborator, TrainingModule } from '../types';
import { ESCALES, ESCALE_COLORS, getEscaleStyle } from '../data/modulesData';
import { formatDateFR, normalizeDateToISO } from '../utils/dateUtils';
export { formatDateFR };

interface CalendarViewProps {
  trainingLogs: TrainingLog[];
  collaborators: Collaborator[];
  modulesCatalog: TrainingModule[];
  onOpenEnrollmentOnDate: (dateStr: string, numSessionStr: string) => void;
  onEditLog?: (log: TrainingLog) => void;
  onDeleteLogs?: (logIds: string[]) => void;
  onBulkUpdateLogs?: (updates: { id: string; changes: Partial<TrainingLog> }[]) => void;
  isReadOnly?: boolean;
}

export interface CalendarSession {
  key: string;
  numSession: string;
  moduleName: string;
  cycle: string;
  type: string;
  formateur: string;
  idFormateur: string;
  escale: string;
  service: string;
  lieu: string;
  dateDebut: string;
  dateFin: string;
  heureDebut1: string;
  heureFin1: string;
  heureDebut2: string;
  heureFin2: string;
  madEa: boolean;
  cttHbo: boolean;
  convoc: boolean;
  notes: string;
  logs: TrainingLog[];
  durationHours: number;
  emrgFileUrl?: string;
  emrgFileName?: string;
}

interface BulkParticipantItem {
  id: string;
  collaboratorId: string;
  collaboratorName: string;
  matricule: string;
  escale: string;
  service: string;
  madEa: boolean;
  cttHbo: boolean;
  convoc: boolean;
  resultat: string;
  consigne: string;
  emrg: boolean;
  attest: boolean;
  emrgFileUrl?: string;
  emrgFileName?: string;
}

// Solid background color mapping for Escale badges
export const SOLID_ESCALE_CLASSES: Record<string, { bg: string; border: string; text: string; hex: string }> = {
  'BES': { bg: 'bg-red-600', border: 'border-red-700', text: 'text-white', hex: '#EF4444' },
  'BOD': { bg: 'bg-yellow-600', border: 'border-yellow-700', text: 'text-white', hex: '#CA8A04' },
  'LYS': { bg: 'bg-purple-600', border: 'border-purple-700', text: 'text-white', hex: '#8B5CF6' },
  'MPL': { bg: 'bg-amber-900', border: 'border-amber-950', text: 'text-white', hex: '#78350F' },
  'MRS': { bg: 'bg-emerald-600', border: 'border-emerald-700', text: 'text-white', hex: '#15803D' },
  'NCE': { bg: 'bg-sky-600', border: 'border-sky-700', text: 'text-white', hex: '#0284C7' },
  'NTE': { bg: 'bg-teal-600', border: 'border-teal-700', text: 'text-white', hex: '#0D9488' },
  'TLS': { bg: 'bg-pink-600', border: 'border-pink-700', text: 'text-white', hex: '#DB2777' },
  'HUBJOB': { bg: 'bg-slate-700', border: 'border-slate-800', text: 'text-white', hex: '#475569' },
};

export function getSolidEscaleClass(escale: string) {
  const norm = (escale || '').toUpperCase().trim();
  return SOLID_ESCALE_CLASSES[norm] || { bg: 'bg-indigo-600', border: 'border-indigo-700', text: 'text-white', hex: '#4F46E5' };
}

export default function CalendarView({
  trainingLogs,
  collaborators,
  modulesCatalog,
  onOpenEnrollmentOnDate,
  onEditLog,
  onDeleteLogs,
  onBulkUpdateLogs,
  isReadOnly = false
}: CalendarViewProps) {
  // Current viewed month date state
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedSessionKey, setSelectedSessionKey] = useState<string | null>(null);
  const [escaleFilter, setEscaleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkParticipantItem[]>([]);

  // EMRG Attachment Dialog state
  const [emrgDialogState, setEmrgDialogState] = useState<{
    isOpen: boolean;
    targetIndex: number | 'ALL';
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // PDF Preview Modal state
  const [pdfPreviewState, setPdfPreviewState] = useState<{
    isOpen: boolean;
    url: string;
    fileName: string;
  } | null>(null);

  const panelFileInputRef = useRef<HTMLInputElement | null>(null);

  // Error state for PDF uploads and file processing
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isExportingEmargementPdf, setIsExportingEmargementPdf] = useState(false);

  const customLogo = useMemo(() => {
    return localStorage.getItem('app_custom_logo') || '/src/assets/images/logo_hubjob_1784577741492.jpg';
  }, []);

  const modernColorToRgbStr = (cssText: string): string => {
    if (!cssText || typeof cssText !== 'string') return cssText;
    const lower = cssText.toLowerCase();
    if (!lower.includes('oklch') && !lower.includes('oklab')) return cssText;

    const oklabToRgb = (lVal: number, aLab: number, bLab: number, alpha: number) => {
      const l_ = lVal + 0.3963377774 * aLab + 0.2158037573 * bLab;
      const m_ = lVal - 0.1055613458 * aLab - 0.0638541728 * bLab;
      const s_ = lVal - 0.0894841775 * aLab - 1.2914855480 * bLab;

      const lR = Math.pow(Math.max(0, l_), 3);
      const mR = Math.pow(Math.max(0, m_), 3);
      const sR = Math.pow(Math.max(0, s_), 3);

      const rLinear = +4.0767416621 * lR - 3.3077115913 * mR + 0.2309699292 * sR;
      const gLinear = -1.2684380046 * lR + 2.6097574011 * mR - 0.3413193965 * sR;
      const bLinear = +0.0041960863 * lR - 0.7034186147 * mR + 1.7076147010 * sR;

      const toSrgb = (x: number) => {
        const clamped = Math.max(0, Math.min(1, x));
        return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
      };

      const r = Math.round(toSrgb(rLinear) * 255);
      const g = Math.round(toSrgb(gLinear) * 255);
      const b = Math.round(toSrgb(bLinear) * 255);

      if (alpha < 1) {
        return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;
      }
      return `rgb(${r}, ${g}, ${b})`;
    };

    let result = cssText;

    if (result.toLowerCase().includes('oklab')) {
      result = result.replace(/oklab\(([^)]+)\)/gi, (_match, content) => {
        try {
          const parts = content.trim().split('/');
          const colorArgs = parts[0].trim().split(/[\s,]+/);
          if (colorArgs.length < 3) return 'rgb(0, 0, 0)';

          let l = parseFloat(colorArgs[0]);
          if (colorArgs[0].includes('%') || l > 1) l /= 100;

          let a = parseFloat(colorArgs[1]);
          if (isNaN(a)) a = 0;

          let b = parseFloat(colorArgs[2]);
          if (isNaN(b)) b = 0;

          let alpha = 1;
          if (parts[1]) {
            const aStr = parts[1].trim();
            alpha = aStr.includes('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
            if (isNaN(alpha)) alpha = 1;
          }

          return oklabToRgb(l, a, b, alpha);
        } catch {
          return 'rgb(0, 0, 0)';
        }
      });
    }

    if (result.toLowerCase().includes('oklch')) {
      result = result.replace(/oklch\(([^)]+)\)/gi, (_match, content) => {
        try {
          const parts = content.trim().split('/');
          const colorArgs = parts[0].trim().split(/[\s,]+/);
          if (colorArgs.length < 3) return 'rgb(0, 0, 0)';

          let l = parseFloat(colorArgs[0]);
          if (colorArgs[0].includes('%') || l > 1) l /= 100;

          let c = parseFloat(colorArgs[1]);
          if (isNaN(c)) c = 0;

          let h = parseFloat(colorArgs[2]);
          if (isNaN(h)) h = 0;

          let alpha = 1;
          if (parts[1]) {
            const aStr = parts[1].trim();
            alpha = aStr.includes('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
            if (isNaN(alpha)) alpha = 1;
          }

          const hRad = (h * Math.PI) / 180;
          const aLab = c * Math.cos(hRad);
          const bLab = c * Math.sin(hRad);

          return oklabToRgb(l, aLab, bLab, alpha);
        } catch {
          return 'rgb(0, 0, 0)';
        }
      });
    }

    return result;
  };

  const handleExportEmargementPdf = async () => {
    if (!selectedSession) return;
    setIsExportingEmargementPdf(true);
    try {
      const container = document.getElementById('emargement-pdf-export-container');
      if (!container) {
        alert("Impossible de trouver le conteneur du document d'émargement.");
        return;
      }

      // Convert image sources inside container to data URLs if needed to prevent canvas tainting
      const imgElements = Array.from(container.querySelectorAll('img'));
      for (const img of imgElements) {
        if (img.src && !img.src.startsWith('data:')) {
          try {
            const res = await fetch(img.src);
            const blob = await res.blob();
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            img.src = dataUrl;
          } catch (e) {
            console.warn("Could not convert image to base64 data URL:", e);
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 250));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200,
        windowHeight: 900,
        onclone: (clonedDoc) => {
          // 1. Position cloned container cleanly at (0,0) inside the cloned document
          const clonedContainer = clonedDoc.getElementById('emargement-pdf-export-container');
          if (clonedContainer) {
            clonedContainer.style.position = 'absolute';
            clonedContainer.style.top = '0px';
            clonedContainer.style.left = '0px';
            clonedContainer.style.margin = '0px';
            clonedContainer.style.zIndex = '999999';
            clonedContainer.style.transform = 'none';
          }

          // 2. Sanitize all <style> tags in cloned document to convert any oklch(...) and oklab(...)
          const styleEls = Array.from(clonedDoc.querySelectorAll('style'));
          styleEls.forEach((styleEl) => {
            if (styleEl.textContent && (styleEl.textContent.toLowerCase().includes('oklch') || styleEl.textContent.toLowerCase().includes('oklab'))) {
              styleEl.textContent = modernColorToRgbStr(styleEl.textContent);
            }
          });

          // 3. Sanitize styleSheets rules in cloned document if accessible
          try {
            Array.from(clonedDoc.styleSheets).forEach((sheet) => {
              try {
                const rules = Array.from(sheet.cssRules || []);
                rules.forEach((rule) => {
                  if (rule.cssText && (rule.cssText.toLowerCase().includes('oklch') || rule.cssText.toLowerCase().includes('oklab'))) {
                    if (rule instanceof CSSStyleRule) {
                      rule.style.cssText = modernColorToRgbStr(rule.style.cssText);
                    }
                  }
                });
              } catch {
                // Ignore cross-origin stylesheet access restriction
              }
            });
          } catch {
            // Ignore stylesheet iteration error
          }

          // 4. Convert inline and computed styles for elements inside export container
          if (clonedContainer) {
            const elements = [clonedContainer, ...Array.from(clonedContainer.querySelectorAll('*'))];
            const view = clonedDoc.defaultView || window;
            elements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              if (htmlEl.style && htmlEl.style.cssText && (htmlEl.style.cssText.toLowerCase().includes('oklch') || htmlEl.style.cssText.toLowerCase().includes('oklab'))) {
                htmlEl.style.cssText = modernColorToRgbStr(htmlEl.style.cssText);
              }
              const computed = view.getComputedStyle(htmlEl);
              if (computed) {
                const colorProps = [
                  'color',
                  'background-color',
                  'border-color',
                  'border-top-color',
                  'border-right-color',
                  'border-bottom-color',
                  'border-left-color',
                  'outline-color',
                  'box-shadow',
                  'fill',
                  'stroke'
                ];
                colorProps.forEach((prop) => {
                  const val = computed.getPropertyValue(prop);
                  if (val && (val.toLowerCase().includes('oklch') || val.toLowerCase().includes('oklab'))) {
                    htmlEl.style.setProperty(prop, modernColorToRgbStr(val), 'important');
                  }
                });
              }
            });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = 297;
      const pdfHeight = 210;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const fileName = `Emargement_Session_${selectedSession.numSession}_${selectedSession.dateDebut || 'export'}.pdf`;
      
      // Save locally
      pdf.save(fileName);

      // Upload to Supabase Storage for remote sharing
      try {
        const pdfBlob = pdf.output('blob');
        const remoteUrl = await uploadPdfToSupabaseStorage(fileName, pdfBlob);
        if (remoteUrl) {
          console.log(`PDF émargement téléversé sur Supabase Storage : ${remoteUrl}`);
        }
      } catch (uploadErr) {
        console.warn("Téléversement optionnel du PDF sur Supabase Storage :", uploadErr);
      }
    } catch (error) {
      console.error("Erreur lors de la génération du PDF d'émargement:", error);
      alert("Erreur lors de la création du fichier PDF d'émargement : " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsExportingEmargementPdf(false);
    }
  };

  // Safe file reader & validator helper for PDFs
  const processPdfFile = (file: File, onSuccess: (dataUrl: string, fileName: string) => void) => {
    setUploadError(null);
    if (!file) return;

    // Validate MIME type or file extension
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setUploadError("Le fichier sélectionné n'est pas au format PDF valide. Veuillez choisir un document avec l'extension .pdf.");
      return;
    }

    // Validate size limit (10MB max to prevent browser storage/memory crash)
    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)} Mo). La taille maximale autorisée est de ${MAX_SIZE_MB} Mo.`);
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataUrl = reader.result as string;
          if (!dataUrl) {
            setUploadError("Impossible d'extraire le contenu du fichier PDF sélectionné.");
            return;
          }
          onSuccess(dataUrl, file.name);
        } catch (err) {
          console.error("Erreur de traitement PDF:", err);
          setUploadError("Une erreur est survenue lors du codage du fichier PDF.");
        }
      };
      reader.onerror = (err) => {
        console.error("Erreur de lecture du fichier PDF:", err);
        setUploadError("Impossible de lire le fichier PDF. Le fichier est peut-être corrompu ou illisible.");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Exception lors de l'ouverture du fichier PDF:", err);
      setUploadError("Une erreur est survenue lors de l'ouverture du document.");
    }
  };

  const handleOpenPdfPreview = (url: string, fileName: string) => {
    setPdfPreviewState({
      isOpen: true,
      url,
      fileName
    });
  };

  const handleOpenPdfInNewTab = (url: string) => {
    try {
      if (url.startsWith('data:')) {
        const parts = url.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (!win) {
          setUploadError("Le navigateur a bloqué l'ouverture du nouvel onglet. Veuillez autoriser les fenêtres surgissantes (popups).");
        }
        return;
      }
      
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<!DOCTYPE html><html><head><title>Document d'émargement PDF</title><style>html,body{margin:0;height:100%;overflow:hidden;}</style></head><body><iframe src="${url}" style="border:none;width:100%;height:100%;"></iframe></body></html>`);
        w.document.close();
      } else {
        setUploadError("Le navigateur a bloqué l'ouverture de la nouvelle fenêtre.");
      }
    } catch (err) {
      console.error("Impossible d'ouvrir l'onglet:", err);
      setUploadError("Erreur lors de l'ouverture du document PDF dans un nouvel onglet.");
    }
  };

  const handlePanelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedSession && onBulkUpdateLogs) {
      processPdfFile(file, (dataUrl, fileName) => {
        const updates = selectedSession.logs.map(log => ({
          id: log.id,
          changes: {
            emrg: true,
            emrgFileUrl: dataUrl,
            emrgFileName: fileName
          }
        }));
        onBulkUpdateLogs(updates);
      });
    }
    if (e.target) e.target.value = '';
  };

  // Bulk global header controls state
  const [globalResultat, setGlobalResultat] = useState<string>('Réussite');
  const [globalConsigne, setGlobalConsigne] = useState<string>('A payer');

  // Group training logs into sessions
  const sessions = useMemo<CalendarSession[]>(() => {
    const map = new Map<string, CalendarSession>();
    
    // Sort logs by dateDebut or dateInscription
    const sortedLogs = [...trainingLogs].sort((a, b) => {
      const dA = a.dateDebut || a.dateInscription || '';
      const dB = b.dateDebut || b.dateInscription || '';
      return dA.localeCompare(dB);
    });

    // Auto session number generator counter per year-month
    const sessionIncMap = new Map<string, number>();

    sortedLogs.forEach((log) => {
      const dStr = log.dateDebut || log.dateInscription || new Date().toISOString().split('T')[0];
      const dObj = new Date(dStr);
      const year = !isNaN(dObj.getTime()) ? dObj.getFullYear() : 2026;
      const monthStr = !isNaN(dObj.getTime()) ? String(dObj.getMonth() + 1).padStart(2, '0') : '07';
      const yearMonthPrefix = `HBO${year}${monthStr}`;

      // Unique key for grouping
      let sessionNum = log.numSession;
      let groupKey = '';

      if (sessionNum && sessionNum.trim()) {
        groupKey = sessionNum.trim();
      } else {
        groupKey = `${dStr}_${log.moduleName}_${log.escale}`;
      }

      if (!map.has(groupKey)) {
        if (!sessionNum || !sessionNum.trim()) {
          const currentInc = (sessionIncMap.get(yearMonthPrefix) || 0) + 1;
          sessionIncMap.set(yearMonthPrefix, currentInc);
          sessionNum = `${yearMonthPrefix}${String(currentInc).padStart(2, '0')}`;
        }

        // Calculate hours
        const calculateHours = (s1?: string, e1?: string, s2?: string, e2?: string) => {
          let hours = 0;
          const getDiff = (s?: string, e?: string) => {
            if (!s || !e) return 0;
            const [sh, sm] = s.split(':').map(Number);
            const [eh, em] = e.split(':').map(Number);
            if (isNaN(sh) || isNaN(eh)) return 0;
            const diff = (eh * 60 + em) - (sh * 60 + sm);
            return diff > 0 ? diff / 60 : 0;
          };
          hours += getDiff(s1, e1);
          hours += getDiff(s2, e2);
          if (hours > 0) return hours;
          return (s2 && s2.trim()) ? 7 : 4;
        };

        const durationHours = calculateHours(
          log.heureDebut1, log.heureFin1, log.heureDebut2, log.heureFin2
        );

        const hDeb1 = log.heureDebut1 || (log.heureDebut2 ? '' : '08:00');
        const hFin1 = log.heureFin1 || (log.heureDebut1 ? '' : (log.heureDebut2 ? '' : '12:00'));
        const hDeb2 = log.heureDebut2 || '';
        const hFin2 = log.heureFin2 || '';

        map.set(groupKey, {
          key: groupKey,
          numSession: sessionNum,
          moduleName: log.moduleName,
          cycle: log.cycle || 'INI',
          type: log.type || 'Présentiel',
          formateur: log.formateur || 'Hubjob - Interne',
          idFormateur: log.idFormateur || '',
          escale: log.escale || 'BOD',
          service: log.service || 'PISTE',
          lieu: log.lieu || `Escale de ${log.escale || 'BOD'} - Salle de Formation`,
          dateDebut: log.dateDebut || dStr,
          dateFin: log.dateFin || log.dateDebut || dStr,
          heureDebut1: hDeb1,
          heureFin1: hFin1,
          heureDebut2: hDeb2,
          heureFin2: hFin2,
          madEa: !!log.madEa,
          cttHbo: !!log.cttHbo,
          convoc: !!log.convoc,
          notes: log.cleanNotes || log.notes || '',
          logs: [log],
          durationHours,
          emrgFileUrl: log.emrgFileUrl,
          emrgFileName: log.emrgFileName
        });
      } else {
        const session = map.get(groupKey)!;
        session.logs.push(log);
        if (log.madEa) session.madEa = true;
        if (log.cttHbo) session.cttHbo = true;
        if (log.convoc) session.convoc = true;
        if (log.emrgFileUrl && !session.emrgFileUrl) {
          session.emrgFileUrl = log.emrgFileUrl;
          session.emrgFileName = log.emrgFileName;
        }
      }
    });

    return Array.from(map.values());
  }, [trainingLogs]);

  // Filtered sessions based on search & escale filter
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (escaleFilter !== 'ALL' && s.escale.toUpperCase() !== escaleFilter.toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = s.numSession.toLowerCase().includes(q);
        const matchModule = s.moduleName.toLowerCase().includes(q);
        const matchFormateur = s.formateur.toLowerCase().includes(q);
        const matchCollab = s.logs.some(l => l.collaboratorName.toLowerCase().includes(q));
        if (!matchCode && !matchModule && !matchFormateur && !matchCollab) return false;
      }
      return true;
    });
  }, [sessions, escaleFilter, searchQuery]);

  // Selected Session object
  const selectedSession = useMemo(() => {
    if (!selectedSessionKey) return filteredSessions[0] || sessions[0] || null;
    return sessions.find(s => s.key === selectedSessionKey) || filteredSessions[0] || null;
  }, [selectedSessionKey, sessions, filteredSessions]);

  // Calendar Days calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Lundi, 6 = Dimanche

  const calendarGrid = useMemo(() => {
    const grid: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const yyyy = prevDate.getFullYear();
      const mm = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      grid.push({
        dateStr: `${yyyy}-${mm}-${dd}`,
        dayNum: d,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const yyyy = year;
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      grid.push({
        dateStr: `${yyyy}-${mm}-${dd}`,
        dayNum: d,
        isCurrentMonth: true
      });
    }

    // Next month padding
    const totalSlots = Math.ceil(grid.length / 7) * 7;
    const nextPadding = totalSlots - grid.length;
    for (let d = 1; d <= nextPadding; d++) {
      const nextDate = new Date(year, month + 1, d);
      const yyyy = nextDate.getFullYear();
      const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      grid.push({
        dateStr: `${yyyy}-${mm}-${dd}`,
        dayNum: d,
        isCurrentMonth: false
      });
    }

    return grid;
  }, [year, month, daysInMonth, firstDayOfWeek]);

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleJumpToDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const parts = e.target.value.split('-');
    if (parts.length >= 2) {
      setCurrentDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
    }
  };

  // Helper to generate next session number for a specific date
  const generateSessionCodeForDate = (dateStr: string) => {
    const dObj = new Date(dateStr);
    const yyyy = !isNaN(dObj.getTime()) ? dObj.getFullYear() : year;
    const mm = !isNaN(dObj.getTime()) ? String(dObj.getMonth() + 1).padStart(2, '0') : String(month + 1).padStart(2, '0');
    const prefix = `HBO${yyyy}${mm}`;

    let maxInc = 0;
    sessions.forEach(s => {
      if (s.numSession.startsWith(prefix)) {
        const incPart = parseInt(s.numSession.slice(prefix.length), 10);
        if (!isNaN(incPart) && incPart > maxInc) maxInc = incPart;
      }
    });

    const nextInc = String(maxInc + 1).padStart(2, '0');
    return `${prefix}${nextInc}`;
  };

  // Click on a day cell opens enrollment modal
  const handleDayClick = (dateStr: string) => {
    if (isReadOnly) return;
    const sessionCode = generateSessionCodeForDate(dateStr);
    onOpenEnrollmentOnDate(dateStr, sessionCode);
  };

  // Delete session confirm action
  const handleConfirmDeleteSession = () => {
    if (!selectedSession || !onDeleteLogs) return;
    const logIdsToDelete = selectedSession.logs.map(l => l.id);
    onDeleteLogs(logIdsToDelete);
    setIsDeleteModalOpen(false);
    setSelectedSessionKey(null);
  };

  // Open Bulk Edit Modal
  const handleOpenBulkModal = (session: CalendarSession) => {
    const items: BulkParticipantItem[] = session.logs.map(log => {
      const collab = collaborators.find(c => c.id === log.collaboratorId);
      return {
        id: log.id,
        collaboratorId: log.collaboratorId,
        collaboratorName: log.collaboratorName,
        matricule: collab?.matricule || 'N/A',
        escale: log.escale,
        service: log.service,
        madEa: !!log.madEa,
        cttHbo: !!log.cttHbo,
        convoc: !!log.convoc,
        resultat: log.resultat || 'En cours',
        consigne: log.consigne || 'A payer',
        emrg: !!log.emrg,
        attest: !!log.attest,
        emrgFileUrl: log.emrgFileUrl,
        emrgFileName: log.emrgFileName
      };
    });
    setBulkItems(items);
    setIsBulkModalOpen(true);
  };

  // Bulk Apply & Toggle Functions
  const applyBulkResultatToAll = () => {
    setBulkItems(prev => prev.map(item => ({ ...item, resultat: globalResultat })));
  };

  const applyBulkConsigneToAll = () => {
    setBulkItems(prev => prev.map(item => ({ ...item, consigne: globalConsigne })));
  };

  const toggleAllMadEa = () => {
    const allChecked = bulkItems.length > 0 && bulkItems.every(item => item.madEa);
    setBulkItems(prev => prev.map(item => ({ ...item, madEa: !allChecked })));
  };

  const toggleAllCttHbo = () => {
    const allChecked = bulkItems.length > 0 && bulkItems.every(item => item.cttHbo);
    setBulkItems(prev => prev.map(item => ({ ...item, cttHbo: !allChecked })));
  };

  const toggleAllConvoc = () => {
    const allChecked = bulkItems.length > 0 && bulkItems.every(item => item.convoc);
    setBulkItems(prev => prev.map(item => ({ ...item, convoc: !allChecked })));
  };

  const toggleAllEmrg = () => {
    const allChecked = bulkItems.length > 0 && bulkItems.every(item => item.emrg);
    setBulkItems(prev => prev.map(item => ({ ...item, emrg: !allChecked })));
  };

  const toggleAllAttest = () => {
    const allChecked = bulkItems.length > 0 && bulkItems.every(item => item.attest);
    setBulkItems(prev => prev.map(item => ({ ...item, attest: !allChecked })));
  };

  // Save Bulk Changes
  const handleSaveBulkChanges = () => {
    if (!onBulkUpdateLogs) return;
    const updates = bulkItems.map(item => ({
      id: item.id,
      changes: {
        madEa: item.madEa,
        cttHbo: item.cttHbo,
        convoc: item.convoc,
        resultat: item.resultat,
        consigne: item.consigne,
        emrg: item.emrg,
        attest: item.attest,
        emrgFileUrl: item.emrgFileUrl,
        emrgFileName: item.emrgFileName
      }
    }));
    onBulkUpdateLogs(updates);
    setIsBulkModalOpen(false);
  };

  // Month Title formatted in French
  const monthTitle = currentDate.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric'
  });

  const formattedMonthTitle = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-fade-in" id="calendar-view-container">
      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-800 text-xs animate-fade-in shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-extrabold text-sm text-rose-900">Erreur de document / Pièce jointe</h4>
              <p className="font-medium text-rose-700 mt-0.5">{uploadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors shrink-0 cursor-pointer"
            title="Fermer le message"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Top Bar: Title & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#06b6d4]/10 text-[#06b6d4] rounded-xl border border-[#06b6d4]/20">
            <CalendarIcon className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Calendrier de Formation</h1>
              <span className="bg-[#06b6d4]/10 text-[#00838f] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#06b6d4]/30">
                Planning Interactif
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gérez les sessions de formation, planifiez de nouveaux créneaux et consultez les détails par escale.
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Escale Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={escaleFilter}
              onChange={(e) => setEscaleFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Toutes les escales</option>
              {ESCALES.map(esc => (
                <option key={esc} value={esc}>Escale {esc}</option>
              ))}
            </select>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Module, N° session, agent..."
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/40 w-44 md:w-56"
            />
          </div>

          {/* New Session Button */}
          {!isReadOnly && (
            <button
              onClick={() => handleDayClick(todayStr)}
              className="flex items-center gap-1.5 bg-[#0062FF] hover:bg-[#0062FF]/90 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm shadow-[#0062FF]/20 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Nouvelle Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split View Grid (2/3 Left, 1/3 Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* LEFT PANEL (2/3) - Calendar Grid */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
          
          {/* Calendar Header / Navigation Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/80 border-b border-slate-200 gap-3">
            
            {/* Month title + Nav */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-2xs p-0.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                  title="Mois précédent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                  title="Mois suivant"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {formattedMonthTitle}
              </h2>

              <button
                onClick={handleToday}
                className="text-xs font-bold text-[#06b6d4] hover:text-[#00838f] bg-[#06b6d4]/10 hover:bg-[#06b6d4]/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Aujourd'hui
              </button>
            </div>

            {/* Direct Month / Date selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Sélecteur de date :</span>
              <input
                type="month"
                value={`${year}-${String(month + 1).padStart(2, '0')}`}
                onChange={handleJumpToDate}
                className="px-2.5 py-1.5 border border-slate-200 bg-white rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/40 cursor-pointer"
              />
            </div>

          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/60 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider py-2.5">
            <div>Lun</div>
            <div>Mar</div>
            <div>Mer</div>
            <div>Jeu</div>
            <div>Ven</div>
            <div className="text-slate-400">Sam</div>
            <div className="text-slate-400">Dim</div>
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-150 bg-slate-50/30">
            {calendarGrid.map((slot, idx) => {
              // Find sessions occurring on slot.dateStr
              const slotSessions = filteredSessions.filter(s => {
                const sStart = s.dateDebut || s.dateFin;
                const sEnd = s.dateFin || s.dateDebut;
                return slot.dateStr >= sStart && slot.dateStr <= sEnd;
              });

              const isToday = slot.dateStr === todayStr;

              return (
                <div
                  key={slot.dateStr + '_' + idx}
                  className={`min-h-[110px] h-auto p-1.5 transition-all flex flex-col justify-between group relative ${
                    slot.isCurrentMonth ? 'bg-white' : 'bg-slate-50/50 opacity-60'
                  } ${isToday ? 'ring-2 ring-inset ring-[#06b6d4] bg-cyan-50/20' : ''}`}
                >
                  {/* Top Bar inside cell: Day number + Add button */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-extrabold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday 
                          ? 'bg-[#06b6d4] text-white shadow-xs' 
                          : slot.isCurrentMonth 
                          ? 'text-slate-800' 
                          : 'text-slate-400'
                      }`}
                    >
                      {slot.dayNum}
                    </span>

                    {/* Quick Add Session Button on Hover */}
                    {!isReadOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDayClick(slot.dateStr);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[10px] bg-slate-100 hover:bg-[#0062FF] hover:text-white text-slate-600 font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer flex items-center gap-0.5"
                        title="Créer une session ce jour"
                      >
                        <Plus className="h-3 w-3" />
                        <span className="hidden sm:inline">Session</span>
                      </button>
                    )}
                  </div>

                  {/* Badges Container */}
                  <div className="space-y-1 my-0.5 flex-1">
                    {slotSessions.map(session => {
                      const solidStyle = getSolidEscaleClass(session.escale);
                      const isSelected = selectedSession?.key === session.key;

                      return (
                        <div
                          key={session.key}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSessionKey(session.key);
                          }}
                          className={`${solidStyle.bg} ${solidStyle.text} p-1 rounded-md text-left shadow-2xs hover:shadow-md transition-all cursor-pointer border ${solidStyle.border} ${
                            isSelected ? 'ring-2 ring-slate-900 ring-offset-1 scale-[1.02]' : 'hover:scale-[1.01]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 leading-none">
                            <span className="font-mono font-black text-[8.5px] tracking-tight bg-black/20 px-1 py-0.5 rounded shrink-0">
                              {session.numSession}
                            </span>
                            <span className="font-extrabold text-[8px] uppercase px-1 py-0.2 bg-white/20 rounded">
                              {session.escale}
                            </span>
                          </div>

                          <div className="font-bold text-[8.5px] truncate mt-0.5 leading-tight text-white/95">
                            {session.moduleName}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Empty cell hover indicator */}
                  {slotSessions.length === 0 && !isReadOnly && (
                    <div 
                      onClick={() => handleDayClick(slot.dateStr)}
                      className="flex-1 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md">
                        + Ajouter session
                      </span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Calendar Footer Legend */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
              <span>Couleurs par Escale :</span>
              {ESCALES.map(esc => {
                const style = getSolidEscaleClass(esc);
                return (
                  <span key={esc} className={`inline-flex items-center gap-1 ${style.bg} text-white px-1.5 py-0.5 rounded text-[10px] font-bold`}>
                    {esc}
                  </span>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Cliquez sur un jour pour ouvrir le formulaire d'inscription pop-up.
            </div>
          </div>

        </div>

        {/* RIGHT PANEL (1/3) - Session Detail Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col sticky top-6">
          
          {selectedSession ? (
            <div className="divide-y divide-slate-150">
              
              {/* Header */}
              <div className="p-5 bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono font-black text-xs text-white bg-slate-900 px-2.5 py-1 rounded-lg shadow-xs">
                        {selectedSession.numSession}
                      </span>
                      {(() => {
                        const style = getSolidEscaleClass(selectedSession.escale);
                        return (
                          <span className={`${style.bg} ${style.text} text-xs font-bold px-2 py-0.5 rounded-lg`}>
                            Escale {selectedSession.escale}
                          </span>
                        );
                      })()}
                      <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-lg">
                        {selectedSession.service}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                      {selectedSession.moduleName}
                    </h3>
                  </div>

                  {/* Action Buttons (Émargement PDF, Action de masse, Modifier, Supprimer) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    
                    {/* Émargement PDF (Icon-only Button) */}
                    <button
                      onClick={handleExportEmargementPdf}
                      disabled={isExportingEmargementPdf}
                      className="p-2 bg-blue-50 hover:bg-[#0062FF] text-[#0062FF] hover:text-white border border-blue-200 hover:border-[#0062FF] rounded-xl transition-all cursor-pointer shadow-2xs group flex items-center justify-center disabled:opacity-60 disabled:cursor-wait"
                      title="Générer et télécharger la feuille d'émargement PDF (format paysage)"
                      id="session-export-pdf-btn"
                    >
                      {isExportingEmargementPdf ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Printer className="h-4 w-4 stroke-[2.2]" />
                      )}
                    </button>

                    {!isReadOnly && (
                      <>
                        {/* 1. Upgrade / Action de masse (Verte) */}
                        <button
                          onClick={() => handleOpenBulkModal(selectedSession)}
                          className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-xl transition-all cursor-pointer shadow-2xs group flex items-center gap-1"
                          title="Action de masse (Saisie groupée des résultats, consignes & docs)"
                        >
                          <Zap className="h-4 w-4 fill-current stroke-[2.2]" />
                        </button>

                        {/* 2. Modifier (Violette) */}
                        <button
                          onClick={() => {
                            if (selectedSession.logs.length > 0) {
                              onEditLog ? onEditLog(selectedSession.logs[0]) : onOpenEnrollmentOnDate(selectedSession.dateDebut, selectedSession.numSession);
                            } else {
                              onOpenEnrollmentOnDate(selectedSession.dateDebut, selectedSession.numSession);
                            }
                          }}
                          className="p-2 bg-purple-50 hover:bg-purple-600 text-purple-600 hover:text-white border border-purple-200 hover:border-purple-600 rounded-xl transition-all cursor-pointer shadow-2xs group flex items-center gap-1"
                          title="Modifier la session (Ouvrir le formulaire d'inscription)"
                        >
                          <Pencil className="h-4 w-4 stroke-[2.2]" />
                        </button>

                        {/* 3. Supprimer (Rouge) */}
                        <button
                          onClick={() => setIsDeleteModalOpen(true)}
                          className="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 rounded-xl transition-all cursor-pointer shadow-2xs group flex items-center gap-1"
                          title="Supprimer la session définitivement"
                        >
                          <Trash2 className="h-4 w-4 stroke-[2.2]" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Session Meta Specs */}
              <div className="p-5 space-y-3.5 text-xs">
                
                {/* Grid 2 Cols */}
                <div className="grid grid-cols-2 gap-3">
                  
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cycle</span>
                    <span className="font-extrabold text-slate-800 text-xs">{selectedSession.cycle}</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Type</span>
                    <span className="font-extrabold text-slate-800 text-xs">{selectedSession.type}</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Formateur</span>
                    <span className="font-bold text-slate-800 text-xs truncate block">{selectedSession.formateur}</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID Formateur</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">{selectedSession.idFormateur || 'N/A'}</span>
                  </div>

                </div>

                {/* Dates & Lieu */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <CalendarIcon className="h-4 w-4 text-[#06b6d4] shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Dates de formation</span>
                      <span className="font-bold text-slate-900 text-xs">
                        Du {formatDateFR(selectedSession.dateDebut)} au {formatDateFR(selectedSession.dateFin)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700 pt-1 border-t border-slate-200/60">
                    <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Lieu / Salle</span>
                      <span className="font-semibold text-slate-800 text-xs truncate block">
                        {selectedSession.lieu}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Horaires & Durée */}
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>Horaires de Session</span>
                    </div>
                    <span className="bg-blue-600 text-white font-extrabold text-xs px-2 py-0.5 rounded-md">
                      {selectedSession.durationHours} h
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-600 space-y-0.5 pl-5">
                    {selectedSession.heureDebut1 && (
                      <div>Session 1 : {selectedSession.heureDebut1} - {selectedSession.heureFin1}</div>
                    )}
                    {selectedSession.heureDebut2 && (
                      <div>Session 2 : {selectedSession.heureDebut2} - {selectedSession.heureFin2}</div>
                    )}
                    {!selectedSession.heureDebut1 && !selectedSession.heureDebut2 && (
                      <div className="text-slate-400 italic">08:00 - 12:00</div>
                    )}
                  </div>
                </div>

                {/* Tracking Badges (MAD EA, CTT HBO, CONVOC) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Suivi & Options</span>
                  <div className="grid grid-cols-3 gap-2">
                    
                    {/* MAD EA */}
                    <div className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-between ${
                      selectedSession.madEa 
                        ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-2xs' 
                        : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}>
                      <span>MAD EA</span>
                      {selectedSession.madEa ? (
                        <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-300 shrink-0" />
                      )}
                    </div>

                    {/* CTT HBO */}
                    <div className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-between ${
                      selectedSession.cttHbo 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-2xs' 
                        : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}>
                      <span>CTT HBO</span>
                      {selectedSession.cttHbo ? (
                        <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-300 shrink-0" />
                      )}
                    </div>

                    {/* CONVOC */}
                    <div className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-between ${
                      selectedSession.convoc 
                        ? 'bg-violet-50 border-violet-200 text-violet-900 shadow-2xs' 
                        : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}>
                      <span>CONVOC</span>
                      {selectedSession.convoc ? (
                        <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-300 shrink-0" />
                      )}
                    </div>

                  </div>
                </div>

                {/* Document d'Émargement Section */}
                {(() => {
                  const sessionEmrgFileUrl = selectedSession.emrgFileUrl || selectedSession.logs.find(l => l.emrgFileUrl)?.emrgFileUrl;
                  const sessionEmrgFileName = selectedSession.emrgFileName || selectedSession.logs.find(l => l.emrgFileName)?.emrgFileName || "Document_Emargement.pdf";

                  return (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Document de Session
                      </span>
                      {sessionEmrgFileUrl ? (
                        <div className="bg-sky-50/90 border border-sky-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 shadow-2xs">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h5 className="font-extrabold text-slate-900 text-xs truncate">
                                  Document d'émargement (PDF)
                                </h5>
                                <span className="bg-sky-200/80 text-sky-900 text-[9px] font-black px-1.5 py-0.2 rounded uppercase shrink-0">
                                  PDF
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                                {sessionEmrgFileName}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenPdfPreview(sessionEmrgFileUrl, sessionEmrgFileName)}
                              className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Consulter le document PDF"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Consulter</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => panelFileInputRef.current?.click()}
                              className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-100 rounded-lg transition-all cursor-pointer"
                              title="Remplacer le PDF"
                            >
                              <Upload className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedSession && onBulkUpdateLogs) {
                                  const updates = selectedSession.logs.map(log => ({
                                    id: log.id,
                                    changes: {
                                      emrgFileUrl: undefined,
                                      emrgFileName: undefined,
                                      emrg: false
                                    }
                                  }));
                                  onBulkUpdateLogs(updates);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Retirer le document PDF"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/80 border border-dashed border-slate-200 rounded-xl p-3 text-center space-y-2">
                          <p className="text-xs text-slate-500 font-medium">
                            Aucun document d'émargement PDF joint à cette session.
                          </p>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => panelFileInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-sky-500 text-slate-700 hover:text-sky-700 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            >
                              <Upload className="h-3.5 w-3.5 text-sky-600" />
                              <span>Joindre un PDF d'émargement</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>

              {/* Participants List */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-700" />
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                      Participants Inscrits ({selectedSession.logs.length})
                    </h4>
                  </div>

                  {!isReadOnly && (
                    <button
                      onClick={() => onOpenEnrollmentOnDate(selectedSession.dateDebut, selectedSession.numSession)}
                      className="text-[11px] text-[#0062FF] hover:underline font-bold cursor-pointer"
                    >
                      + Ajouter agent
                    </button>
                  )}
                </div>

                {/* Table of Participants */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2 px-2.5">Matricule</th>
                        <th className="py-2 px-2.5">Agent</th>
                        <th className="py-2 px-2.5">Escale</th>
                        <th className="py-2 px-2.5">Service</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {selectedSession.logs.map((log) => {
                        const collab = collaborators.find(c => c.id === log.collaboratorId);
                        const matricule = collab?.matricule || 'N/A';
                        const escaleStyle = getEscaleStyle(log.escale);

                        return (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-2.5 font-mono text-[10px] font-bold text-slate-600">
                              {matricule}
                            </td>
                            <td className="py-2 px-2.5 font-bold text-slate-900">
                              {log.collaboratorName}
                            </td>
                            <td className="py-2 px-2.5">
                              <span className={`${escaleStyle.bg} ${escaleStyle.text} text-[10px] font-bold px-1.5 py-0.5 rounded border ${escaleStyle.border}`}>
                                {log.escale}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-[10px] font-semibold text-slate-600">
                              {log.service}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          ) : (
            /* Empty State */
            <div className="p-8 text-center space-y-3 my-auto">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Aucune session sélectionnée</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Sélectionnez une session dans le calendrier pour afficher ses détails ou cliquez sur un jour pour ouvrir le formulaire d'inscription.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* POPUP 1: DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-150 animate-scale-up">
            
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-start gap-4">
              <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-sm shrink-0">
                <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-rose-950">
                  Supprimer la session définitivement ?
                </h3>
                <p className="text-xs font-mono font-bold text-rose-700 mt-0.5">
                  Code session : {selectedSession.numSession}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600">
              <p className="leading-relaxed">
                Voulez-vous vraiment supprimer définitivement la session <strong className="text-slate-900">{selectedSession.moduleName}</strong> du <strong className="text-slate-900">{formatDateFR(selectedSession.dateDebut)}</strong> ?
              </p>

              <div className="bg-rose-50/50 border border-rose-200/80 rounded-xl p-3 text-rose-900 space-y-1 text-[11px]">
                <div className="font-bold flex items-center gap-1 text-rose-800">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Impact sur l'ensemble de l'application :</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-rose-700 font-medium">
                  <li>Suppression de <strong>{selectedSession.logs.length} participant(s)</strong></li>
                  <li>Disparition du Suivi Général et des Dossiers Intérimaires</li>
                  <li>Annulation des données de Paye et de Facturation associées</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDeleteSession}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>Supprimer définitivement</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* POPUP 2: UPGRADE / BULK EDIT MODAL (ACTION DE MASSE) */}
      {isBulkModalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Zap className="h-6 w-6 stroke-[2.2] fill-current" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black tracking-tight">Action de Masse - Session {selectedSession.numSession}</h3>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {bulkItems.length} participant(s)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {selectedSession.moduleName} • Escale {selectedSession.escale} • Du {formatDateFR(selectedSession.dateDebut)} au {formatDateFR(selectedSession.dateFin)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body with Scroll */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              
              {/* En-tête de modification de masse (Global Commands Bar) */}
              <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-xs uppercase tracking-wider">
                  <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                  <span>Commandes Globales (Appliquer en 1 clic à TOUS les participants)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  
                  {/* Global Resultat */}
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200/80 space-y-1.5 shadow-2xs">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Résultat Global</label>
                    <div className="flex gap-1">
                      <select
                        value={globalResultat}
                        onChange={(e) => setGlobalResultat(e.target.value)}
                        className="w-full py-1 px-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="Réussite">Réussite</option>
                        <option value="En cours">En cours</option>
                        <option value="Echouée">Échouée</option>
                        <option value="Absent">Absent</option>
                        <option value="Annulée">Annulée</option>
                        <option value="Rattrapage">Rattrapage</option>
                        <option value="A traiter">À traiter</option>
                      </select>
                      <button
                        onClick={applyBulkResultatToAll}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>

                  {/* Global Consigne */}
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200/80 space-y-1.5 shadow-2xs">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Consigne Paye Globale</label>
                    <div className="flex gap-1">
                      <select
                        value={globalConsigne}
                        onChange={(e) => setGlobalConsigne(e.target.value)}
                        className="w-full py-1 px-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="A payer">À payer</option>
                        <option value="A traiter">À traiter</option>
                        <option value="Facturation client">Facturation client</option>
                        <option value="A relancer">À relancer</option>
                        <option value="Paye OK">Paye OK</option>
                        <option value="Ne pas payer">Ne pas payer</option>
                        <option value="N/A">N/A</option>
                      </select>
                      <button
                        onClick={applyBulkConsigneToAll}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>

                  {/* Global Suivis (MAD, CTT, CONVOC) with Toggle Mode */}
                  {(() => {
                    const allMad = bulkItems.length > 0 && bulkItems.every(i => i.madEa);
                    const allCtt = bulkItems.length > 0 && bulkItems.every(i => i.cttHbo);
                    const allConvoc = bulkItems.length > 0 && bulkItems.every(i => i.convoc);
                    const allEmrg = bulkItems.length > 0 && bulkItems.every(i => i.emrg);
                    const allAttest = bulkItems.length > 0 && bulkItems.every(i => i.attest);

                    return (
                      <>
                        <div className="bg-white p-2.5 rounded-xl border border-emerald-200/80 space-y-1.5 shadow-2xs">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Suivis Globaux (Toggle)</label>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={toggleAllMadEa}
                              className={`px-2 py-1 border text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                                allMad
                                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border-blue-200'
                              }`}
                              title="Toggle MAD EA"
                            >
                              {allMad ? '✓ MAD EA' : '+ MAD EA'}
                            </button>
                            <button
                              type="button"
                              onClick={toggleAllCttHbo}
                              className={`px-2 py-1 border text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                                allCtt
                                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border-indigo-200'
                              }`}
                              title="Toggle CTT HBO"
                            >
                              {allCtt ? '✓ CTT HBO' : '+ CTT HBO'}
                            </button>
                            <button
                              type="button"
                              onClick={toggleAllConvoc}
                              className={`px-2 py-1 border text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                                allConvoc
                                  ? 'bg-violet-600 text-white border-violet-700 shadow-xs'
                                  : 'bg-violet-50 text-violet-800 hover:bg-violet-100 border-violet-200'
                              }`}
                              title="Toggle CONVOC"
                            >
                              {allConvoc ? '✓ CONVOC' : '+ CONVOC'}
                            </button>
                          </div>
                        </div>

                        {/* Global Docs (EMRG, ATTEST) with Toggle Mode */}
                        <div className="bg-white p-2.5 rounded-xl border border-emerald-200/80 space-y-1.5 shadow-2xs">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Documents Globaux (Toggle)</label>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEmrgDialogState({ isOpen: true, targetIndex: 'ALL' })}
                              className={`flex-1 py-1 border text-[10px] font-extrabold rounded-md cursor-pointer text-center transition-all ${
                                allEmrg
                                  ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                                  : 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200'
                              }`}
                              title="Joindre / Valider Émargement (Global)"
                            >
                              {allEmrg ? '✓ EMRG' : '+ EMRG'}
                            </button>
                            <button
                              type="button"
                              onClick={toggleAllAttest}
                              className={`flex-1 py-1 border text-[10px] font-extrabold rounded-md cursor-pointer text-center transition-all ${
                                allAttest
                                  ? 'bg-pink-600 text-white border-pink-700 shadow-xs'
                                  : 'bg-pink-100 text-pink-900 border-pink-300 hover:bg-pink-200'
                              }`}
                              title="Toggle ATTEST"
                            >
                              {allAttest ? '✓ ATTEST' : '+ ATTEST'}
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                </div>
              </div>

              {/* Table of Participants (5 Columns) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-4 w-1/4">1. Intérimaire</th>
                        <th className="py-3 px-3 text-center w-1/5">2. Suivi (MAD / CTT / CONV)</th>
                        <th className="py-3 px-3 text-center w-1/5">3. Résultat</th>
                        <th className="py-3 px-3 text-center w-1/5">4. Consigne</th>
                        <th className="py-3 px-3 text-center w-1/6">5. Docs (EMRG / ATTEST)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {bulkItems.map((item, idx) => {
                        const escaleStyle = getEscaleStyle(item.escale);

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            
                            {/* 1. Intérimaire */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                  {item.collaboratorName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-extrabold text-slate-900 truncate">
                                    {item.collaboratorName}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                                    <span>Mat: {item.matricule}</span>
                                    <span className={`${escaleStyle.bg} ${escaleStyle.text} text-[9px] font-bold px-1 rounded`}>
                                      {item.escale}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 2. Suivi MAD / CTT / CONV */}
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                
                                {/* MAD EA */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBulkItems(prev => prev.map((it, i) => i === idx ? { ...it, madEa: !it.madEa } : it));
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                    item.madEa 
                                      ? 'bg-blue-600 text-white border-blue-700 shadow-2xs' 
                                      : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  MAD EA
                                </button>

                                {/* CTT HBO */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBulkItems(prev => prev.map((it, i) => i === idx ? { ...it, cttHbo: !it.cttHbo } : it));
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                    item.cttHbo 
                                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs' 
                                      : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  CTT HBO
                                </button>

                                {/* CONVOC */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBulkItems(prev => prev.map((it, i) => i === idx ? { ...it, convoc: !it.convoc } : it));
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                    item.convoc 
                                      ? 'bg-violet-600 text-white border-violet-700 shadow-2xs' 
                                      : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  CONVOC
                                </button>

                              </div>
                            </td>

                            {/* 3. Résultat */}
                            <td className="py-3 px-3 text-center">
                              <select
                                value={item.resultat}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkItems(prev => prev.map((it, i) => i === idx ? { ...it, resultat: val } : it));
                                }}
                                className={`py-1.5 px-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                                  item.resultat === 'Réussite' ? 'bg-emerald-600 text-white border-emerald-700' :
                                  item.resultat === 'Echouée' ? 'bg-rose-600 text-white border-rose-700' :
                                  item.resultat === 'Absent' ? 'bg-orange-500 text-white border-orange-600' :
                                  item.resultat === 'Annulée' ? 'bg-slate-600 text-white border-slate-700' :
                                  item.resultat === 'A traiter' ? 'bg-amber-500 text-white border-amber-600' :
                                  'bg-blue-600 text-white border-blue-700'
                                }`}
                              >
                                <option value="Réussite" className="bg-white text-emerald-900 font-bold">Réussite</option>
                                <option value="En cours" className="bg-white text-blue-900 font-bold">En cours</option>
                                <option value="Echouée" className="bg-white text-rose-900 font-bold">Échouée</option>
                                <option value="Absent" className="bg-white text-orange-900 font-bold">Absent</option>
                                <option value="Annulée" className="bg-white text-slate-800 font-bold">Annulée</option>
                                <option value="Rattrapage" className="bg-white text-amber-900 font-bold">Rattrapage</option>
                                <option value="A traiter" className="bg-white text-amber-900 font-bold">À traiter</option>
                              </select>
                            </td>

                            {/* 4. Consigne */}
                            <td className="py-3 px-3 text-center">
                              <select
                                value={item.consigne}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkItems(prev => prev.map((it, i) => i === idx ? { ...it, consigne: val } : it));
                                }}
                                className={`py-1.5 px-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                                  item.consigne === 'A payer' ? 'bg-purple-600 text-white border-purple-700' :
                                  item.consigne === 'A traiter' ? 'bg-amber-500 text-white border-amber-600' :
                                  item.consigne === 'Paye OK' ? 'bg-emerald-600 text-white border-emerald-700' :
                                  item.consigne === 'Facturation client' ? 'bg-orange-500 text-white border-orange-600' :
                                  item.consigne === 'A relancer' ? 'bg-rose-600 text-white border-rose-700' :
                                  'bg-slate-600 text-white border-slate-700'
                                }`}
                              >
                                <option value="A payer" className="bg-white text-purple-900 font-bold">À payer</option>
                                <option value="A traiter" className="bg-white text-amber-900 font-bold">À traiter</option>
                                <option value="Facturation client" className="bg-white text-orange-900 font-bold">Facturation client</option>
                                <option value="A relancer" className="bg-white text-rose-900 font-bold">À relancer</option>
                                <option value="Paye OK" className="bg-white text-emerald-900 font-bold">Paye OK</option>
                                <option value="Ne pas payer" className="bg-white text-slate-800 font-bold">Ne pas payer</option>
                              </select>
                            </td>

                            {/* 5. Docs (EMRG - Bleu ciel clair, ATTEST - Rose) */}
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                
                                {/* EMRG (Émargement - Bleu ciel) */}
                                <button
                                  type="button"
                                  onClick={() => setEmrgDialogState({ isOpen: true, targetIndex: idx })}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                                    item.emrg 
                                      ? 'bg-sky-100 text-sky-950 border-sky-400 shadow-2xs ring-1 ring-sky-300' 
                                      : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                                  }`}
                                  title="Document d'Émargement"
                                >
                                  {item.emrg && <Check className="h-3.5 w-3.5 text-sky-700 stroke-[3]" />}
                                  <span>EMRG</span>
                                </button>

                                {/* ATTEST (Attestation - Rose) */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBulkItems(prev => prev.map((it, i) => i === idx ? { ...it, attest: !it.attest } : it));
                                  }}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                                    item.attest 
                                      ? 'bg-pink-100 text-pink-950 border-pink-400 shadow-2xs ring-1 ring-pink-300' 
                                      : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                                  }`}
                                  title="Attestation de Formation"
                                >
                                  {item.attest && <Check className="h-3.5 w-3.5 text-pink-700 stroke-[3]" />}
                                  <span>ATTEST</span>
                                </button>

                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Toutes les modifications seront immédiatement synchronisées sur l'ensemble de l'application.
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveBulkChanges}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Enregistrer & Synchroniser</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Hidden PDF File Input (Bulk Dialog) */}
      <input
        type="file"
        ref={fileInputRef}
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const targetIdx = emrgDialogState?.targetIndex ?? 'ALL';
          setEmrgDialogState(null);
          
          if (file) {
            processPdfFile(file, (dataUrl, fileName) => {
              if (targetIdx === 'ALL') {
                setBulkItems(prev => prev.map(item => ({
                  ...item,
                  emrg: true,
                  emrgFileUrl: dataUrl,
                  emrgFileName: fileName
                })));
              } else if (typeof targetIdx === 'number') {
                setBulkItems(prev => prev.map((item, i) => i === targetIdx ? {
                  ...item,
                  emrg: true,
                  emrgFileUrl: dataUrl,
                  emrgFileName: fileName
                } : item));
              }
            });
          }
          if (e.target) e.target.value = '';
        }}
      />

      {/* Hidden PDF File Input (Panel Direct Upload) */}
      <input
        type="file"
        ref={panelFileInputRef}
        accept="application/pdf"
        className="hidden"
        onChange={handlePanelFileUpload}
      />

      {/* PDF Preview Modal */}
      {pdfPreviewState?.isOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-scale-in">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm truncate">
                    {pdfPreviewState.fileName || "Document d'émargement (PDF)"}
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Aperçu du document PDF
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPdfInNewTab(pdfPreviewState.url)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Ouvrir dans un nouvel onglet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPdfPreviewState(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-2 overflow-hidden flex flex-col items-center justify-center">
              {pdfPreviewState.url ? (
                <iframe
                  src={pdfPreviewState.url}
                  title="Aperçu PDF"
                  className="w-full h-full rounded-xl border border-slate-200 shadow-inner bg-white"
                />
              ) : (
                <div className="text-center p-6 text-slate-500 text-xs">
                  Impossible d'afficher le document PDF.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EMRG Attachment Confirmation Modal */}
      {emrgDialogState?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                  Émargement de session (EMRG)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEmrgDialogState(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-center py-2 space-y-2">
              <p className="text-slate-800 font-bold text-base">
                Souhaitez-vous joindre le fichier d'émargement PDF ?
              </p>
              <p className="text-slate-500 text-xs">
                {emrgDialogState.targetIndex === 'ALL'
                  ? 'Cette action s’appliquera à TOUS les participants de la session.'
                  : `Participant : ${bulkItems[emrgDialogState.targetIndex as number]?.collaboratorName || ''}`}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Upload className="h-4 w-4" />
                <span>Oui / Joindre un PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (emrgDialogState.targetIndex === 'ALL') {
                    setBulkItems(prev => prev.map(item => ({ ...item, emrg: true })));
                  } else if (typeof emrgDialogState.targetIndex === 'number') {
                    const idx = emrgDialogState.targetIndex;
                    setBulkItems(prev => prev.map((item, i) => i === idx ? { ...item, emrg: true } : item));
                  }
                  setEmrgDialogState(null);
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4 text-emerald-600 stroke-[3]" />
                <span>Non / Valider sans fichier</span>
              </button>

              {((emrgDialogState.targetIndex === 'ALL' && bulkItems.every(i => i.emrg)) ||
                (typeof emrgDialogState.targetIndex === 'number' && bulkItems[emrgDialogState.targetIndex]?.emrg)) && (
                <button
                  type="button"
                  onClick={() => {
                    if (emrgDialogState.targetIndex === 'ALL') {
                      setBulkItems(prev => prev.map(item => ({ ...item, emrg: false })));
                    } else if (typeof emrgDialogState.targetIndex === 'number') {
                      const idx = emrgDialogState.targetIndex;
                      setBulkItems(prev => prev.map((item, i) => i === idx ? { ...item, emrg: false } : item));
                    }
                    setEmrgDialogState(null);
                  }}
                  className="w-full py-2 text-rose-600 hover:text-rose-700 font-semibold text-xs transition-all cursor-pointer text-center mt-1"
                >
                  Désactiver l'émargement (Retirer EMRG)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Printable Container for Landscape A4 Émargement PDF */}
      {selectedSession && (
        <div 
          id="emargement-pdf-export-container"
          className="fixed top-0 left-[-9999px] w-[1120px] bg-white text-slate-900 p-6 font-sans border border-slate-200"
          style={{ minHeight: '792px', maxHeight: '792px', boxSizing: 'border-box' }}
        >
          {/* 1. Header with Logo & Title */}
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-4">
              {customLogo ? (
                <img 
                  src={customLogo} 
                  alt="Logo Hubjob" 
                  className="h-12 max-w-[200px] object-contain"
                />
              ) : (
                <div className="bg-[#082C66] text-[#ffde59] px-3.5 py-1.5 rounded-lg font-black text-lg tracking-wider">
                  HUBJOB
                </div>
              )}
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                  Émargement de Formation
                </h1>
              </div>
            </div>
            <div className="text-right border-l-2 border-slate-300 pl-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Session Ref</span>
              <span className="font-mono text-sm font-bold text-slate-900 block mt-0.5">
                {selectedSession.numSession}
                {(() => {
                  const mod = modulesCatalog.find(m => m.name === selectedSession.moduleName);
                  return mod?.code ? ` — ${mod.code}` : '';
                })()}
              </span>
            </div>
          </div>

          {/* 2. Session Summary Grid */}
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 mb-3 text-xs">
            <div className="grid grid-cols-4 gap-x-4 gap-y-2.5">
              <div>
                <span className="font-semibold text-slate-500 text-[10px] uppercase block mb-0.5">N° de Session :</span>
                <span className="font-bold text-slate-900 font-mono text-xs whitespace-normal break-words block">{selectedSession.numSession}</span>
              </div>
              <div className="col-span-2">
                <span className="font-semibold text-slate-500 text-[10px] uppercase block mb-0.5">Module :</span>
                <span className="font-bold text-slate-900 text-xs whitespace-normal break-words block">{selectedSession.moduleName}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 text-[10px] uppercase block mb-0.5">Cycle / Type :</span>
                <span className="font-bold text-slate-900 text-xs whitespace-normal break-words block">{selectedSession.cycle} — {selectedSession.type}</span>
              </div>

              <div>
                <span className="font-semibold text-slate-500 text-[10px] uppercase block mb-0.5">Date(s) :</span>
                <span className="font-bold text-slate-900 text-xs whitespace-normal break-words block">
                  {selectedSession.dateDebut === selectedSession.dateFin 
                    ? formatDateFR(selectedSession.dateDebut) 
                    : `Du ${formatDateFR(selectedSession.dateDebut)} au ${formatDateFR(selectedSession.dateFin)}`
                  }
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 text-[10px] uppercase block mb-0.5">Horaires :</span>
                <span className="font-mono font-bold text-slate-900 text-xs whitespace-normal break-words block">
                  {selectedSession.heureDebut1 ? `${selectedSession.heureDebut1} - ${selectedSession.heureFin1}` : '08:00 - 12:00'}
                  {selectedSession.heureDebut2 ? ` / ${selectedSession.heureDebut2} - ${selectedSession.heureFin2}` : ''}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 text-[10px] uppercase block mb-0.5">Durée globale :</span>
                <span className="font-bold text-slate-900 text-xs whitespace-normal break-words block">{selectedSession.durationHours} Heures</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 text-[10px] uppercase block mb-0.5">Formateur :</span>
                <span className="font-bold text-slate-900 text-xs whitespace-normal break-words block">{selectedSession.formateur}</span>
              </div>

              <div>
                <span className="font-semibold text-slate-500 text-[10px] uppercase block mb-0.5">ID Formateur :</span>
                <span className="font-mono font-bold text-slate-900 text-xs whitespace-normal break-words block">{selectedSession.idFormateur || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 text-[10px] uppercase block mb-0.5">Escale & Service :</span>
                <span className="font-bold text-slate-900 text-xs whitespace-normal break-words block">{selectedSession.escale} ({selectedSession.service})</span>
              </div>
              <div className="col-span-2">
                <span className="font-semibold text-slate-500 text-[10px] uppercase block mb-0.5">Lieu / Salle :</span>
                <span className="font-bold text-slate-900 text-xs whitespace-normal break-words block">{selectedSession.lieu || 'Non spécifié'}</span>
              </div>
            </div>
          </div>

          {/* 3. Table of Enrolled Agents (12 Rows) */}
          <div className="mb-3">
            <table className="w-full text-left border-collapse border border-slate-400 text-xs">
              <thead>
                <tr className="bg-slate-800 text-white uppercase text-[10px] font-bold tracking-wider">
                  <th className="p-1.5 border border-slate-400 w-1/3">Nom & Prénom de l'Agent</th>
                  <th className="p-1.5 border border-slate-400 w-1/4 text-center">Signature Matin</th>
                  <th className="p-1.5 border border-slate-400 w-1/4 text-center">Signature Après-Midi</th>
                  <th className="p-1.5 border border-slate-400 text-center w-[70px]">Absence</th>
                  <th className="p-1.5 border border-slate-400 w-1/6">Note</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows = [...selectedSession.logs];
                  const filledRows = Array.from({ length: 12 }, (_, i) => rows[i] || null);
                  
                  return filledRows.map((log, index) => {
                    let agentMatricule = '';
                    if (log) {
                      const colab = collaborators.find(c => 
                        c.id === log.collaboratorId || 
                        `${c.lastName} ${c.firstName}`.toLowerCase() === log.collaboratorName?.toLowerCase() ||
                        `${c.firstName} ${c.lastName}`.toLowerCase() === log.collaboratorName?.toLowerCase()
                      );
                      agentMatricule = colab?.matricule || log.service || '';
                    }

                    return (
                      <tr key={log ? log.id : `empty-row-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="px-2 py-1 border border-slate-300 font-bold text-slate-900 h-7 text-xs">
                          {log ? (
                            <div className="flex items-center justify-between gap-2">
                              <span>{log.collaboratorName}</span>
                              {agentMatricule && (
                                <span className="text-[10px] font-mono text-slate-700 font-bold">({agentMatricule})</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 italic font-normal text-xs">•</span>
                          )}
                        </td>
                        <td className="p-1 border border-slate-300 h-7 text-center">
                          {/* Box Signature Matin */}
                        </td>
                        <td className="p-1 border border-slate-300 h-7 text-center">
                          {/* Box Signature Après-midi */}
                        </td>
                        <td className="p-1 border border-slate-300 text-center">
                          <div className="w-3.5 h-3.5 border border-slate-400 rounded-xs mx-auto"></div>
                        </td>
                        <td className="px-1.5 py-1 border border-slate-300 text-slate-600 text-[10px]">
                          {log?.notes ? log.notes : ''}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* 4. Formateur Signature Row Below Table */}
          <div className="border border-slate-400 bg-slate-100 py-2 px-3 rounded-md mb-3 flex items-center justify-between text-xs">
            <div className="font-extrabold text-slate-900 uppercase text-[11px] flex items-center gap-2">
              <span>Signature du Formateur :</span>
              <span className="font-bold text-slate-900">{selectedSession.formateur}</span>
              {selectedSession.idFormateur && (
                <span className="font-bold text-slate-600 font-mono text-[11px]">({selectedSession.idFormateur})</span>
              )}
            </div>
            <div className="flex items-center gap-6 pr-6">
              <div className="border border-slate-400 bg-white w-44 h-10 rounded flex items-end justify-center pb-1 text-[9px] text-slate-400 font-semibold">
                Visa & Signature Matin
              </div>
              <div className="border border-slate-400 bg-white w-44 h-10 rounded flex items-end justify-center pb-1 text-[9px] text-slate-400 font-semibold">
                Visa & Signature Après-midi
              </div>
            </div>
          </div>

          {/* 5. Free Comment Section */}
          <div className="border border-slate-300 rounded-md p-2.5 bg-white">
            <span className="font-bold text-slate-700 text-[10px] uppercase block mb-1">
              Commentaires libres / Observations du formateur :
            </span>
            <div className="h-10 border-b border-dashed border-slate-300 relative">
              <div className="absolute inset-0 flex flex-col justify-between opacity-30 pointer-events-none">
                <div className="border-b border-slate-200 w-full h-1/2"></div>
                <div className="border-b border-slate-200 w-full h-1/2"></div>
              </div>
            </div>
          </div>

          {/* 6. Footer Notice */}
          <div className="mt-2 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-700 font-bold">
            <span className="uppercase tracking-wider">HUBJOB</span>
            <span>
              {(() => {
                const now = new Date();
                const day = String(now.getDate()).padStart(2, '0');
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year = now.getFullYear();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                return `Édité le ${day}/${month}/${year} à ${hours}:${minutes}`;
              })()}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}

