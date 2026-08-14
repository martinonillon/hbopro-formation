import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Collaborator } from '../types';
import { UploadedFilesState } from '../components/RHFolderGenerator';

export interface ProcessedRhFile {
  id: string;
  cardId: string;
  title: string;
  exportCode: string;
  filename: string;
  blob: Blob;
  url: string;
  size: number;
  type: 'pdf' | 'jpg';
  pageCount?: number;
  dimensions?: string;
  sourceFilesCount: number;
}

export interface ProcessingProgress {
  step: string;
  percentage: number;
  currentCardTitle?: string;
}

/**
 * Default Export Codes for RH Folder Cards
 */
export const DEFAULT_EXPORT_CODES: Record<string, string> = {
  fiche_renseignement: 'ADMHBO',
  cv: 'CV',
  identite: 'CNI',
  titre_sejour: 'TS',
  carte_vitale: 'VITALE',
  permis_b: 'PERMISB',
  carte_grise: 'CARTEGRISE',
  justificatif_domicile: 'JUSTIFDOM',
  rib: 'RIB',
  casier_b3: 'CASIERB3',
  casier_etranger: 'CASIERETR',
  photo_pla: 'PHOTOPLA',
  photo_phi: 'PHI'
};

/**
 * Strict file naming rule:
 * [CODE_EXPORT]_[MATRICULE] [NOM] [PRENOM]_[ESCALE].[ext]
 * Example: ADMHBO_100245 DUPONT JEAN_TLS.pdf
 */
export function buildExportFilename(
  code: string,
  matricule?: string,
  lastName?: string,
  firstName?: string,
  escale?: string,
  ext: 'pdf' | 'jpg' = 'pdf'
): string {
  const m = (matricule || '').trim().toUpperCase();
  const n = (lastName || '').trim().toUpperCase();
  const p = (firstName || '').trim().toUpperCase();
  const e = (escale || 'HUB').trim().toUpperCase();

  // Combine [MATRICULE] [NOM] [PRENOM]
  const middleParts = [m, n, p].filter(Boolean).join(' ');
  const safeCode = (code || 'DOC').trim().toUpperCase();

  return `${safeCode}_${middleParts}_${e}.${ext}`;
}

/**
 * Clean & Format ZIP filename rule:
 * DOSSIER_RH_[MATRICULE]_[NOM]_[PRENOM].zip
 */
export function buildZipFilename(
  matricule?: string,
  lastName?: string,
  firstName?: string
): string {
  const m = (matricule || '').trim().toUpperCase().replace(/\s+/g, '_');
  const n = (lastName || '').trim().toUpperCase().replace(/\s+/g, '_');
  const p = (firstName || '').trim().toUpperCase().replace(/\s+/g, '_');

  const parts = [m, n, p].filter(Boolean);
  const suffix = parts.length > 0 ? parts.join('_') : 'EXPORT';
  return `DOSSIER_RH_${suffix}.zip`;
}

/**
 * Helper to convert any image File / Blob to high-quality JPEG Uint8Array via Canvas
 */
export async function imageFileToJpegBytes(file: File | Blob): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error('Failed to generate image blob'));
            return;
          }
          const buffer = await blob.arrayBuffer();
          resolve({
            bytes: new Uint8Array(buffer),
            width: img.width,
            height: img.height
          });
        },
        'image/jpeg',
        0.95
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for PDF embedding'));
    };

    img.src = objectUrl;
  });
}

/**
 * Resize image specifically for Photo cards:
 * 1. PHOTOPLA: 450 x 600 px (3:4 ratio)
 * 2. PHI: 119 x 159 px (approx 3:4 badge size)
 */
export async function resizePhotoToJpgBlob(
  file: File,
  targetWidth: number,
  targetHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // White background fallback
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Crop & Cover to fill target aspect ratio seamlessly
      const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
      const scaledW = img.width * scale;
      const scaledH = img.height * scale;
      const offsetX = (targetWidth - scaledW) / 2;
      const offsetY = (targetHeight - scaledH) / 2;

      ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas export to JPG failed'));
          }
        },
        'image/jpeg',
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load photo source file'));
    };

    img.src = objectUrl;
  });
}

/**
 * Converts multiple or single uploaded files into a unified standard PDF
 */
export async function mergeFilesToPdf(files: File[]): Promise<{ blob: Blob; pageCount: number }> {
  const mergedPdf = await PDFDocument.create();
  let totalPages = 0;

  for (const file of files) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(file.name);

    if (isPdf) {
      const arrayBuffer = await file.arrayBuffer();
      try {
        const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const indices = srcPdf.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(srcPdf, indices);
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
          totalPages++;
        });
      } catch (err) {
        console.warn(`Could not parse PDF ${file.name}, trying fallback`, err);
      }
    } else if (isImage) {
      try {
        const { bytes, width: imgW, height: imgH } = await imageFileToJpegBytes(file);
        const embeddedImg = await mergedPdf.embedJpg(bytes);

        // Standard A4 dimensions in points (72 DPI): 595.28 x 841.89
        const a4Width = 595.28;
        const a4Height = 841.89;

        const isLandscape = imgW > imgH;
        const pageWidth = isLandscape ? a4Height : a4Width;
        const pageHeight = isLandscape ? a4Width : a4Height;

        const page = mergedPdf.addPage([pageWidth, pageHeight]);
        totalPages++;

        // Add 20pt margin
        const margin = 20;
        const maxW = pageWidth - margin * 2;
        const maxH = pageHeight - margin * 2;

        const scale = Math.min(maxW / imgW, maxH / imgH, 1);
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const drawX = (pageWidth - drawW) / 2;
        const drawY = (pageHeight - drawH) / 2;

        page.drawImage(embeddedImg, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH
        });
      } catch (err) {
        console.warn(`Could not embed image ${file.name}`, err);
      }
    } else {
      // Non-image / Non-PDF fallback: create a clean info page in the PDF
      const page = mergedPdf.addPage([595.28, 841.89]);
      totalPages++;
      page.drawText(`Document joint: ${file.name}\n(Taille: ${file.size} octets - Type: ${file.type || 'Fichier'})`, {
        x: 50,
        y: 750,
        size: 12
      });
    }
  }

  // If no pages were added, add an empty page
  if (totalPages === 0) {
    mergedPdf.addPage([595.28, 841.89]);
    totalPages = 1;
  }

  const pdfBytes = await mergedPdf.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return { blob, pageCount: totalPages };
}

/**
 * Full Dossier Processing Pipeline
 * Process all non-empty cards, skipping completely empty ones
 */
export async function processFullRhDossier(
  collaborator: Collaborator,
  uploadedFiles: UploadedFilesState,
  customCodes: Record<string, string> = {},
  onProgress?: (progress: ProcessingProgress) => void
): Promise<ProcessedRhFile[]> {
  const results: ProcessedRhFile[] = [];
  const exportCodes = { ...DEFAULT_EXPORT_CODES, ...customCodes };

  // Define card mappings & zone order
  const CARD_CONFIGS = [
    {
      id: 'fiche_renseignement',
      title: 'Fiche de renseignement',
      codeKey: 'fiche_renseignement',
      zones: ['fiche_renseignement_recto', 'fiche_renseignement_verso']
    },
    {
      id: 'cv',
      title: 'CV',
      codeKey: 'cv',
      zones: ['cv_complet']
    },
    {
      id: 'identite',
      title: 'Document d’identité',
      codeKey: 'identite',
      zones: ['identite_recto', 'identite_verso']
    },
    {
      id: 'titre_sejour',
      title: 'Titre de séjour',
      codeKey: 'titre_sejour',
      zones: ['titre_sejour_recto', 'titre_sejour_verso']
    },
    {
      id: 'carte_vitale',
      title: 'Carte vitale',
      codeKey: 'carte_vitale',
      zones: ['carte_vitale_complet']
    },
    {
      id: 'permis_b',
      title: 'Permis B',
      codeKey: 'permis_b',
      zones: ['permis_b_recto', 'permis_b_verso']
    },
    {
      id: 'carte_grise',
      title: 'Carte grise',
      codeKey: 'carte_grise',
      zones: ['carte_grise_recto', 'carte_grise_verso']
    },
    {
      id: 'justificatif_domicile',
      title: 'Justificatif de domicile',
      codeKey: 'justificatif_domicile',
      zones: ['justif_domicile_complet', 'justif_domicile_attestation', 'justif_domicile_id_logeur']
    },
    {
      id: 'rib',
      title: 'RIB',
      codeKey: 'rib',
      zones: ['rib_complet']
    },
    {
      id: 'casier_b3',
      title: 'Casier judiciaire B3',
      codeKey: 'casier_b3',
      zones: ['casier_b3_complet']
    },
    {
      id: 'casier_etranger',
      title: 'Casier judiciaire étranger',
      codeKey: 'casier_etranger',
      zones: ['casier_etranger_complet']
    }
  ];

  const totalSteps = CARD_CONFIGS.length + 1; // +1 for photo
  let stepIndex = 0;

  // Process the 11 Document Cards (skip cards with no files at all)
  for (const card of CARD_CONFIGS) {
    stepIndex++;
    const activeFiles: File[] = [];
    for (const zoneKey of card.zones) {
      const item = uploadedFiles[zoneKey];
      if (item?.file) {
        activeFiles.push(item.file);
      }
    }

    // Completely ignore empty cards
    if (activeFiles.length > 0) {
      onProgress?.({
        step: `Traitement ${card.title}`,
        percentage: Math.round((stepIndex / totalSteps) * 85),
        currentCardTitle: card.title
      });

      const exportCode = exportCodes[card.codeKey] || 'DOC';
      const filename = buildExportFilename(
        exportCode,
        collaborator.matricule,
        collaborator.lastName,
        collaborator.firstName,
        collaborator.escale,
        'pdf'
      );

      const { blob, pageCount } = await mergeFilesToPdf(activeFiles);
      const url = URL.createObjectURL(blob);

      results.push({
        id: `res_${card.id}`,
        cardId: card.id,
        title: card.title,
        exportCode,
        filename,
        blob,
        url,
        size: blob.size,
        type: 'pdf',
        pageCount,
        sourceFilesCount: activeFiles.length
      });
    }
  }

  // Process Card 12: Photo (Special 2 JPGs generated: PHOTOPLA 450x600 & PHI 119x159)
  const photoItem = uploadedFiles['photo_portrait'];
  if (photoItem?.file) {
    onProgress?.({
      step: 'Génération des formats photo (Planet & TCA)',
      percentage: 92,
      currentCardTitle: 'Photo'
    });

    // 1. Photo PLA (450 x 600)
    const codePLA = exportCodes['photo_pla'] || 'PHOTOPLA';
    const filenamePLA = buildExportFilename(
      codePLA,
      collaborator.matricule,
      collaborator.lastName,
      collaborator.firstName,
      collaborator.escale,
      'jpg'
    );
    const blobPLA = await resizePhotoToJpgBlob(photoItem.file, 450, 600);
    const urlPLA = URL.createObjectURL(blobPLA);

    results.push({
      id: 'res_photo_pla',
      cardId: 'photo',
      title: 'Photo Format Planet (450x600)',
      exportCode: codePLA,
      filename: filenamePLA,
      blob: blobPLA,
      url: urlPLA,
      size: blobPLA.size,
      type: 'jpg',
      dimensions: '450 × 600 px',
      sourceFilesCount: 1
    });

    // 2. Photo PHI / TCA (119 x 159)
    const codePHI = exportCodes['photo_phi'] || 'PHI';
    const filenamePHI = buildExportFilename(
      codePHI,
      collaborator.matricule,
      collaborator.lastName,
      collaborator.firstName,
      collaborator.escale,
      'jpg'
    );
    const blobPHI = await resizePhotoToJpgBlob(photoItem.file, 119, 159);
    const urlPHI = URL.createObjectURL(blobPHI);

    results.push({
      id: 'res_photo_phi',
      cardId: 'photo',
      title: 'Photo Format TCA / Badge (119x159)',
      exportCode: codePHI,
      filename: filenamePHI,
      blob: blobPHI,
      url: urlPHI,
      size: blobPHI.size,
      type: 'jpg',
      dimensions: '119 × 159 px',
      sourceFilesCount: 1
    });
  }

  onProgress?.({
    step: 'Création de l\'archive ZIP...',
    percentage: 98
  });

  return results;
}

/**
 * Generate a ZIP Archive containing all processed files
 * Named: DOSSIER_RH_[MATRICULE]_[NOM]_[PRENOM].zip
 */
export async function generateZipArchive(
  collaborator: Collaborator,
  processedFiles: ProcessedRhFile[]
): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip();

  for (const item of processedFiles) {
    zip.file(item.filename, item.blob);
  }

  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  const zipFilename = buildZipFilename(
    collaborator.matricule,
    collaborator.lastName,
    collaborator.firstName
  );

  return { blob: zipBlob, filename: zipFilename };
}

/**
 * Trigger immediate browser download of a Blob using file-saver with fallback
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  try {
    saveAs(blob, filename);
  } catch (err) {
    console.warn('file-saver download fallback', err);
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
