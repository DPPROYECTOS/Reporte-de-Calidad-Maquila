import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QualityReport } from '../types/qualityReport';
import { SheetTemplateConfig, DEFAULT_TEMPLATE_CONFIG } from '../types/templateConfig';
import { getStoredTemplateConfig } from './templateConfigStore';
import { PRODUCT_CATALOG } from '../data/productCatalog';
import { getTitleFontCss, getGeneralFontCss } from './templateFontUtils';

/**
 * Convierte un HTMLCanvasElement a un Blob de PDF estándar Letter (8.5 x 11 pulgadas / 215.9 x 279.4 mm).
 * Se centra y ajusta con margen perimetral de 4 mm para que NADA quede incompleto en la parte inferior.
 */
function canvasToPdfBlob(canvas: HTMLCanvasElement): Blob {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
    compress: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdfWidth = 215.9;
  const pdfHeight = 279.4;

  // Margen simétrico de 4 mm
  const margin = 4;
  const maxPrintableWidth = pdfWidth - margin * 2;
  const maxPrintableHeight = pdfHeight - margin * 2;

  const imgRatio = canvas.width / canvas.height;

  let finalWidth = maxPrintableWidth;
  let finalHeight = maxPrintableWidth / imgRatio;

  // Si excede la altura de la página, escalar proporcionalmente para que TODO quepa
  if (finalHeight > maxPrintableHeight) {
    finalHeight = maxPrintableHeight;
    finalWidth = finalHeight * imgRatio;
  }

  // Centrar perfectamente en la hoja
  const offsetX = (pdfWidth - finalWidth) / 2;
  const offsetY = (pdfHeight - finalHeight) / 2;

  pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalWidth, finalHeight);
  return pdf.output('blob');
}

/**
 * Espera a que todas las imágenes dentro de un elemento terminen de cargarse.
 */
async function waitForElementImages(el: HTMLElement): Promise<void> {
  const images = Array.from(el.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const onFinish = () => {
          img.removeEventListener('load', onFinish);
          img.removeEventListener('error', onFinish);
          resolve();
        };
        img.addEventListener('load', onFinish);
        img.addEventListener('error', onFinish);
      });
    })
  );
}

/**
 * Genera el documento PDF oficial en tamaño carta exacto (8.5 x 11 pulgadas / 215.9 x 279.4 mm).
 * Si existe un elemento con `sourceElementId` o `#official-template-preview-sheet`,
 * lo clona directamente para garantizar una paridad 1:1 absoluta con la vista previa que ve el usuario.
 */
export async function generateOfficialSheetPdfBlob(
  report: QualityReport,
  customConfig?: SheetTemplateConfig,
  sourceElementId?: string
): Promise<Blob> {
  const cfg = customConfig || getStoredTemplateConfig() || DEFAULT_TEMPLATE_CONFIG;

  // Asegurar fuentes listas
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  // 1. INTENTO DE CAPTURA DIRECTA DEL DOM: SI EXISTE LA VISTA PREVIA VISIBLE
  const targetId = sourceElementId || 'official-template-preview-sheet';
  const existingPreviewEl = typeof document !== 'undefined' ? document.getElementById(targetId) : null;

  if (existingPreviewEl) {
    // Clonar el elemento de la vista previa para no alterar la pantalla del usuario
    const clone = existingPreviewEl.cloneNode(true) as HTMLElement;
    clone.id = 'temp-pdf-export-sheet';
    
    // Normalizar estilos del clon para captura nativa a 816px sin zoom
    clone.style.transform = 'none';
    clone.style.webkitTransform = 'none';
    clone.style.margin = '0';
    clone.style.marginBottom = '0';
    clone.style.position = 'fixed';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.width = '816px';
    clone.style.minHeight = '1056px';
    clone.style.boxSizing = 'border-box';
    clone.style.zIndex = '-9999';
    clone.style.visibility = 'visible';
    clone.style.opacity = '1';
    clone.style.backgroundColor = '#FFFFFF';

    document.body.appendChild(clone);

    try {
      await waitForElementImages(clone);

      const canvas = await html2canvas(clone, {
        scale: 3, // ~300 DPI para máxima nitidez de tipografía y líneas
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        windowWidth: 816,
      });

      return canvasToPdfBlob(canvas);
    } finally {
      document.body.removeChild(clone);
    }
  }

  // 2. GENERACIÓN HTML AUTÓNOMA (CUANDO NO ESTÁ ABIERTA LA VISTA PREVIA)
  // Resolver tipografías
  const titleFont = getTitleFontCss(cfg.fontFamilyTitles);
  const generalFont = getGeneralFontCss(cfg.fontFamilyGeneral);

  // Resolver colores
  const sHeaderBg = cfg.sectionHeaderBgColor || '#1A1A1A';
  const sHeaderText = cfg.sectionHeaderTextColor || '#FFFFFF';
  const cellLabelBg = cfg.cellLabelBgColor || '#F3F4F6';
  const cellLabelText = cfg.cellLabelTextColor || '#1F2937';
  const cellValText = cfg.cellValueTextColor || '#111827';
  const tableBorder = cfg.tableBorderColor || '#1A1A1A';
  const metaBg = cfg.metadataBgColor || '#FAF9F6';
  const titleText = cfg.titleTextColor || '#111827';
  const subtitleText = cfg.subtitleTextColor || '#4B5563';
  const procRefText = cfg.procedureRefTextColor || '#4B5563';
  const metaLabelText = cfg.metadataLabelTextColor || '#374151';
  const metaValText = cfg.metadataValueTextColor || '#111827';

  // Alineaciones
  const alignRepTitle = cfg.alignReportTitle || 'center';
  const alignHdrSubtitle = cfg.alignHeaderSubtitle || 'center';
  const alignProcRef = cfg.alignProcedureRef || 'center';
  const alignSecTitles = cfg.alignSectionTitles || 'left';
  const alignTblHeaders = cfg.alignTableHeaders || 'center';

  // Espaciados y dimensiones
  const padV = cfg.cellPaddingVertical !== undefined ? cfg.cellPaddingVertical : 4;
  const padH = cfg.cellPaddingHorizontal !== undefined ? cfg.cellPaddingHorizontal : 6;
  const lineH = cfg.lineHeightMultiplier !== undefined ? cfg.lineHeightMultiplier : 1.3;
  const bWidth = cfg.tableBorderWidth !== undefined ? cfg.tableBorderWidth : 1.5;

  // Tamaños de fuente
  const szRepTitle = cfg.fontSizeReportTitle || 16;
  const szHdrSubtitle = cfg.fontSizeHeaderSubtitle || 8.5;
  const szProcRef = cfg.fontSizeProcedureRef || 8;
  const szSecTitles = cfg.fontSizeSectionTitles || 10.5;
  const szCellLabels = cfg.fontSizeCellLabels || 9;
  const szCellValues = cfg.fontSizeCellValues || 9.5;
  const szTblHeaders = cfg.fontSizeTableHeaders || 9;
  const szMetaLabels = cfg.fontSizeMetadataLabels || 8.5;
  const szMetaValues = cfg.fontSizeMetadataValues || 9;

  // Componentes de combo resueltos
  const resolvedComponents = (() => {
    if (report.componentesArmado && report.componentesArmado.length > 0) {
      return report.componentesArmado;
    }
    const matched = PRODUCT_CATALOG.find(
      (item) => item.sku.toUpperCase() === (report.skuArmado || '').trim().toUpperCase()
    );
    if (matched?.componentes && matched.componentes.length > 0) {
      return matched.componentes.map((c) => ({
        sku: c.sku,
        descripcion: c.desc,
        cantidad: c.cantidad,
        unidad: c.unidad || (c.cantidad === 1 ? 'pieza' : 'piezas'),
      }));
    }
    if (report.claveCompuesta) {
      const parts = report.claveCompuesta.split('/').map((p) => p.trim()).filter(Boolean);
      return parts.map((sku) => {
        const itemMatch = PRODUCT_CATALOG.find((cat) => cat.sku.toUpperCase() === sku.toUpperCase());
        return {
          sku,
          descripcion: itemMatch?.desc || 'Componente individual de combo',
          cantidad: 1,
          unidad: 'pieza',
        };
      });
    }
    return [];
  })();

  const isApproved = report.status === 'APROBADO';
  const isRejected = report.status === 'RECHAZADO';

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '816px';
  container.style.minHeight = '1056px';
  container.style.backgroundColor = '#FFFFFF';
  container.style.padding = '24px 28px';
  container.style.fontFamily = generalFont;
  container.style.color = cellValText;
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  container.innerHTML = `
    <div style="width: 100%; box-sizing: border-box; font-family: ${generalFont}; font-size: ${szCellValues}px; line-height: ${lineH}; color: ${cellValText}; background-color: #FFFFFF;">
      
      <!-- 1. ENCABEZADO NORMATIVO CORPORATIVO -->
      <table style="width: 100%; border-collapse: collapse; border: ${bWidth}px solid ${tableBorder}; margin-bottom: 10px; table-layout: fixed;">
        <tr>
          <!-- Columna 1: Logo o Marca -->
          <td style="width: 25%; border: ${bWidth}px solid ${tableBorder}; padding: 6px 8px; text-align: center; vertical-align: middle; background-color: #FFFFFF;">
            ${
              cfg.logoImageUrl
                ? `<img src="${cfg.logoImageUrl}" style="max-height: ${cfg.logoHeight || 44}px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto 3px auto;" alt="Logo" />`
                : `<div style="font-family: ${titleFont}; font-weight: 900; font-size: 15px; color: ${sHeaderBg}; letter-spacing: 1px;">CV DIRECTO</div>`
            }
            ${
              cfg.logoSubtitle
                ? `<div style="font-size: ${szHdrSubtitle}px; font-weight: bold; text-transform: uppercase; color: ${subtitleText}; letter-spacing: 0.5px; line-height: 1.2;">${cfg.logoSubtitle}</div>`
                : ''
            }
          </td>

          <!-- Columna 2: Título Oficial y Referencia de Procedimiento -->
          <td style="width: 48%; border: ${bWidth}px solid ${tableBorder}; padding: 6px 10px; text-align: ${alignRepTitle}; vertical-align: middle; background-color: ${metaBg};">
            ${
              cfg.headerSubtitle
                ? `<div style="font-size: ${szHdrSubtitle}px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: ${subtitleText}; text-align: ${alignHdrSubtitle}; margin-bottom: 2px;">${cfg.headerSubtitle}</div>`
                : ''
            }
            <div style="font-family: ${titleFont}; font-size: ${szRepTitle}px; font-weight: 900; text-transform: uppercase; color: ${titleText}; letter-spacing: -0.2px; line-height: 1.15; margin: 2px 0; text-align: ${alignRepTitle};">
              ${cfg.reportTitle || 'INFORME DE INSPECCIÓN MAQUILA'}
            </div>
            ${
              cfg.procedureReference
                ? `<div style="font-size: ${szProcRef}px; font-style: italic; color: ${procRefText}; text-align: ${alignProcRef}; margin-top: 2px;">${cfg.procedureReference}</div>`
                : ''
            }
          </td>

          <!-- Columna 3: Bloque de Metadatos y Folio -->
          <td style="width: 27%; border: ${bWidth}px solid ${tableBorder}; padding: 0; vertical-align: middle; background-color: #FFFFFF;">
            <table style="width: 100%; border-collapse: collapse; height: 100%;">
              <tr style="border-bottom: 1px solid ${tableBorder};">
                <td style="padding: 3px 6px; font-weight: bold; background-color: ${cellLabelBg}; color: ${metaLabelText}; font-size: ${szMetaLabels}px; width: 44%; text-transform: uppercase; vertical-align: middle;">CÓDIGO:</td>
                <td style="padding: 3px 6px; font-weight: bold; background-color: #FFFFFF; color: ${metaValText}; font-size: ${szMetaValues}px; font-family: monospace; text-align: center; vertical-align: middle;">${report.folioCode || cfg.documentCode || 'CVD-CCA-F-08'}</td>
              </tr>
              <tr style="border-bottom: 1px solid ${tableBorder};">
                <td style="padding: 3px 6px; font-weight: bold; background-color: ${cellLabelBg}; color: ${metaLabelText}; font-size: ${szMetaLabels}px; text-transform: uppercase; vertical-align: middle;">VERSIÓN:</td>
                <td style="padding: 3px 6px; font-weight: bold; background-color: #FFFFFF; color: ${metaValText}; font-size: ${szMetaValues}px; font-family: monospace; text-align: center; vertical-align: middle;">${report.version || cfg.version || '00'}</td>
              </tr>
              <tr style="border-bottom: 1px solid ${tableBorder};">
                <td style="padding: 3px 6px; font-weight: bold; background-color: ${cellLabelBg}; color: ${metaLabelText}; font-size: ${szMetaLabels}px; text-transform: uppercase; vertical-align: middle;">REVISIÓN:</td>
                <td style="padding: 3px 6px; background-color: #FFFFFF; color: ${metaValText}; font-size: ${szMetaValues}px; font-family: monospace; text-align: center; vertical-align: middle;">${report.revisionDate || cfg.revisionDate || '2026-08-05'}</td>
              </tr>
              <tr>
                <td style="padding: 3px 6px; font-weight: bold; background-color: ${cellLabelBg}; color: ${metaLabelText}; font-size: ${szMetaLabels}px; text-transform: uppercase; vertical-align: middle;">FOLIO / OT:</td>
                <td style="padding: 3px 6px; font-weight: 900; background-color: ${sHeaderBg}; color: #FFFFFF; font-size: ${szMetaValues}px; font-family: monospace; text-align: center; vertical-align: middle; letter-spacing: 0.5px;">${report.folioOT || '0001'}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- 2. SECCIÓN I: DATOS GENERALES DE INSPECCIÓN -->
      <div style="margin-bottom: 9px;">
        <div style="background-color: ${sHeaderBg}; color: ${sHeaderText}; font-family: ${titleFont}; font-size: ${szSecTitles}px; font-weight: bold; padding: 4px 10px; text-transform: uppercase; letter-spacing: 0.5px; border: ${bWidth}px solid ${tableBorder}; border-bottom: none; display: flex; justify-content: space-between; align-items: center; text-align: ${alignSecTitles};">
          <span>${cfg.section1Title || 'I. DATOS GENERALES DE INSPECCIÓN'}</span>
          <span style="font-family: monospace; font-size: 8.5px; opacity: 0.85;">${cfg.documentCode || 'CVD-CCA-F-08'}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: ${bWidth}px solid ${tableBorder}; font-size: ${szCellValues}px; table-layout: fixed;">
          <tr>
            <td style="width: 20%; border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; text-transform: uppercase; font-size: ${szCellLabels}px; vertical-align: middle;">
              INSPECTOR:
            </td>
            <td style="width: 30%; border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-weight: bold; color: ${cellValText}; vertical-align: middle;">
              ${report.inspectorName || 'Insp. Bryan'}
            </td>
            <td style="width: 20%; border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; text-transform: uppercase; font-size: ${szCellLabels}px; vertical-align: middle;">
              FECHA INSPECCIÓN:
            </td>
            <td style="width: 30%; border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-family: monospace; font-weight: bold; color: ${cellValText}; vertical-align: middle;">
              ${report.inspectionDate || '2026-09-17'}
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; text-transform: uppercase; font-size: ${szCellLabels}px; vertical-align: middle;">
              HORA INICIO:
            </td>
            <td style="border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-family: monospace; color: ${cellValText}; vertical-align: middle;">
              ${report.startTime || '08:00 a.m.'}
            </td>
            <td style="border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; text-transform: uppercase; font-size: ${szCellLabels}px; vertical-align: middle;">
              HORA TÉRMINO:
            </td>
            <td style="border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-family: monospace; color: ${cellValText}; vertical-align: middle;">
              ${report.endTime || '11:21 a.m.'}
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-weight: bold; background-color: #ECFDF5; color: #065F46; text-transform: uppercase; font-size: ${szCellLabels}px; vertical-align: middle;">
              NO. MAQUILA (REGISTRO):
            </td>
            <td style="border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-family: monospace; font-weight: bold; color: #065F46; vertical-align: middle;">
              ${report.noMaquila || report.folioMaquila || 'S/N'}
            </td>
            <td style="border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-weight: bold; background-color: #EFF6FF; color: #1E40AF; text-transform: uppercase; font-size: ${szCellLabels}px; vertical-align: middle;">
              NO. PEDIDO (EVIDENCIAS):
            </td>
            <td style="border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-family: monospace; font-weight: bold; color: #1E40AF; vertical-align: middle;">
              ${report.noPedido || report.folioOT || 'S/N'}
            </td>
          </tr>
        </table>
      </div>

      <!-- 3. SECCIÓN II: CONTROL DEL PRODUCTO Y COMBO DE ARMADO -->
      <div style="margin-bottom: 9px;">
        <div style="background-color: ${sHeaderBg}; color: ${sHeaderText}; font-family: ${titleFont}; font-size: ${szSecTitles}px; font-weight: bold; padding: 4px 10px; text-transform: uppercase; letter-spacing: 0.5px; border: ${bWidth}px solid ${tableBorder}; border-bottom: none; text-align: ${alignSecTitles};">
          <span>${cfg.section2Title || 'II. CONTROL DEL PRODUCTO Y COMBO DE ARMADO'}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: ${bWidth}px solid ${tableBorder}; font-size: ${szCellValues}px; table-layout: fixed;">
          <tr>
            <td style="width: 20%; border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; text-transform: uppercase; font-size: ${szCellLabels}px; vertical-align: middle;">
              CLAVE / SKU:
            </td>
            <td style="width: 30%; border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-weight: 900; color: #1D4ED8; font-family: monospace; vertical-align: middle;">
              ${report.skuArmado || 'C0557-01'}
            </td>
            <td style="width: 20%; border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; text-transform: uppercase; font-size: ${szCellLabels}px; vertical-align: middle;">
              LOTE TOTAL (N):
            </td>
            <td style="width: 30%; border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-family: monospace; font-weight: bold; color: ${cellValText}; vertical-align: middle;">
              ${(report.totalLotSize || 900).toLocaleString()} pzas
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; text-transform: uppercase; font-size: ${szCellLabels}px; vertical-align: middle;">
              DESCRIPCIÓN:
            </td>
            <td colspan="3" style="border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-weight: bold; color: ${cellValText}; vertical-align: middle;">
              ${report.descripcionArmado || 'JADE CHEF 10 PZAS MAS SET DE 5 CUCHILLOS TIPO MADERA'}
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; text-transform: uppercase; font-size: ${szCellLabels}px; vertical-align: middle;">
              COMPONENTES COMBO:
            </td>
            <td colspan="3" style="border: 1px solid ${tableBorder}; padding: ${padV}px ${padH}px; vertical-align: middle;">
              ${
                resolvedComponents.length > 0
                  ? `<div style="display: flex; flex-wrap: wrap; gap: 4px;">
                      ${resolvedComponents
                        .map(
                          (comp) => `
                        <span style="display: inline-block; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 3px; padding: 2px 6px; font-size: 8.5px; font-family: monospace;">
                          <strong style="color: #1E293B;">${comp.sku}:</strong> ${comp.descripcion} (${comp.cantidad} ${comp.unidad || 'pz'})
                        </span>
                      `
                        )
                        .join('')}
                    </div>`
                  : `<span style="font-family: monospace; font-size: 9px; color: ${cellValText};">${report.claveCompuesta || 'C0557-00 (1 pz) / C0558-00 (1 pz)'}</span>`
              }
            </td>
          </tr>
        </table>
      </div>

      <!-- 4. SECCIÓN III: MUESTREO DE ACEPTACIÓN (AQL ANSI/ASQ Z1.4) -->
      <div style="margin-bottom: 9px;">
        <div style="background-color: ${sHeaderBg}; color: ${sHeaderText}; font-family: ${titleFont}; font-size: ${szSecTitles}px; font-weight: bold; padding: 4px 10px; text-transform: uppercase; letter-spacing: 0.5px; border: ${bWidth}px solid ${tableBorder}; border-bottom: none; text-align: ${alignSecTitles};">
          <span>${cfg.section3Title || 'III. MUESTREO DE ACEPTACIÓN (AQL ANSI/ASQ Z1.4)'}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: ${bWidth}px solid ${tableBorder}; font-size: ${szCellValues}px; table-layout: fixed;">
          <tr style="background-color: ${cellLabelBg}; color: ${cellLabelText}; font-size: ${szTblHeaders}px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">
            <th style="border: 1px solid ${tableBorder}; padding: 3px 2px; text-align: center; vertical-align: middle; width: 14%;">Nivel</th>
            <th style="border: 1px solid ${tableBorder}; padding: 3px 2px; text-align: center; vertical-align: middle; width: 14%;">AQL Target</th>
            <th style="border: 1px solid ${tableBorder}; padding: 3px 2px; text-align: center; vertical-align: middle; width: 12%;">Letra</th>
            <th style="border: 1px solid ${tableBorder}; padding: 3px 2px; text-align: center; vertical-align: middle; width: 15%;">Muestra Req. (n)</th>
            <th style="border: 1px solid ${tableBorder}; padding: 3px 2px; text-align: center; vertical-align: middle; width: 15%;">Aceptación (Ac)</th>
            <th style="border: 1px solid ${tableBorder}; padding: 3px 2px; text-align: center; vertical-align: middle; width: 15%;">Rechazo (Re)</th>
            <th style="border: 1px solid ${tableBorder}; padding: 3px 2px; text-align: center; vertical-align: middle; width: 15%;">Inspeccionada</th>
          </tr>
          <tr style="text-align: center; font-family: monospace; font-size: ${szCellValues}px; font-weight: bold;">
            <td style="border: 1px solid ${tableBorder}; padding: 4px 2px; vertical-align: middle; background-color: #FFFFFF;">${report.inspectionLevel || 'General II'}</td>
            <td style="border: 1px solid ${tableBorder}; padding: 4px 2px; vertical-align: middle; background-color: #FFFFFF;">${report.aqlTarget || 1.5}%</td>
            <td style="border: 1px solid ${tableBorder}; padding: 4px 2px; vertical-align: middle; background-color: #FFFFFF; color: #4338CA; font-weight: 900;">${report.codeLetter || 'J'}</td>
            <td style="border: 1px solid ${tableBorder}; padding: 4px 2px; vertical-align: middle; background-color: #FFFFFF;">${report.sampleSizeRequired || 80} pz</td>
            <td style="border: 1px solid ${tableBorder}; padding: 4px 2px; vertical-align: middle; background-color: #ECFDF5; color: #065F46; font-weight: 900;">≤ ${report.acLimit !== undefined ? report.acLimit : 3}</td>
            <td style="border: 1px solid ${tableBorder}; padding: 4px 2px; vertical-align: middle; background-color: #FEF2F2; color: #991B1B; font-weight: 900;">≥ ${report.reLimit !== undefined ? report.reLimit : 4}</td>
            <td style="border: 1px solid ${tableBorder}; padding: 4px 2px; vertical-align: middle; background-color: #FEF3C7; color: #92400E; font-weight: 900;">${report.sampleSizeInspected || 80} pz</td>
          </tr>
        </table>
      </div>

      <!-- 5. SECCIÓN IV: CLASIFICACIÓN DE DEFECTOS FÍSICOS Y FUNCIONALES -->
      <div style="margin-bottom: 9px;">
        <div style="background-color: ${sHeaderBg}; color: ${sHeaderText}; font-family: ${titleFont}; font-size: ${szSecTitles}px; font-weight: bold; padding: 4px 10px; text-transform: uppercase; letter-spacing: 0.5px; border: ${bWidth}px solid ${tableBorder}; border-bottom: none; display: flex; justify-content: space-between; align-items: center; text-align: ${alignSecTitles};">
          <span>${cfg.section4Title || 'IV. CLASIFICACIÓN DE DEFECTOS FÍSICOS Y FUNCIONALES'}</span>
          <span style="font-family: monospace; font-size: 8.5px; color: #FDE047; font-weight: bold;">
            CRÍTICOS: ${report.totalCritical || 0} | MAYORES: ${report.totalMajor || 0} | MENORES: ${report.totalMinor || 0}
          </span>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: ${bWidth}px solid ${tableBorder}; font-size: ${szCellValues}px; table-layout: fixed; box-sizing: border-box;">
          <thead>
            <tr style="background-color: ${cellLabelBg}; color: ${cellLabelText}; font-size: ${szTblHeaders}px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">
              <th style="border: 1px solid ${tableBorder}; padding: ${padV}px 6px; width: 17%; text-align: left; vertical-align: middle;">Categoría</th>
              <th style="border: 1px solid ${tableBorder}; padding: ${padV}px 6px; width: 36%; text-align: left; vertical-align: middle;">Criterio Evaluado</th>
              <th style="border: 1px solid ${tableBorder}; padding: ${padV}px 4px; width: 10%; text-align: center; vertical-align: middle;">Severidad</th>
              <th style="border: 1px solid ${tableBorder}; padding: ${padV}px 4px; width: 7%; text-align: center; vertical-align: middle;">Def</th>
              <th style="border: 1px solid ${tableBorder}; padding: ${padV}px 4px; width: 13%; text-align: center; vertical-align: middle;">Resultado</th>
              <th style="border: 1px solid ${tableBorder}; padding: ${padV}px 6px; width: 17%; text-align: left; vertical-align: middle;">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${(report.defectItems || [])
              .map((item) => {
                const hasDef = item.defectsFound > 0;
                const isCrit = item.severity === 'Critico';
                const isMaj = item.severity === 'Mayor';

                const badgeBg = isCrit ? '#FEE2E2' : isMaj ? '#FEF3C7' : '#F1F5F9';
                const badgeColor = isCrit ? '#991B1B' : isMaj ? '#92400E' : '#334155';
                const badgeBorder = isCrit ? '#FCA5A5' : isMaj ? '#FCD34D' : '#CBD5E1';

                return `
                  <tr>
                    <td style="border: 1px solid ${tableBorder}; padding: ${padV}px 6px; font-weight: bold; color: ${cellLabelText}; background-color: #F8FAFC; vertical-align: top; line-height: ${lineH}; word-break: normal; overflow-wrap: break-word;">
                      ${item.category}
                    </td>
                    <td style="border: 1px solid ${tableBorder}; padding: ${padV}px 6px; vertical-align: top; color: ${cellValText}; line-height: ${lineH}; word-break: normal; overflow-wrap: break-word;">
                      <div style="font-weight: bold; font-size: ${szCellValues}px;">${item.name}</div>
                      ${item.description ? `<div style="font-size: 8px; color: #64748B; font-style: italic; margin-top: 1px;">${item.description}</div>` : ''}
                    </td>
                    <td style="border: 1px solid ${tableBorder}; padding: ${padV}px 4px; text-align: center; vertical-align: top;">
                      <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; font-weight: bold; font-size: 8px; padding: 1px 4px; border-radius: 3px; text-transform: uppercase;">
                        ${item.severity}
                      </span>
                    </td>
                    <td style="border: 1px solid ${tableBorder}; padding: ${padV}px 4px; text-align: center; vertical-align: top; font-family: monospace; font-weight: 900; color: ${hasDef ? '#DC2626' : '#64748B'};">
                      ${item.defectsFound}
                    </td>
                    <td style="border: 1px solid ${tableBorder}; padding: ${padV}px 4px; text-align: center; vertical-align: top;">
                      ${
                        item.passed
                          ? `<span style="color: #16A34A; font-weight: 900; font-size: 8.5px;">✓ CONFORME</span>`
                          : `<span style="color: #DC2626; font-weight: 900; font-size: 8.5px;">✗ DESVIACIÓN</span>`
                      }
                    </td>
                    <td style="border: 1px solid ${tableBorder}; padding: ${padV}px 6px; vertical-align: top; font-size: 8.5px; color: ${hasDef ? '#DC2626' : '#475569'}; line-height: ${lineH}; word-break: normal; overflow-wrap: break-word;">
                      ${hasDef ? (item.description || 'Desviación registrada') : 'Conforme / Sin hallazgos'}
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>

      <!-- 6. SECCIÓN VI: DICTAMEN FINAL Y DISPOSICIÓN DEL LOTE (MATCH 1:1 CON PREVIEW) -->
      <div style="margin-bottom: 9px;">
        <div style="background-color: ${sHeaderBg}; color: ${sHeaderText}; font-family: ${titleFont}; font-size: ${szSecTitles}px; font-weight: bold; padding: 4px 10px; text-transform: uppercase; letter-spacing: 0.5px; border: ${bWidth}px solid ${tableBorder}; border-bottom: none; text-align: ${alignSecTitles};">
          <span>${cfg.section6Title || 'VI. DICTAMEN FINAL Y DISPOSICIÓN DEL LOTE'}</span>
        </div>

        <div style="border: ${bWidth}px solid ${tableBorder}; padding: 6px 10px; background-color: #FFFFFF;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 5px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: bold; font-size: 9.5px; text-transform: uppercase; color: ${cellLabelText};">DICTAMEN:</span>
              <span style="background-color: ${isApproved ? '#16A34A' : isRejected ? '#DC2626' : '#D97706'}; color: #FFFFFF; font-weight: 900; font-size: 10px; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px;">
                ${report.status || 'RECHAZADO'}
              </span>
              <span style="font-size: 8.5px; font-family: monospace; color: #475569;">
                [${isApproved ? 'X' : ' '}] APROBADO &nbsp; [${isRejected ? 'X' : ' '}] RECHAZADO &nbsp; [${report.status === 'CONDICIONADO' ? 'X' : ' '}] CONDICIONADO
              </span>
            </div>
            <div style="font-weight: bold; font-size: 9px; padding: 2px 7px; border: 1px solid ${report.tagColor === 'Roja' ? '#FCA5A5' : report.tagColor === 'Amarilla' ? '#FCD34D' : '#86EFAC'}; background-color: ${report.tagColor === 'Roja' ? '#FEE2E2' : report.tagColor === 'Amarilla' ? '#FEF3C7' : '#DCFCE7'}; color: ${report.tagColor === 'Roja' ? '#991B1B' : report.tagColor === 'Amarilla' ? '#92400E' : '#166534'}; border-radius: 3px;">
              ETIQUETA: ${report.tagColor ? report.tagColor.toUpperCase() : (isRejected ? 'ROJA' : 'VERDE')}
            </div>
          </div>

          <div style="border: 1px solid #E2E8F0; background-color: #F8FAFC; border-radius: 4px; padding: 4px 8px; font-size: 8.5px; line-height: 1.35; color: #334155;">
            <strong style="color: #0F172A; text-transform: uppercase;">OBSERVACIONES TÉCNICAS:</strong> ${
              report.observaciones && report.observaciones.trim()
                ? report.observaciones
                : (isApproved
                    ? 'El lote cumple satisfactoriamente con los criterios de calidad especificados en la normativa de maquila.'
                    : 'Se detectaron desviaciones en empaque y código de barras. Requiere retrabajo y re-inspección.')
            }
            ${
              report.planDeAccion && report.planDeAccion.trim()
                ? `<div style="margin-top: 3px; padding-top: 3px; border-top: 1px dashed #CBD5E1;"><strong style="color: #0F172A; text-transform: uppercase;">PLAN DE ACCIÓN:</strong> ${report.planDeAccion}</div>`
                : ''
            }
          </div>
        </div>
      </div>

      <!-- 7. SECCIÓN VII: FIRMAS DE CONFORMIDAD Y APROBACIÓN (IDÉNTICO A PREVIEW) -->
      <div>
        <div style="background-color: ${sHeaderBg}; color: ${sHeaderText}; font-family: ${titleFont}; font-size: ${szSecTitles}px; font-weight: bold; padding: 4px 10px; text-transform: uppercase; letter-spacing: 0.5px; border: ${bWidth}px solid ${tableBorder}; border-bottom: none; text-align: ${alignSecTitles};">
          <span>${cfg.section7Title || 'VII. FIRMAS DE CONFORMIDAD Y APROBACIÓN'}</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; border: ${bWidth}px solid ${tableBorder}; background-color: #FFFFFF;">
          <!-- Firma 1: Calidad -->
          <div style="padding: 6px 12px; text-align: center; border-right: ${bWidth}px solid ${tableBorder}; height: 74px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
            <div style="font-size: 8.5px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
              1. Inspección y Liberación de Calidad
            </div>
            <div style="font-family: Georgia, serif; font-style: italic; font-size: 15px; font-weight: 900; color: #1E293B; letter-spacing: 0.5px;">
              ${report.firmaCalidad?.nombre || report.inspectorName || 'Insp. Bryan'}
            </div>
            <div style="font-size: 7.5px; color: #94A3B8; font-family: monospace;">
              Firma Digital Registrada
            </div>
          </div>

          <!-- Firma 2: Maquila -->
          <div style="padding: 6px 12px; text-align: center; height: 74px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
            <div style="font-size: 8.5px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
              2. Conformidad y Aprobación de Maquila
            </div>
            <div style="font-family: Georgia, serif; font-style: italic; font-size: 15px; font-weight: 900; color: #1E293B; letter-spacing: 0.5px;">
              ${report.firmaMaquila?.nombre || 'Supervisor de Maquila'}
            </div>
            <div style="font-size: 7.5px; color: #94A3B8; font-family: monospace;">
              Firma Digital Registrada
            </div>
          </div>
        </div>
      </div>

      <!-- 8. PIE DE PÁGINA NORMATIVO (SIEMPRE VISIBLE EN EL FONDO) -->
      <div style="margin-top: 8px; padding-top: 4px; border-top: 1px solid #CBD5E1; display: flex; justify-content: space-between; font-size: 8px; font-family: monospace; color: #64748B;">
        <span>${report.folioCode || cfg.documentCode || 'CVD-CCA-F-08'}, v${report.version || cfg.version || '00'}. Documento normativo Suave y Fácil S.A. de C.V.</span>
        <span style="font-weight: bold; color: ${cellValText};">Página 1 de 1 (Carta 8.5" x 11")</span>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    await waitForElementImages(container);

    const canvas = await html2canvas(container, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
      windowWidth: 816,
    });

    return canvasToPdfBlob(canvas);
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Detona la descarga directa del documento PDF oficial en el navegador.
 */
export async function downloadOfficialSheetPdf(
  report: QualityReport,
  customConfig?: SheetTemplateConfig,
  fileName?: string,
  sourceElementId?: string
): Promise<void> {
  const blob = await generateOfficialSheetPdfBlob(report, customConfig, sourceElementId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download =
    fileName || `HOJA_OFICIAL_INSPECCION_${report.folioOT || 'OT'}_${report.skuArmado || 'SKU'}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
