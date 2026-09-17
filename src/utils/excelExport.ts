import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { QualityReport, PhotoEvidenceCategory } from '../types/qualityReport';
import { generateInspectionWordDocument } from './wordExport';
import { generateOfficialSheetPdfBlob } from './officialSheetPdfExport';
import { getStoredPhotoSections, getSectionPhotoSlot } from './appConfigStore';

/**
 * Convierte cualquier URL (http, https, blob o dataUrl) a un Uint8Array o ArrayBuffer
 * para empaquetarlo de forma 100% confiable dentro del archivo ZIP.
 */
async function fetchPhotoAsUint8Array(url: string): Promise<Uint8Array | null> {
  if (!url) return null;

  try {
    // 1. Si es formato base64 data:image/...
    if (url.startsWith('data:image')) {
      const parts = url.split(',');
      if (parts.length > 1) {
        const binaryString = atob(parts[1]);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      }
    }

    // 2. Si es URL remota (Supabase Storage, CDN, Blob o ruta local)
    const response = await fetch(url, { mode: 'cors' });
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    }
  } catch (err) {
    console.warn('No se pudo convertir la imagen directamente a bytes:', url, err);
  }

  // 3. Fallback mediante un elemento Canvas si fetch CORS fue bloqueado
  try {
    return await new Promise<Uint8Array | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const parts = dataUrl.split(',');
          if (parts.length > 1) {
            const binaryString = atob(parts[1]);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            resolve(bytes);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch {
    return null;
  }
}

/**
 * Genera el libro Excel estructurado.
 * Se eliminaron las columnas 'Cliente' y 'Evidencia Fotográfica' por requerimiento explícito.
 */
export function generateQualityReportWorkbook(report: QualityReport): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Texto amigable de piezas inspeccionadas de acuerdo a tabla AQL
  const aqlSummary = `${report.sampleSizeInspected || report.sampleSizeRequired} pzas inspeccionadas de ${report.totalLotSize} totales (AQL ${report.aqlTarget}%, Nivel ${report.inspectionLevel || 'II'}, Letra ${report.codeLetter || '-'}, Ac: ${report.acLimit}, Re: ${report.reLimit})`;

  // =========================================================================
  // HOJA 1: RESUMEN EJECUTIVO (Sin 'Cliente' ni 'Evidencia Fotográfica')
  // =========================================================================
  const executiveHeaders = [
    'Pedido / Folio OT',
    'Folio Maquila',
    'Clave / SKU Armado',
    'Descripción del Producto',
    'Claves Componentes',
    'Piezas Inspeccionadas (Muestreo AQL)',
    'Lote Total (Pzas)',
    'Muestra Requerida',
    'Muestra Revisada',
    'Defectos Encontrados',
    'Dictamen Calidad',
    'Etiqueta Asignada',
    'Inspector / Calidad',
    'Fecha de Inspección',
    'Observaciones Técnicas',
    'Plan de Acción / Re-trabajo',
  ];

  const executiveRow = [
    report.folioOT || 'S/N',
    report.folioMaquila || 'S/N',
    report.skuArmado || 'S/N',
    report.descripcionArmado || '',
    report.claveCompuesta || (report.componentesArmado?.map((c) => c.sku).join('/') || 'N/A'),
    aqlSummary,
    report.totalLotSize,
    report.sampleSizeRequired,
    report.sampleSizeInspected,
    report.totalDefectives,
    report.status,
    report.tagColor,
    report.firmaCalidad?.nombre || report.inspectorName,
    report.inspectionDate,
    report.observaciones || 'Sin observaciones.',
    report.planDeAccion || 'N/A',
  ];

  const wsExecutive = XLSX.utils.aoa_to_sheet([
    ['CV DIRECTO - REPORTE DE INSPECCIÓN Y LIBERACIÓN DE MAQUILA (AQL)'],
    [],
    executiveHeaders,
    executiveRow,
  ]);

  wsExecutive['!cols'] = [
    { wch: 18 }, // Folio OT
    { wch: 16 }, // Folio Maquila
    { wch: 20 }, // SKU Armado
    { wch: 42 }, // Desc Producto
    { wch: 32 }, // Claves componentes
    { wch: 48 }, // Piezas inspeccionadas AQL
    { wch: 16 }, // Lote total
    { wch: 18 }, // Muestra req
    { wch: 18 }, // Muestra rev
    { wch: 20 }, // Defectos
    { wch: 16 }, // Dictamen
    { wch: 16 }, // Etiqueta
    { wch: 24 }, // Inspector
    { wch: 18 }, // Fecha
    { wch: 45 }, // Observaciones
    { wch: 35 }, // Plan de accion
  ];

  XLSX.utils.book_append_sheet(wb, wsExecutive, 'Resumen Inspección');

  // =========================================================================
  // HOJA 2: DETALLE DE CRITERIOS Y DEFECTOS
  // =========================================================================
  const defectRows: (string | number)[][] = [
    ['CV DIRECTO - CHECKLIST DE CRITERIOS DE INSPECCIÓN'],
    ['Folio OT:', report.folioOT, 'SKU:', report.skuArmado, 'Fecha:', report.inspectionDate, 'Dictamen:', report.status],
    [],
    ['Categoría', 'Criterio de Inspección', 'Severidad', 'Defectos Encontrados', 'Estado', 'Descripción del Hallazgo'],
  ];

  (report.defectItems || []).forEach((item) => {
    defectRows.push([
      item.category,
      item.name,
      item.severity,
      item.defectsFound,
      item.passed ? 'CUMPLE' : 'NO CUMPLE',
      item.description || '-',
    ]);
  });

  const wsDefects = XLSX.utils.aoa_to_sheet(defectRows);
  wsDefects['!cols'] = [
    { wch: 25 },
    { wch: 40 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDefects, 'Criterios y Defectos');

  // =========================================================================
  // HOJA 3: COMPONENTES DEL ARMADO (BOM)
  // =========================================================================
  if (report.componentesArmado && report.componentesArmado.length > 0) {
    const bomRows: (string | number)[][] = [
      ['CV DIRECTO - LISTA DE COMPONENTES DEL COMBO / ARMADO'],
      ['SKU Armado:', report.skuArmado, 'Descripción:', report.descripcionArmado],
      [],
      ['#', 'SKU Componente', 'Descripción', 'Cantidad por Armado', 'Unidad'],
    ];

    report.componentesArmado.forEach((comp, idx) => {
      bomRows.push([
        idx + 1,
        comp.sku,
        comp.descripcion || comp.sku,
        comp.cantidad || 1,
        comp.unidad || 'pieza',
      ]);
    });

    const wsBom = XLSX.utils.aoa_to_sheet(bomRows);
    wsBom['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 45 },
      { wch: 20 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsBom, 'Componentes Combo');
  }

  return wb;
}

/**
 * Exporta directamente el archivo .xlsx en el navegador
 */
export function exportReportToExcel(report: QualityReport) {
  const wb = generateQualityReportWorkbook(report);
  const filename = `Reporte_Calidad_${report.folioOT || 'OT'}_${report.skuArmado || 'SKU'}_${report.inspectionDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * OPCIÓN A MEJORADA:
 * Genera y descarga un archivo comprimido .ZIP que contiene:
 * 1. El archivo Excel estructurado (Reporte_Calidad_[OT]_[SKU].xlsx) — Sin columna Cliente ni Evidencia
 * 2. El Informe Ejecutivo en formato Microsoft Word (INFORME_INSPECCION_[OT]_[SKU].docx)
 * 3. La carpeta Evidencias_Fotograficas/ con los archivos reales de imagen (JPG)
 */
export async function exportInspectionPackageZip(report: QualityReport): Promise<void> {
  const zip = new JSZip();
  const rootFolderName = `Inspeccion_${report.folioOT || 'OT'}_${report.skuArmado || 'SKU'}`;
  const folder = zip.folder(rootFolderName) || zip;

  // 1. Generar buffer binario del archivo Excel estructurado
  const wb = generateQualityReportWorkbook(report);
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const excelFileName = `Reporte_Calidad_${report.folioOT || 'OT'}_${report.skuArmado || 'SKU'}.xlsx`;
  folder.file(excelFileName, excelBuffer);

  // 2. Generar el Informe Ejecutivo en Documento de Word (.docx)
  try {
    const wordBlob = await generateInspectionWordDocument(report);
    const wordBuffer = await wordBlob.arrayBuffer();
    const wordFileName = `INFORME_INSPECCION_${report.folioOT || 'OT'}_${report.skuArmado || 'SKU'}.docx`;
    folder.file(wordFileName, wordBuffer);
  } catch (err) {
    console.error('Error al generar el documento de Word:', err);
  }

  // 3. Generar la Hoja Oficial en formato PDF en tamaño carta exacto (sin desbordes ni datos superpuestos)
  try {
    const pdfBlob = await generateOfficialSheetPdfBlob(report);
    const pdfBuffer = await pdfBlob.arrayBuffer();
    const pdfFileName = `HOJA_OFICIAL_INSPECCION_${report.folioOT || 'OT'}_${report.skuArmado || 'SKU'}.pdf`;
    folder.file(pdfFileName, pdfBuffer);
  } catch (err) {
    console.error('Error al generar la Hoja Oficial en PDF:', err);
  }

  // 4. Crear subcarpeta de fotos y guardar las fotos REALES en formato .jpg
  const photosFolder = folder.folder('Evidencias_Fotograficas');

  // Obtener secciones configuradas (tanto las 4 estándar como las personalizadas)
  const sections = getStoredPhotoSections();
  let totalPhotosAdded = 0;

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const slot = getSectionPhotoSlot(report, sec.key);
    if (!slot) continue;

    // Recolectar todas las URLs del slot (en array urls, url singular o array anidado)
    const rawUrls: string[] = [];
    if (slot.urls && Array.isArray(slot.urls) && slot.urls.length > 0) {
      rawUrls.push(...slot.urls);
    } else if (slot.url) {
      rawUrls.push(slot.url);
    }

    const cleanPrefix = sec.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);

    for (let uIdx = 0; uIdx < rawUrls.length; uIdx++) {
      const url = rawUrls[uIdx];
      if (!url) continue;

      const photoBytes = await fetchPhotoAsUint8Array(url);
      if (photoBytes && photoBytes.length > 0) {
        const photoFileName = `${sIdx + 1}_${cleanPrefix}_Foto_${uIdx + 1}.jpg`;
        photosFolder?.file(photoFileName, photoBytes);
        totalPhotosAdded++;
      }
    }

    // Si tiene nota técnica, conservarla en notas
    if (slot.note && slot.note.trim() && !slot.note.includes('foto(s) capturadas') && !slot.note.includes('foto(s) registradas')) {
      photosFolder?.file(`${sIdx + 1}_${cleanPrefix}_NOTAS.txt`, `Notas de Calidad para ${sec.title}:\n${slot.note}`);
    }
  }

  // 4. Generar blob del ZIP y detonar descarga en el navegador
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const downloadUrl = URL.createObjectURL(zipBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = `Inspeccion_${report.folioOT || 'OT'}_${report.skuArmado || 'SKU'}.zip`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadUrl);
}
