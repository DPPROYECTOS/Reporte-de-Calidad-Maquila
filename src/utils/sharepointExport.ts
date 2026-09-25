import { QualityReport } from '../types/qualityReport';
import {
  getStoredPowerAutomateWebhookUrl,
  saveStoredPowerAutomateWebhookUrl,
} from './appConfigStore';

export {
  getStoredPowerAutomateWebhookUrl,
  saveStoredPowerAutomateWebhookUrl,
};

export interface SharePointExportPayload {
  accion?: 'REGISTRAR' | 'ELIMINAR_OT';
  folioOT: string;
  numeroMaquila: string;
  numeroPedido: string;
  fecha: string;
  claveArmado: string;
  descripcionArmado: string;
  clavesIndividuales: string;
  piezasInspeccionadas: number;
  observacionesCalidad: string;
  nombreArchivoLocal: string;
  dictamen: string;
  inspector: string;
}

export interface SharePointExportResult {
  success: boolean;
  message: string;
  payload: SharePointExportPayload;
  timestamp: string;
}

export interface PokaYokeRuleResult {
  id: string;
  title: string;
  category: 'CAMPOS_CLAVE' | 'NORMA_ISO' | 'CALIDAD_AQL' | 'CONEXION' | 'DUPLICIDAD';
  passed: boolean;
  message: string;
}

export interface PokaYokeCheckSummary {
  canExport: boolean;
  passedCount: number;
  totalCount: number;
  rules: PokaYokeRuleResult[];
  blockingMessage?: string;
}

const SHAREPOINT_SYNCED_OTS_KEY = 'sharepoint_synced_ots_v1';

export interface SyncedOTRecord {
  folioOT: string;
  numeroMaquila: string;
  numeroPedido: string;
  timestamp: string;
  reportId?: string;
  skuArmado?: string;
  dictamen?: string;
}

/**
 * Obtiene el mapa de órdenes de trabajo (OT) que ya fueron sincronizadas exitosamente a SharePoint.
 */
export function getSyncedOTsMap(): Record<string, SyncedOTRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SHAREPOINT_SYNCED_OTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Verifica si un reporte u OT ya fue exportado a SharePoint para activar el candado anti-duplicados.
 */
export function isOTExportedToSharepoint(target?: string | QualityReport): boolean {
  if (!target) return false;

  // Si es un objeto QualityReport completo
  if (typeof target === 'object') {
    if (target.sharepointExportStatus === 'EXPORTADO') return true;
    const cleanMaq = getCleanNoMaquila(target);
    const cleanPed = getCleanNoPedido(target);
    const cleanOT = getCleanFolioOT(target);
    const map = getSyncedOTsMap();
    if (target.id && map[target.id]) return true;
    if (cleanMaq && (map[cleanMaq] || map[`MAQ_${cleanMaq}`])) return true;
    if (cleanPed && (map[cleanPed] || map[`PED_${cleanPed}`])) return true;
    if (cleanOT && map[cleanOT]) return true;
    return false;
  }

  // Si es una cadena (folio)
  const clean = target.trim();
  if (!clean) return false;
  const digitsOnly = clean.replace(/[^0-9]/g, '');
  const map = getSyncedOTsMap();
  return Boolean(
    map[clean] || 
    (digitsOnly && map[digitsOnly]) || 
    map[`MAQ_${clean}`] || 
    map[`PED_${clean}`]
  );
}

/**
 * Obtiene el registro detallado de la exportación de una OT en SharePoint.
 */
export function getOTSharepointRecord(target?: string | QualityReport): SyncedOTRecord | null {
  if (!target) return null;
  const map = getSyncedOTsMap();

  if (typeof target === 'object') {
    if (target.id && map[target.id]) return map[target.id];
    const cleanMaq = getCleanNoMaquila(target);
    const cleanPed = getCleanNoPedido(target);
    const cleanOT = getCleanFolioOT(target);
    if (cleanMaq && map[cleanMaq]) return map[cleanMaq];
    if (cleanPed && map[cleanPed]) return map[cleanPed];
    if (cleanOT && map[cleanOT]) return map[cleanOT];
    return null;
  }

  const clean = target.trim();
  const digitsOnly = clean.replace(/[^0-9]/g, '');
  return map[clean] || (digitsOnly ? map[digitsOnly] : null) || null;
}

/**
 * Registra una OT / Maquila como exportada en SharePoint para bloquear re-subidas accidentales.
 */
export function markOTAsExported(report: QualityReport): void {
  const cleanOT = getCleanFolioOT(report);
  const cleanMaq = getCleanNoMaquila(report);
  const cleanPed = getCleanNoPedido(report);

  if (typeof window === 'undefined') return;
  try {
    const map = getSyncedOTsMap();
    const nowIso = new Date().toISOString();
    const record: SyncedOTRecord = {
      folioOT: cleanOT || cleanPed || cleanMaq || 'S/N',
      numeroMaquila: cleanMaq,
      numeroPedido: cleanPed,
      timestamp: nowIso,
      reportId: report.id,
      skuArmado: report.skuArmado,
      dictamen: report.status,
    };

    if (report.id) map[report.id] = record;
    if (cleanOT) map[cleanOT] = record;
    if (cleanMaq) {
      map[cleanMaq] = record;
      map[`MAQ_${cleanMaq}`] = record;
    }
    if (cleanPed) {
      map[cleanPed] = record;
      map[`PED_${cleanPed}`] = record;
    }
    if (report.folioOT && report.folioOT.trim()) {
      map[report.folioOT.trim()] = record;
    }

    localStorage.setItem(SHAREPOINT_SYNCED_OTS_KEY, JSON.stringify(map));

    // Marcar atributos de trazabilidad en el propio objeto
    report.sharepointExportedAt = nowIso;
    report.sharepointExportStatus = 'EXPORTADO';
    report.sharepointExportMessage = `Exportado exitosamente a Excel SharePoint (Pestañas REGISTRO [Maq: ${cleanMaq}] y EVIDENCIAS [Ped: ${cleanPed}]).`;
  } catch (err) {
    console.error('Error guardando registro de OT exportada:', err);
  }
}

/**
 * Limpia el estado de exportación de una OT para permitir volver a subir la información corregida.
 */
export function clearOTSharepointStatus(target?: string | QualityReport): void {
  if (!target || typeof window === 'undefined') return;

  try {
    const map = getSyncedOTsMap();

    if (typeof target === 'object') {
      const cleanMaq = getCleanNoMaquila(target);
      const cleanPed = getCleanNoPedido(target);
      const cleanOT = getCleanFolioOT(target);
      if (target.id) delete map[target.id];
      if (cleanOT) delete map[cleanOT];
      if (cleanMaq) {
        delete map[cleanMaq];
        delete map[`MAQ_${cleanMaq}`];
      }
      if (cleanPed) {
        delete map[cleanPed];
        delete map[`PED_${cleanPed}`];
      }
      target.sharepointExportStatus = 'PENDIENTE';
      target.sharepointExportedAt = undefined;
      target.sharepointExportMessage = undefined;
    } else {
      const clean = target.trim();
      const digitsOnly = clean.replace(/[^0-9]/g, '');
      delete map[clean];
      delete map[`MAQ_${clean}`];
      delete map[`PED_${clean}`];
      if (digitsOnly) {
        delete map[digitsOnly];
        delete map[`MAQ_${digitsOnly}`];
        delete map[`PED_${digitsOnly}`];
      }
    }

    localStorage.setItem(SHAREPOINT_SYNCED_OTS_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Error eliminando estado de sincronización SharePoint:', err);
  }
}

/**
 * Obtiene el número de maquila limpio (solo números si aplica, para la pestaña REGISTRO / Tabla2).
 */
export function getCleanNoMaquila(report: QualityReport): string {
  if (report.noMaquila && report.noMaquila.trim()) {
    return report.noMaquila.trim();
  }
  if (report.folioMaquila && report.folioMaquila.trim()) {
    return report.folioMaquila.trim();
  }
  if (report.folioOT && report.folioOT.trim()) {
    const digitsOnly = report.folioOT.replace(/[^0-9]/g, '');
    return digitsOnly || report.folioOT.trim();
  }
  return '';
}

/**
 * Obtiene el número de pedido limpio (para la pestaña EVIDENCIAS FOTOGRÁFICAS / Tabla1).
 */
export function getCleanNoPedido(report: QualityReport): string {
  if (report.noPedido && report.noPedido.trim()) {
    return report.noPedido.trim();
  }
  if (report.folioOT && report.folioOT.trim()) {
    return report.folioOT.trim();
  }
  if (report.folioMaquila && report.folioMaquila.trim()) {
    return report.folioMaquila.trim();
  }
  return '';
}

/**
 * Obtiene el folio limpio (solo números si aplica, para coincidir con la columna NO. DE MAQUILA / NO. PEDIDO de Excel).
 */
export function getCleanFolioOT(report: QualityReport): string {
  return getCleanNoMaquila(report) || getCleanNoPedido(report) || '';
}

/**
 * Formatea la fecha de inspección al formato oficial DD/MM/YYYY de la empresa.
 */
export function formatInspectionDateForExcel(dateStr?: string): string {
  if (!dateStr || dateStr === 'Pendiente') {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Si viene en formato YYYY-MM-DD
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
  }

  return dateStr;
}

/**
 * Genera el nombre de archivo local que se descarga a la PC para evitar saturar el almacenamiento de SharePoint.
 */
export function getInspectionLocalPackageFileName(report: QualityReport): string {
  const cleanOT = getCleanFolioOT(report) || 'S_N';
  const sku = (report.skuArmado || 'SKU').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `Inspeccion_${cleanOT}_${sku}.zip`;
}

/**
 * Evalúa los candados Poka-Yoke y normas de calidad (ISO 9001, AQL) para la exportación a SharePoint.
 */
export function checkSharePointPokaYoke(report: QualityReport): PokaYokeCheckSummary {
  const cleanMaquila = getCleanNoMaquila(report);
  const cleanPedido = getCleanNoPedido(report);
  const webhookUrl = getStoredPowerAutomateWebhookUrl();
  const isAlreadyExported = isOTExportedToSharepoint(cleanMaquila || cleanPedido);
  const hasQualitySig = Boolean(report.firmaCalidad?.firmado || report.firmaCalidad?.signatureDataUrl);
  
  const countCategoryPhotos = (cat?: { captured?: boolean; url?: string; urls?: string[] }): number => {
    if (!cat) return 0;
    if (cat.urls && cat.urls.length > 0) return cat.urls.length;
    if (cat.url || cat.captured) return 1;
    return 0;
  };

  const totalPhotosCount = 
    countCategoryPhotos(report.photoInitial) +
    countCategoryPhotos(report.photoProcess) +
    countCategoryPhotos(report.photoReleasedPiece) +
    countCategoryPhotos(report.photoPalletized) +
    Object.values(report.customPhotos || {}).reduce((acc, cat) => acc + countCategoryPhotos(cat), 0);
  const hasPhotos = totalPhotosCount > 0;

  const hasSku = Boolean(report.skuArmado && report.skuArmado.trim());
  const sampleRequired = report.sampleSizeRequired || 0;
  const sampleInspected = report.sampleSizeInspected || 0;
  const aqlCompliant = Boolean(
    sampleRequired > 0 && sampleInspected >= sampleRequired
  );

  const rules: PokaYokeRuleResult[] = [
    {
      id: 'no_maquila',
      title: 'No. de Maquila (Pestaña REGISTRO)',
      category: 'CAMPOS_CLAVE',
      passed: Boolean(cleanMaquila),
      message: cleanMaquila
        ? `No. Maquila: ${cleanMaquila} (Listo para Tabla2 REGISTRO)`
        : 'Falta No. de Maquila. En SharePoint no se podrán insertar los datos sin este identificador.',
    },
    {
      id: 'no_pedido',
      title: 'No. de Pedido (Pestaña EVIDENCIAS)',
      category: 'CAMPOS_CLAVE',
      passed: Boolean(cleanPedido),
      message: cleanPedido
        ? `No. Pedido: ${cleanPedido} (Listo para Tabla1 EVIDENCIAS)`
        : 'Falta No. de Pedido. Necesario para asociar las evidencias fotográficas.',
    },
    {
      id: 'sku_producto',
      title: 'Clave / SKU del Producto',
      category: 'CAMPOS_CLAVE',
      passed: hasSku,
      message: hasSku
        ? `SKU: ${report.skuArmado}`
        : 'Falta especificar el SKU o clave de armado del producto.',
    },
    {
      id: 'firma_calidad',
      title: 'Firma de Liberación de Calidad (Norma ISO 9001)',
      category: 'NORMA_ISO',
      passed: hasQualitySig,
      message: hasQualitySig
        ? `Dictamen firmado por: ${report.firmaCalidad?.nombre || report.inspectorName || 'Inspector'}`
        : 'Falta la firma formal del Inspector de Calidad en el Paso 4 (Requisito ISO 9001 de no-repudio).',
    },
    {
      id: 'muestra_aql',
      title: 'Muestreo de Calidad AQL (Piezas Físicas)',
      category: 'CALIDAD_AQL',
      passed: aqlCompliant,
      message: aqlCompliant
        ? `Muestra completada: ${sampleInspected} de ${sampleRequired} piezas requeridas por AQL`
        : `Muestra incompleta: se han inspeccionado ${sampleInspected} de ${sampleRequired} piezas requeridas por norma.`,
    },
    {
      id: 'evidencias_fotos',
      title: 'Evidencias Fotográficas de Inspección',
      category: 'CALIDAD_AQL',
      passed: hasPhotos,
      message: hasPhotos
        ? `${totalPhotosCount} fotografías registradas`
        : 'No se han capturado fotografías en el Paso 3 para la pestaña de Evidencias.',
    },
    {
      id: 'webhook_url',
      title: 'Conexión Webhook Power Automate',
      category: 'CONEXION',
      passed: Boolean(webhookUrl && webhookUrl.startsWith('http')),
      message: Boolean(webhookUrl && webhookUrl.startsWith('http'))
        ? 'Webhook de SharePoint configurado y activo'
        : 'No se ha configurado la URL del Webhook de Power Automate en los ajustes.',
    },
    {
      id: 'anti_duplicados',
      title: 'Candado Anti-Duplicados en Excel',
      category: 'DUPLICIDAD',
      passed: !isAlreadyExported,
      message: !isAlreadyExported
        ? 'Lote listo para primer envío a SharePoint'
        : `Esta OT ya fue registrada en SharePoint. Debes borrar el registro antes de volver a subir para evitar filas duplicadas.`,
    },
  ];

  const passedCount = rules.filter((r) => r.passed).length;
  const canExport = !isAlreadyExported && Boolean(cleanMaquila) && Boolean(cleanPedido) && hasQualitySig && hasSku && Boolean(webhookUrl);

  let blockingMessage: string | undefined;
  if (isAlreadyExported) {
    blockingMessage = 'Esta OT ya fue registrada en SharePoint. Usa el botón de limpieza para re-subir.';
  } else if (!cleanMaquila) {
    blockingMessage = 'Falta ingresar el No. de Maquila en el Paso 1 para la pestaña REGISTRO.';
  } else if (!cleanPedido) {
    blockingMessage = 'Falta ingresar el No. de Pedido en el Paso 1 para la pestaña EVIDENCIAS.';
  } else if (!hasQualitySig) {
    blockingMessage = 'Falta la firma del Inspector de Calidad en el Paso 4 (Norma ISO 9001).';
  } else if (!webhookUrl) {
    blockingMessage = 'Configura la URL de Webhook de SharePoint en el engrane superior.';
  } else if (!hasSku) {
    blockingMessage = 'Falta la clave SKU del producto inspeccionado.';
  }

  return {
    canExport,
    passedCount,
    totalCount: rules.length,
    rules,
    blockingMessage,
  };
}

/**
 * Prepara la carga útil (Payload) exacta esperada por el flujo de Power Automate de Microsoft.
 */
export function buildSharePointPayload(report: QualityReport): SharePointExportPayload {
  const cleanMaquila = getCleanNoMaquila(report);
  const cleanPedido = getCleanNoPedido(report);
  const cleanOT = cleanMaquila || cleanPedido || getCleanFolioOT(report);
  const formattedDate = formatInspectionDateForExcel(report.inspectionDate);

  // Formatear componentes individuales
  let componentesStr = '';
  if (report.componentesArmado && report.componentesArmado.length > 0) {
    componentesStr = report.componentesArmado
      .map((c) => `${c.sku}${c.descripcion ? ` (${c.descripcion})` : ''}`)
      .join(' / ');
  } else if (report.claveCompuesta) {
    componentesStr = report.claveCompuesta;
  } else {
    componentesStr = report.skuArmado || '';
  }

  // Observaciones de calidad (Paso 4 de la app)
  const obsCalidad = report.observaciones && report.observaciones.trim()
    ? report.observaciones.trim()
    : report.status === 'APROBADO'
    ? 'Sin observaciones de calidad.'
    : `Dictamen: ${report.status}. Se registraron defectos en la inspección.`;

  // Muestra inspeccionada
  const muestra = Number(report.sampleSizeInspected || report.sampleSizeRequired || 0);

  const localPackageName = getInspectionLocalPackageFileName(report);

  return {
    accion: 'REGISTRAR',
    folioOT: cleanOT,
    numeroMaquila: cleanMaquila,
    numeroPedido: cleanPedido,
    fecha: formattedDate,
    claveArmado: report.skuArmado || '',
    descripcionArmado: report.descripcionArmado || '',
    clavesIndividuales: componentesStr,
    piezasInspeccionadas: muestra,
    observacionesCalidad: obsCalidad,
    nombreArchivoLocal: localPackageName,
    dictamen: report.status || 'APROBADO',
    inspector: report.firmaCalidad?.nombre || report.inspectorName || 'Inspector Calidad',
  };
}

/**
 * Envía la información de la inspección a Microsoft SharePoint / Excel Online mediante el Webhook de Power Automate.
 * Si ya fue subida anteriormente, se bloquea la subida para evitar duplicidad.
 */
export async function exportInspectionToSharepointExcel(
  report: QualityReport,
  customWebhookUrl?: string
): Promise<SharePointExportResult> {
  const webhookUrl = customWebhookUrl || getStoredPowerAutomateWebhookUrl();

  // Validación estricta de Candados Poka-Yoke antes de cualquier transmisión
  const pokaYoke = checkSharePointPokaYoke(report);
  if (!pokaYoke.canExport) {
    throw new Error(
      `Candado Poka-Yoke de Calidad Activo: ${pokaYoke.blockingMessage || 'No se cumplen los requisitos mínimos para exportar a SharePoint.'}`
    );
  }

  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    throw new Error(
      'No se ha configurado una URL válida de Webhook de Power Automate. Por favor verifica la configuración.'
    );
  }

  const payload = buildSharePointPayload(report);

  if (!payload.numeroMaquila) {
    throw new Error(
      'No se ha especificado el No. de Maquila. Es estrictamente obligatorio para poder insertar la fila en la pestaña REGISTRO (Tabla2) de Excel.'
    );
  }

  if (!payload.numeroPedido) {
    throw new Error(
      'No se ha especificado el No. de Pedido. Es necesario para vincular la pestaña EVIDENCIAS FOTOGRÁFICAS (Tabla1) de Excel.'
    );
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      errorDetail = await response.text();
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(
      `Power Automate devolvió un error (${response.status}): ${errorDetail || 'No se pudo completar la operación en SharePoint'}`
    );
  }

  // Registrar localmente que esta OT ya fue enviada para activar el bloqueo anti-duplicados
  markOTAsExported(report);

  return {
    success: true,
    message: `✓ Exportación completada con éxito a Excel SharePoint (CVD-CCA-F-08).`,
    payload,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Solicita el borrado o limpieza de una OT en SharePoint (vía Power Automate) y desbloquea la re-subida en la app.
 */
export async function deleteInspectionFromSharepoint(
  report: QualityReport,
  customWebhookUrl?: string
): Promise<{ success: boolean; message: string }> {
  const webhookUrl = customWebhookUrl || getStoredPowerAutomateWebhookUrl();
  const cleanOT = getCleanFolioOT(report);

  if (!cleanOT) {
    throw new Error('No se encontró un folio de OT válido para limpiar en SharePoint.');
  }

  // Si hay webhook configurado, enviamos la instrucción accion: "ELIMINAR_OT"
  if (webhookUrl && webhookUrl.startsWith('http')) {
    try {
      const payload: SharePointExportPayload = {
        ...buildSharePointPayload(report),
        accion: 'ELIMINAR_OT',
      };
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('Advertencia al notificar eliminación de OT a Power Automate:', err);
    }
  }

  // Limpiar el estado de bloqueo para permitir volver a subir
  clearOTSharepointStatus(report);
  clearOTSharepointStatus(cleanOT);
  if (report.folioOT) {
    clearOTSharepointStatus(report.folioOT);
  }

  return {
    success: true,
    message: `Se ha limpiado el registro de la OT ${cleanOT} de SharePoint. Ahora puedes subir la información corregida.`,
  };
}

/**
 * Realiza una prueba de ping y conectividad en vivo con el Webhook de Power Automate
 * sin insertar registros definitivos en Excel ni alterar datos productivos.
 */
export async function testPowerAutomateWebhookConnection(
  customWebhookUrl?: string
): Promise<{ success: boolean; statusCode?: number; latencyMs: number; message: string }> {
  const webhookUrl = customWebhookUrl || getStoredPowerAutomateWebhookUrl();

  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    throw new Error('Ingresa una URL válida de Power Automate que empiece con https://');
  }

  const startTime = Date.now();
  const testPayload = {
    accion: 'PING_TEST',
    folioOT: 'TEST-PING',
    numeroMaquila: '9999',
    numeroPedido: 'PED-TEST',
    fecha: new Date().toLocaleDateString('es-MX'),
    claveArmado: 'PING-01',
    descripcionArmado: 'PRUEBA DE CONECTIVIDAD WEBHOOK POWER AUTOMATE',
    clavesIndividuales: 'PING-01',
    piezasInspeccionadas: 1,
    observacionesCalidad: 'Ping de prueba de conexión desde la app de calidad.',
    nombreArchivoLocal: 'ping_test.zip',
    dictamen: 'APROBADO',
    inspector: 'Test Ping',
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const latencyMs = Date.now() - startTime;

    if (response.ok || response.status === 202 || response.status === 200) {
      return {
        success: true,
        statusCode: response.status,
        latencyMs,
        message: `✓ Conexión exitosa con Power Automate (HTTP ${response.status} en ${latencyMs}ms). El webhook está activo y escuchando.`,
      };
    } else {
      let detail = '';
      try {
        detail = await response.text();
      } catch {
        detail = response.statusText;
      }
      return {
        success: false,
        statusCode: response.status,
        latencyMs,
        message: `El webhook respondió con error HTTP ${response.status}: ${detail || 'Respuesta no válida'}.`,
      };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      message: `Error de red al conectar con Power Automate (${latencyMs}ms): ${err?.message || 'Verifica que la URL no esté bloqueada por CORS o caída'}.`,
    };
  }
}

export interface BatchExportItemResult {
  reportId: string;
  folioOT: string;
  numeroMaquila: string;
  numeroPedido: string;
  skuArmado: string;
  success: boolean;
  message: string;
  error?: string;
}

export interface BatchExportSummary {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: BatchExportItemResult[];
}

/**
 * Exporta un lote de inspecciones secuencialmente hacia SharePoint con validación individual
 * Poka-Yoke y prevención de concurrencia en Excel Online.
 */
export async function batchExportToSharepointExcel(
  reports: QualityReport[],
  onProgress?: (processed: number, total: number, currentItem: QualityReport, itemResult: BatchExportItemResult) => void
): Promise<BatchExportSummary> {
  const summary: BatchExportSummary = {
    total: reports.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };

  for (let i = 0; i < reports.length; i++) {
    const rep = reports[i];
    const cleanMaq = getCleanNoMaquila(rep);
    const cleanPed = getCleanNoPedido(rep);
    const cleanOT = getCleanFolioOT(rep) || cleanPed || cleanMaq || 'S/N';

    // Verificar si ya fue exportado previamente
    if (isOTExportedToSharepoint(rep)) {
      const skippedResult: BatchExportItemResult = {
        reportId: rep.id,
        folioOT: cleanOT,
        numeroMaquila: cleanMaq,
        numeroPedido: cleanPed,
        skuArmado: rep.skuArmado || '',
        success: true,
        message: 'Omitido: Ya fue exportado previamente a SharePoint.',
      };
      summary.skipped++;
      summary.results.push(skippedResult);
      if (onProgress) onProgress(i + 1, reports.length, rep, skippedResult);
      continue;
    }

    // Comprobar candados Poka-Yoke
    const pokaYoke = checkSharePointPokaYoke(rep);
    if (!pokaYoke.canExport) {
      const failResult: BatchExportItemResult = {
        reportId: rep.id,
        folioOT: cleanOT,
        numeroMaquila: cleanMaq,
        numeroPedido: cleanPed,
        skuArmado: rep.skuArmado || '',
        success: false,
        message: `Poka-Yoke: ${pokaYoke.blockingMessage || 'Faltan requisitos obligatorios'}`,
        error: pokaYoke.blockingMessage,
      };
      summary.failed++;
      summary.results.push(failResult);
      if (onProgress) onProgress(i + 1, reports.length, rep, failResult);
      continue;
    }

    // Intentar exportación
    try {
      const res = await exportInspectionToSharepointExcel(rep);
      const okResult: BatchExportItemResult = {
        reportId: rep.id,
        folioOT: cleanOT,
        numeroMaquila: cleanMaq,
        numeroPedido: cleanPed,
        skuArmado: rep.skuArmado || '',
        success: true,
        message: res.message,
      };
      summary.successful++;
      summary.results.push(okResult);
      if (onProgress) onProgress(i + 1, reports.length, rep, okResult);

      // Pausa de 600ms para evitar bloqueo de concurrencia en la hoja de Excel en SharePoint
      if (i < reports.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    } catch (err: any) {
      const errResult: BatchExportItemResult = {
        reportId: rep.id,
        folioOT: cleanOT,
        numeroMaquila: cleanMaq,
        numeroPedido: cleanPed,
        skuArmado: rep.skuArmado || '',
        success: false,
        message: err?.message || 'Error en Power Automate',
        error: err?.message,
      };
      summary.failed++;
      summary.results.push(errResult);
      if (onProgress) onProgress(i + 1, reports.length, rep, errResult);
    }
  }

  return summary;
}
