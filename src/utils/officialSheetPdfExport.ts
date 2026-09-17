import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QualityReport } from '../types/qualityReport';
import { SheetTemplateConfig, DEFAULT_TEMPLATE_CONFIG } from '../types/templateConfig';
import { getStoredTemplateConfig } from './templateConfigStore';
import { PRODUCT_CATALOG } from '../data/productCatalog';

/**
 * Genera el documento PDF oficial en tamaño carta exacto (8.5 x 11 pulgadas / 215.9 x 279.4 mm).
 * Se renderiza en un contenedor aislado con inputs convertidos a texto legible
 * para garantizar que nada se desborde, se corte o se superponga.
 */
export async function generateOfficialSheetPdfBlob(
  report: QualityReport,
  customConfig?: SheetTemplateConfig
): Promise<Blob> {
  const cfg = customConfig || getStoredTemplateConfig() || DEFAULT_TEMPLATE_CONFIG;

  // Resolver colores según plantilla
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

  // Componentes resueltos
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

  // Crear un elemento contenedor fuera de pantalla con medidas fijas Letter (816px de ancho)
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '816px';
  container.style.backgroundColor = '#FFFFFF';
  container.style.padding = '24px 28px';
  container.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  container.style.color = cellValText;
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  // Construir HTML limpio para tamaño carta sin inputs editables (valores impresos directos)
  container.innerHTML = `
    <div style="width: 100%; box-sizing: border-box; font-size: 11px; line-height: 1.35; color: ${cellValText};">
      
      <!-- ENCABEZADO NORMATIVO -->
      <table style="width: 100%; border-collapse: collapse; border: 2px solid ${tableBorder}; margin-bottom: 12px; table-layout: fixed;">
        <tr>
          <!-- Logo / Subtítulo -->
          <td style="width: 25%; border: 1.5px solid ${tableBorder}; padding: 8px; text-align: center; vertical-align: middle; background-color: #FFFFFF;">
            ${
              cfg.logoImageUrl
                ? `<img src="${cfg.logoImageUrl}" style="max-height: 48px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto 4px auto;" alt="Logo" />`
                : `<div style="font-weight: 900; font-size: 13px; color: #1E293B; letter-spacing: 1px;">CV DIRECTO</div>`
            }
            <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: ${subtitleText}; letter-spacing: 0.5px;">
              ${cfg.logoSubtitle || 'CALIDAD EN OPERACIONES Y MAQUILA'}
            </div>
          </td>

          <!-- Título y Referencia -->
          <td style="width: 48%; border: 1.5px solid ${tableBorder}; padding: 8px; text-align: center; vertical-align: middle; background-color: ${metaBg};">
            <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: ${subtitleText};">
              ${cfg.headerSubtitle || 'SISTEMA DE GESTIÓN INTEGRAL DE CALIDAD'}
            </div>
            <div style="font-size: 13px; font-weight: 900; text-transform: uppercase; margin: 3px 0; color: ${titleText}; letter-spacing: -0.2px;">
              ${cfg.reportTitle || 'HOJA OFICIAL DE INSPECCIÓN EN MAQUILA'}
            </div>
            <div style="font-size: 9px; font-style: italic; color: ${procRefText};">
              ${cfg.procedureReference || 'Procedimiento de Acondicionamiento CVD-AMA-PR-01 / Anexo 8'}
            </div>
          </td>

          <!-- Metadatos de Control -->
          <td style="width: 27%; border: 1.5px solid ${tableBorder}; padding: 0; vertical-align: top; background-color: ${metaBg}; font-family: monospace; font-size: 9px;">
            <table style="width: 100%; border-collapse: collapse; height: 100%;">
              <tr style="border-bottom: 1px solid ${tableBorder};">
                <td style="padding: 3px 5px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; width: 45%;">CÓDIGO:</td>
                <td style="padding: 3px 5px; font-weight: bold; background-color: #FFFFFF; text-align: center;">${report.folioCode || cfg.documentCode || 'CVD-CCA-F-08'}</td>
              </tr>
              <tr style="border-bottom: 1px solid ${tableBorder};">
                <td style="padding: 3px 5px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText};">VERSIÓN:</td>
                <td style="padding: 3px 5px; background-color: #FFFFFF; text-align: center;">${report.version || cfg.version || '00'}</td>
              </tr>
              <tr style="border-bottom: 1px solid ${tableBorder};">
                <td style="padding: 3px 5px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText};">REVISIÓN:</td>
                <td style="padding: 3px 5px; background-color: #FFFFFF; text-align: center;">${report.revisionDate || cfg.revisionDate || '2026-03-01'}</td>
              </tr>
              <tr>
                <td style="padding: 3px 5px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText};">FOLIO / OT:</td>
                <td style="padding: 3px 5px; font-weight: 900; background-color: ${sHeaderBg}; color: #FFFFFF; text-align: center;">${report.folioOT || 'S/F'}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- SECCIÓN I: DATOS GENERALES -->
      <div style="margin-bottom: 10px;">
        <div style="background-color: ${sHeaderBg}; color: ${sHeaderText}; font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; display: flex; justify-content: space-between;">
          <span>${cfg.section1Title || 'I. DATOS GENERALES DE LA INSPECCIÓN'}</span>
          <span style="font-family: monospace; opacity: 0.85;">${cfg.documentCode || 'CVD-CCA-F-08'}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${tableBorder}; font-size: 9.5px; table-layout: fixed;">
          <tr>
            <td style="width: 16%; padding: 4px 6px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; border: 1px solid ${tableBorder}; text-transform: uppercase;">Inspector:</td>
            <td style="width: 34%; padding: 4px 6px; border: 1px solid ${tableBorder}; font-weight: 600; background-color: #FFFFFF;">${report.inspectorName || 'No especificado'}</td>
            <td style="width: 18%; padding: 4px 6px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; border: 1px solid ${tableBorder}; text-transform: uppercase;">Fecha Inspección:</td>
            <td style="width: 32%; padding: 4px 6px; border: 1px solid ${tableBorder}; font-family: monospace; background-color: #FFFFFF;">${report.inspectionDate || 'Sin fecha'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; border: 1px solid ${tableBorder}; text-transform: uppercase;">Hora Inicio:</td>
            <td style="padding: 4px 6px; border: 1px solid ${tableBorder}; font-family: monospace; background-color: #FFFFFF;">${report.startTime || '--:--'}</td>
            <td style="padding: 4px 6px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; border: 1px solid ${tableBorder}; text-transform: uppercase;">Hora Término:</td>
            <td style="padding: 4px 6px; border: 1px solid ${tableBorder}; font-family: monospace; background-color: #FFFFFF;">${report.endTime || '--:--'}</td>
          </tr>
        </table>
      </div>

      <!-- SECCIÓN II: DATOS DE CONTROL Y PRODUCTO -->
      <div style="margin-bottom: 10px;">
        <div style="background-color: ${sHeaderBg}; color: ${sHeaderText}; font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; display: flex; justify-content: space-between;">
          <span>${cfg.section2Title || 'II. DATOS DE CONTROL Y PRODUCTO ARMADO'}</span>
          <span style="font-family: monospace; font-size: 8.5px; opacity: 0.85;">ERP Oracle Sync</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${tableBorder}; font-size: 9.5px; table-layout: fixed;">
          <tr>
            <td style="width: 16%; padding: 4px 6px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; border: 1px solid ${tableBorder}; text-transform: uppercase;">Clave / SKU:</td>
            <td style="width: 34%; padding: 4px 6px; border: 1px solid ${tableBorder}; font-family: monospace; font-weight: 900; background-color: #FFFFFF;">${report.skuArmado || 'Sin SKU'}</td>
            <td style="width: 18%; padding: 4px 6px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; border: 1px solid ${tableBorder}; text-transform: uppercase;">Lote Total (N):</td>
            <td style="width: 32%; padding: 4px 6px; border: 1px solid ${tableBorder}; font-family: monospace; font-weight: bold; background-color: #FFFFFF;">${report.totalLotSize} pzas</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; border: 1px solid ${tableBorder}; text-transform: uppercase;">Descripción:</td>
            <td colspan="3" style="padding: 4px 6px; border: 1px solid ${tableBorder}; background-color: #FFFFFF;">${report.descripcionArmado || 'Sin descripción'}</td>
          </tr>
          ${
            resolvedComponents.length > 0
              ? `<tr>
                  <td style="padding: 4px 6px; font-weight: bold; background-color: ${cellLabelBg}; color: ${cellLabelText}; border: 1px solid ${tableBorder}; text-transform: uppercase; vertical-align: top;">Componentes Combo:</td>
                  <td colspan="3" style="padding: 4px 6px; border: 1px solid ${tableBorder}; background-color: #FFFFFF;">
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                      ${resolvedComponents
                        .map(
                          (c) =>
                            `<span style="background-color: #F1F5F9; border: 1px solid #CBD5E1; padding: 2px 5px; font-size: 8.5px; border-radius: 3px; font-family: monospace;"><strong>${c.sku}</strong>: ${c.descripcion || ''} (${c.cantidad || 1} ${c.unidad || 'pz'})</span>`
                        )
                        .join('')}
                    </div>
                  </td>
                </tr>`
              : ''
          }
        </table>
      </div>

      <!-- SECCIÓN III: MUESTREO AQL -->
      <div style="margin-bottom: 10px;">
        <div style="background-color: ${sHeaderBg}; color: ${sHeaderText}; font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">
          ${cfg.section3Title || 'III. MUESTREO AQL (TABLA MIL-STD-105E / ANSI ASQ Z1.4)'}
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${tableBorder}; font-size: 9px; text-align: center; font-family: monospace; table-layout: fixed;">
          <tr style="background-color: ${cellLabelBg}; color: ${cellLabelText}; font-weight: bold;">
            <th style="padding: 4px 2px; border: 1px solid ${tableBorder};">Nivel</th>
            <th style="padding: 4px 2px; border: 1px solid ${tableBorder};">AQL Target</th>
            <th style="padding: 4px 2px; border: 1px solid ${tableBorder};">Letra</th>
            <th style="padding: 4px 2px; border: 1px solid ${tableBorder};">Muestra Requerida (n)</th>
            <th style="padding: 4px 2px; border: 1px solid ${tableBorder}; background-color: #D1FAE5; color: #065F46;">Aceptación (Ac)</th>
            <th style="padding: 4px 2px; border: 1px solid ${tableBorder}; background-color: #FEE2E2; color: #991B1B;">Rechazo (Re)</th>
            <th style="padding: 4px 2px; border: 1px solid ${tableBorder}; background-color: #FEF3C7; color: #92400E;">Inspeccionada</th>
          </tr>
          <tr style="background-color: #FFFFFF; font-weight: bold;">
            <td style="padding: 4px 2px; border: 1px solid ${tableBorder};">${report.inspectionLevel || 'II'}</td>
            <td style="padding: 4px 2px; border: 1px solid ${tableBorder};">${report.aqlTarget || 2.5}%</td>
            <td style="padding: 4px 2px; border: 1px solid ${tableBorder}; font-size: 11px; color: #0284C7;">${report.codeLetter || 'J'}</td>
            <td style="padding: 4px 2px; border: 1px solid ${tableBorder}; font-size: 10px;">${report.sampleSizeRequired} pz</td>
            <td style="padding: 4px 2px; border: 1px solid ${tableBorder}; font-size: 10px; color: #065F46; background-color: #ECFDF5;">≤ ${report.acLimit}</td>
            <td style="padding: 4px 2px; border: 1px solid ${tableBorder}; font-size: 10px; color: #991B1B; background-color: #FEF2F2;">≥ ${report.reLimit}</td>
            <td style="padding: 4px 2px; border: 1px solid ${tableBorder}; font-size: 10px; color: #92400E; background-color: #FFFBEB;">${report.sampleSizeInspected || report.sampleSizeRequired} pz</td>
          </tr>
        </table>
      </div>

      <!-- SECCIÓN IV: CHECKLIST Y CRITERIOS DE INSPECCIÓN -->
      <div style="margin-bottom: 10px;">
        <div style="background-color: ${sHeaderBg}; color: ${sHeaderText}; font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; display: flex; justify-content: space-between;">
          <span>${cfg.section4Title || 'IV. CHECKLIST Y CRITERIOS DE INSPECCIÓN'}</span>
          <span style="font-family: monospace; font-size: 8.5px; opacity: 0.9;">
            Críticos: ${report.totalCritical} | Mayores: ${report.totalMajor} | Menores: ${report.totalMinor}
          </span>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${tableBorder}; font-size: 8.5px; table-layout: fixed;">
          <tr style="background-color: ${cellLabelBg}; color: ${cellLabelText}; font-weight: bold;">
            <th style="width: 18%; padding: 3px 4px; border: 1px solid ${tableBorder}; text-align: left;">Categoría</th>
            <th style="width: 38%; padding: 3px 4px; border: 1px solid ${tableBorder}; text-align: left;">Criterio Evaluado</th>
            <th style="width: 12%; padding: 3px 4px; border: 1px solid ${tableBorder}; text-align: center;">Severidad</th>
            <th style="width: 8%; padding: 3px 4px; border: 1px solid ${tableBorder}; text-align: center;">Def.</th>
            <th style="width: 10%; padding: 3px 4px; border: 1px solid ${tableBorder}; text-align: center;">Resultado</th>
            <th style="width: 14%; padding: 3px 4px; border: 1px solid ${tableBorder}; text-align: left;">Observaciones</th>
          </tr>
          ${report.defectItems
            .map((item) => {
              const hasDef = item.defectsFound > 0;
              const sevBg =
                item.severity === 'Critico' ? '#FEE2E2' : item.severity === 'Mayor' ? '#FEF3C7' : '#E2E8F0';
              const sevColor =
                item.severity === 'Critico' ? '#991B1B' : item.severity === 'Mayor' ? '#92400E' : '#334155';
              return `
              <tr style="background-color: ${hasDef ? '#FFF1F2' : '#FFFFFF'};">
                <td style="padding: 2.5px 4px; border: 1px solid ${tableBorder}; font-weight: bold; background-color: #F8FAFC;">${item.category}</td>
                <td style="padding: 2.5px 4px; border: 1px solid ${tableBorder}; font-weight: 500;">
                  <div>${item.name}</div>
                  <div style="font-size: 7.5px; color: #64748B; font-style: italic;">${item.description || ''}</div>
                </td>
                <td style="padding: 2.5px 4px; border: 1px solid ${tableBorder}; text-align: center;">
                  <span style="background-color: ${sevBg}; color: ${sevColor}; padding: 1px 4px; border-radius: 2px; font-weight: bold; font-size: 7.5px;">${item.severity}</span>
                </td>
                <td style="padding: 2.5px 4px; border: 1px solid ${tableBorder}; text-align: center; font-family: monospace; font-weight: bold; color: ${hasDef ? '#DC2626' : '#111827'};">
                  ${item.defectsFound}
                </td>
                <td style="padding: 2.5px 4px; border: 1px solid ${tableBorder}; text-align: center; font-weight: 900; font-size: 8px; color: ${item.passed ? '#16A34A' : '#DC2626'};">
                  ${item.passed ? '✓ CONFORME' : '✗ DESVIACIÓN'}
                </td>
                <td style="padding: 2.5px 4px; border: 1px solid ${tableBorder}; font-size: 8px; color: #475569;">
                  ${item.description && hasDef ? item.description : 'Conforme / Sin hallazgos'}
                </td>
              </tr>
            `;
            })
            .join('')}
        </table>
      </div>

      <!-- SECCIÓN V: EVIDENCIA FOTOGRÁFICA REGISTRADA -->
      <div style="margin-bottom: 10px;">
        <div style="background-color: ${sHeaderBg}; color: ${sHeaderText}; font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">
          ${cfg.section5Title || 'V. CONTROL DE EVIDENCIA FOTOGRÁFICA (EMPAQUETADA EN .ZIP)'}
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${tableBorder}; font-size: 8.5px; text-align: center; table-layout: fixed;">
          <tr style="background-color: #F8FAFC;">
            <td style="padding: 5px; border: 1px solid ${tableBorder};">
              <div style="font-weight: bold;">1. INICIO ALMACÉN</div>
              <div style="font-size: 8px; color: #64748B; margin: 2px 0;">Recepción insumos</div>
              <div style="font-weight: bold; color: ${report.photoInitial.captured ? '#16A34A' : '#D97706'};">
                ${report.photoInitial.captured ? '✓ Foto Registrada' : '○ No Registrada'}
              </div>
            </td>
            <td style="padding: 5px; border: 1px solid ${tableBorder};">
              <div style="font-weight: bold;">2. PROCESO MÓDULO</div>
              <div style="font-size: 8px; color: #64748B; margin: 2px 0;">Línea de armado</div>
              <div style="font-weight: bold; color: ${report.photoProcess.captured ? '#16A34A' : '#D97706'};">
                ${report.photoProcess.captured ? '✓ Foto Registrada' : '○ No Registrada'}
              </div>
            </td>
            <td style="padding: 5px; border: 1px solid ${tableBorder};">
              <div style="font-weight: bold;">3. PIEZA LIBERADA</div>
              <div style="font-size: 8px; color: #64748B; margin: 2px 0;">Detalle terminado</div>
              <div style="font-weight: bold; color: ${report.photoReleasedPiece.captured ? '#16A34A' : '#D97706'};">
                ${report.photoReleasedPiece.captured ? '✓ Foto Registrada' : '○ No Registrada'}
              </div>
            </td>
            <td style="padding: 5px; border: 1px solid ${tableBorder};">
              <div style="font-weight: bold;">4. PT ENTARIMADO</div>
              <div style="font-size: 8px; color: #64748B; margin: 2px 0;">Pallet CVD-AMA-F-03</div>
              <div style="font-weight: bold; color: ${report.photoPalletized.captured ? '#16A34A' : '#D97706'};">
                ${report.photoPalletized.captured ? '✓ Foto Registrada' : '○ No Registrada'}
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- SECCIÓN VI: DICTAMEN FINAL Y OBSERVACIONES -->
      <div style="margin-bottom: 10px;">
        <div style="background-color: ${sHeaderBg}; color: ${sHeaderText}; font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">
          ${cfg.section6Title || 'VI. DICTAMEN FINAL Y PLAN DE ACCIÓN'}
        </div>
        <div style="border: 1.5px solid ${tableBorder}; padding: 6px 8px; background-color: #FFFFFF;">
          
          <!-- Estatus y Etiqueta -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 5px; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: bold; font-size: 9.5px; text-transform: uppercase;">DICTAMEN:</span>
              <span style="background-color: ${isApproved ? '#16A34A' : isRejected ? '#DC2626' : '#D97706'}; color: #FFFFFF; font-weight: 900; font-size: 10px; padding: 2px 8px; border-radius: 3px; letter-spacing: 0.5px;">
                ${report.status}
              </span>
              <span style="font-size: 8.5px; font-family: monospace; color: #475569;">
                [${isApproved ? 'X' : ' '}] APROBADO &nbsp; [${isRejected ? 'X' : ' '}] RECHAZADO &nbsp; [${report.status === 'CONDICIONADO' ? 'X' : ' '}] CONDICIONADO
              </span>
            </div>
            <div>
              <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; border: 1px solid #CBD5E1; padding: 2px 6px; background-color: #F8FAFC;">
                ETIQUETA: <strong>${report.tagColor || 'Verde'}</strong>
              </span>
            </div>
          </div>

          <!-- Observaciones -->
          <div style="margin-bottom: 5px;">
            <div style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 2px;">
              Observaciones Técnicas de Calidad:
            </div>
            <div style="font-size: 9px; background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 4px 6px; min-height: 24px; font-style: ${report.observaciones ? 'normal' : 'italic'}; color: ${report.observaciones ? '#1E293B' : '#94A3B8'};">
              ${report.observaciones || 'Sin observaciones adicionales registradas.'}
            </div>
          </div>

          <!-- Plan de Acción -->
          <div>
            <div style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 2px;">
              Plan de Acción / Medidas Correctivas:
            </div>
            <div style="font-size: 9px; background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 4px 6px; min-height: 24px; font-style: ${report.planDeAccion ? 'normal' : 'italic'}; color: ${report.planDeAccion ? '#1E293B' : '#94A3B8'};">
              ${report.planDeAccion || 'El lote cumple los requerimientos de calidad para liberación.'}
            </div>
          </div>

        </div>
      </div>

      <!-- SECCIÓN VII: FIRMAS DE CONFORMIDAD -->
      <div style="margin-bottom: 8px;">
        <div style="background-color: ${sHeaderBg}; color: ${sHeaderText}; font-weight: bold; padding: 4px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">
          ${cfg.section7Title || 'VII. FIRMAS DE CONFORMIDAD Y APROBACIÓN'}
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${tableBorder}; font-size: 9px; table-layout: fixed;">
          <tr>
            <!-- Firma Calidad -->
            <td style="width: 50%; border: 1px solid ${tableBorder}; padding: 8px; text-align: center; vertical-align: bottom; background-color: #FFFFFF;">
              <div style="font-weight: bold; font-size: 8.5px; color: #64748B; margin-bottom: 4px; text-transform: uppercase;">
                1. INSPECCIÓN Y LIBERACIÓN DE CALIDAD
              </div>
              <div style="min-height: 40px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                ${
                  report.firmaCalidad?.signatureDataUrl
                    ? `<img src="${report.firmaCalidad.signatureDataUrl}" style="max-height: 36px; max-width: 80%; display: block; margin: 0 auto;" alt="Firma Calidad" />`
                    : `<div style="font-size: 8px; color: #94A3B8; font-style: italic;">[Firma / Rúbrica Digital o Autógrafa]</div>`
                }
              </div>
              <div style="border-top: 1px solid #1E293B; padding-top: 3px; font-weight: bold; font-size: 9.5px; color: #1E293B;">
                ${report.firmaCalidad?.nombre || report.inspectorName || 'SUPERVISOR DE CALIDAD'}
              </div>
              <div style="font-size: 7.5px; color: #64748B; font-weight: bold; text-transform: uppercase; margin-top: 1px;">
                REALIZÓ INSPECCIÓN (CALIDAD)
              </div>
              <div style="font-size: 7.5px; color: #94A3B8; font-family: monospace;">
                Fecha: ${report.firmaCalidad?.fecha || report.inspectionDate || 'Pendiente'}
              </div>
            </td>

            <!-- Firma Maquila -->
            <td style="width: 50%; border: 1px solid ${tableBorder}; padding: 8px; text-align: center; vertical-align: bottom; background-color: #FFFFFF;">
              <div style="font-weight: bold; font-size: 8.5px; color: #64748B; margin-bottom: 4px; text-transform: uppercase;">
                2. CONFORMIDAD Y APROBACIÓN DE MAQUILA
              </div>
              <div style="min-height: 40px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                ${
                  report.firmaMaquila?.signatureDataUrl
                    ? `<img src="${report.firmaMaquila.signatureDataUrl}" style="max-height: 36px; max-width: 80%; display: block; margin: 0 auto;" alt="Firma Maquila" />`
                    : `<div style="font-size: 8px; color: #94A3B8; font-style: italic;">[Firma / Rúbrica Digital o Autógrafa]</div>`
                }
              </div>
              <div style="border-top: 1px solid #1E293B; padding-top: 3px; font-weight: bold; font-size: 9.5px; color: #1E293B;">
                ${report.firmaMaquila?.nombre || 'SUPERVISIÓN DE MAQUILA'}
              </div>
              <div style="font-size: 7.5px; color: #64748B; font-weight: bold; text-transform: uppercase; margin-top: 1px;">
                APRUEBA INSPECCIÓN (MAQUILA)
              </div>
              <div style="font-size: 7.5px; color: #94A3B8; font-family: monospace;">
                Fecha: ${report.firmaMaquila?.fecha || report.inspectionDate || 'Pendiente'}
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- PIE DE PÁGINA NORMATIVO -->
      <div style="border-top: 1px solid ${tableBorder}; padding-top: 4px; font-size: 7.5px; font-family: monospace; display: flex; justify-content: space-between; color: ${subtitleText};">
        <span>${report.folioCode || cfg.documentCode || 'CVD-CCA-F-08'}, v${report.version || cfg.version || '00'}. Documento normativo Suave y Fácil S.A. de C.V.</span>
        <span style="font-weight: bold; color: ${cellValText};">Página 1 de 1 (Carta 8.5" x 11")</span>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    // Renderizar con html2canvas a alta resolución
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
      windowWidth: 816,
    });

    // Dimensiones Letter estándar: 215.9 mm x 279.4 mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
      compress: true,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    const pdfWidth = 215.9;
    const pdfHeight = 279.4;

    // Margen seguro de 6 mm
    const margin = 6;
    const maxPrintableWidth = pdfWidth - margin * 2;
    const maxPrintableHeight = pdfHeight - margin * 2;

    const imgRatio = canvas.width / canvas.height;
    const availableRatio = maxPrintableWidth / maxPrintableHeight;

    let finalWidth = maxPrintableWidth;
    let finalHeight = maxPrintableWidth / imgRatio;

    // Si excede la altura de la hoja carta, escalar proporcionalmente para que encaje 100% perfecto
    if (finalHeight > maxPrintableHeight) {
      finalHeight = maxPrintableHeight;
      finalWidth = finalHeight * imgRatio;
    }

    // Centrar horizontalmente si el ancho resultante es menor
    const offsetX = margin + (maxPrintableWidth - finalWidth) / 2;
    const offsetY = margin + (maxPrintableHeight - finalHeight) / 2;

    pdf.addImage(imgData, 'JPEG', offsetX, offsetY, finalWidth, finalHeight);

    // Generar Blob
    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}
