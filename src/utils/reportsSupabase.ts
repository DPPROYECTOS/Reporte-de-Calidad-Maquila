import { QualityReport } from '../types/qualityReport';
import { proxyDbGet, proxyDbPost, proxyDbPut, proxyDbDelete } from '../lib/supabase';

export interface QualityReportRow {
  id: string;
  folio_ot: string;
  folio_maquila?: string;
  sku_armado: string;
  descripcion_armado?: string;
  inspector_name: string;
  inspection_date: string;
  status: string;
  total_lot_size: number;
  sample_size_required: number;
  sample_size_inspected: number;
  total_defectives: number;
  data: QualityReport;
  created_at?: string;
  updated_at?: string;
}

/**
 * Convierte un objeto QualityReport al formato de fila para la tabla quality_reports en Supabase
 */
export function reportToRow(report: QualityReport): QualityReportRow {
  const startTime = report.startTime || '08:00';
  const endTime = report.endTime || '09:00';
  let durationMinutes = report.durationMinutes;
  if (typeof durationMinutes !== 'number' || durationMinutes <= 0) {
    const [h1, m1] = startTime.split(':').map(Number);
    const [h2, m2] = endTime.split(':').map(Number);
    if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
      const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      durationMinutes = diff > 0 ? diff : 60;
    } else {
      durationMinutes = 60;
    }
  }

  const enrichedReport: QualityReport = {
    ...report,
    startTime,
    endTime,
    durationMinutes,
  };

  return {
    id: report.id,
    folio_ot: report.folioOT || '',
    folio_maquila: report.folioMaquila || '',
    sku_armado: report.skuArmado || '',
    descripcion_armado: report.descripcionArmado || '',
    inspector_name: report.inspectorName || '',
    inspection_date: report.inspectionDate || new Date().toISOString().split('T')[0],
    status: report.status || 'APROBADO',
    total_lot_size: report.totalLotSize || 0,
    sample_size_required: report.sampleSizeRequired || 0,
    sample_size_inspected: report.sampleSizeInspected || 0,
    total_defectives: report.totalDefectives || 0,
    data: enrichedReport,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Convierte una fila de Supabase al objeto QualityReport
 */
export function rowToReport(row: QualityReportRow): QualityReport {
  if (row.data && typeof row.data === 'object' && row.data.id) {
    return {
      ...row.data,
      id: row.id,
      folioOT: row.folio_ot || row.data.folioOT,
      skuArmado: row.sku_armado || row.data.skuArmado,
      status: (row.status as any) || row.data.status,
      inspectorName: row.inspector_name || row.data.inspectorName,
      inspectionDate: row.inspection_date || row.data.inspectionDate,
      startTime: row.data.startTime || '08:00',
      endTime: row.data.endTime || '09:00',
      durationMinutes: row.data.durationMinutes ?? 60,
    };
  }

  // Fallback si la columna data viniera vacía
  return {
    id: row.id,
    folioCode: 'CVD-CCA-F-08',
    version: '00',
    revisionDate: '2026-08-03',
    folioOT: row.folio_ot,
    folioMaquila: row.folio_maquila || '',
    inspectorName: row.inspector_name,
    inspectionDate: row.inspection_date,
    startTime: '08:00',
    endTime: '09:00',
    durationMinutes: 60,
    skuArmado: row.sku_armado,
    descripcionArmado: row.descripcion_armado || '',
    claveCompuesta: '',
    tipoMaquila: 'Armado Físico',
    totalLotSize: row.total_lot_size || 0,
    totalTarimas: 0,
    piezasPorTarima: 100,
    inspectionLevel: 'General II',
    aqlTarget: 1.5,
    codeLetter: 'H',
    sampleSizeRequired: row.sample_size_required || 50,
    sampleSizeInspected: row.sample_size_inspected || 50,
    acLimit: 2,
    reLimit: 3,
    defectItems: [],
    totalCritical: 0,
    totalMajor: 0,
    totalMinor: 0,
    totalDefectives: row.total_defectives || 0,
    defectRatePercentage: 0,
    photoInitial: { captured: false },
    photoProcess: { captured: false },
    photoReleasedPiece: { captured: false },
    photoPalletized: { captured: false },
    status: (row.status as any) || 'APROBADO',
    tagColor: 'Verde',
    cuarentenaMoved: false,
    notificationSent40min: false,
    observaciones: '',
    planDeAccion: '',
    firmaCalidad: { nombre: row.inspector_name, fecha: row.inspection_date, firmado: false },
    firmaMaquila: { nombre: '', fecha: row.inspection_date, firmado: false },
    firmaAlmacen: { nombre: '', fecha: row.inspection_date, firmado: false },
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Consulta todos los reportes desde la tabla quality_reports en Supabase
 */
export async function fetchReportsFromSupabase(): Promise<{
  success: boolean;
  reports: QualityReport[];
  fromCloud: boolean;
  error?: string;
}> {
  try {
    const res = await proxyDbGet<QualityReportRow>('quality_reports', {
      limit: 100,
      order: { column: 'updated_at', ascending: false },
    });

    if (res.data && res.data.length > 0) {
      const reports = res.data.map(rowToReport);
      return { success: true, reports, fromCloud: true };
    }

    return { success: true, reports: [], fromCloud: false };
  } catch (err: any) {
    console.warn('Error consultando reportes desde Supabase:', err);
    return { success: false, reports: [], fromCloud: false, error: err?.message || String(err) };
  }
}

/**
 * Guarda o actualiza un reporte en la tabla quality_reports en Supabase
 */
export async function saveReportToSupabase(
  report: QualityReport
): Promise<{ success: boolean; error?: string }> {
  try {
    const row = reportToRow(report);
    const res = await proxyDbPost('quality_reports', [row], true);

    if (res.error) {
      console.warn('Error guardando reporte en Supabase:', res.error);
      return { success: false, error: res.error };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Error al enviar reporte a Supabase:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Elimina un reporte de la tabla quality_reports en Supabase
 */
export async function deleteReportFromSupabase(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await proxyDbDelete('quality_reports', id);

    if (res.error) {
      console.warn('Error eliminando reporte en Supabase:', res.error);
      return { success: false, error: res.error };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Error eliminando reporte en Supabase:', err);
    return { success: false, error: err?.message || String(err) };
  }
}
