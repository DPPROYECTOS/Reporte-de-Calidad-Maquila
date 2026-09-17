export type InspectionLevel = 'General II' | 'General I' | 'General III' | 'Especial S-3';

export type AQLTarget = 0.65 | 1.0 | 1.5 | 2.5 | 4.0;

export type DefectSeverity = 'Critico' | 'Mayor' | 'Menor';

export type DefectCategory =
  | 'Empaque y Cajas'
  | 'Etiquetado y Códigos'
  | 'Armado y Componentes'
  | 'Apariencia Físico-Cosmética'
  | 'Estiba y Paletizado';

export interface DefectCheckItem {
  id: string;
  category: DefectCategory;
  name: string;
  severity: DefectSeverity;
  defectsFound: number;
  description?: string;
  passed: boolean;
}

export interface ComboComponentItem {
  sku: string; // clave individual (e.g. "C0192-00")
  descripcion: string; // descripcion individual (e.g. "SET DE 10 PIEZAS JADECOOK CHEF")
  cantidad: number; // cantidad de piezas individuales por armado (e.g. 1)
  unidad?: string; // e.g. "pieza" o "piezas"
}

export type LotStatus = 'APROBADO' | 'RECHAZADO' | 'CONDICIONADO';

export interface PhotoEvidenceCategory {
  captured: boolean;
  url?: string;
  urls?: string[]; // Soporte para múltiples fotos por apartado
  note?: string;
}

export interface QualityReport {
  id: string;
  folioCode: string; // e.g. "CVD-CCA-F-08"
  version: string; // e.g. "00" or "NUEVO"
  revisionDate: string; // e.g. "2026-08-03"
  folioOT: string; // e.g. "OT-2420"
  folioMaquila: string; // e.g. "2420"
  
  // General Data
  inspectorName: string;
  inspectionDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;

  // Control Data
  skuArmado: string; // e.g. "C0361-02"
  descripcionArmado: string; // e.g. "SARTEN DE 20 CM, 24 CM Y 28 CM, X4 JADECHEF"
  claveCompuesta: string; // e.g. "C0359-00/C0360-00/C0361-00"
  componentesArmado?: ComboComponentItem[]; // Componentes individuales del armado (clave, descripción, cantidad)
  tipoMaquila: string; // e.g. "Armado Físico", "Etiquetado", "Virtual"
  cliente?: string; // (Deprecado/Opcional - ya no aplica a Calidad)
  moduloMaquila?: string; // (Deprecado/Opcional - ya no aplica a Calidad)
  modulosMaquila?: string[]; // (Deprecado/Opcional)
  encargadoModulo?: string; // (Deprecado/Opcional)
  
  // Quantities
  totalLotSize: number; // Piezas Maquiladas (N)
  totalTarimas: number;
  piezasPorTarima: number;

  // AQL Sampling Plan
  inspectionLevel: InspectionLevel;
  aqlTarget: AQLTarget;
  codeLetter: string;
  sampleSizeRequired: number; // n
  sampleSizeInspected: number; // n real
  acLimit: number; // Acceptance limit
  reLimit: number; // Rejection limit

  // Defect Items
  defectItems: DefectCheckItem[];

  // Defect Totals
  totalCritical: number;
  totalMajor: number;
  totalMinor: number;
  totalDefectives: number;
  defectRatePercentage: number;

  // Photographic Evidence (4 mandatory categories, each supports multiple photos)
  photoInitial: PhotoEvidenceCategory;
  photoProcess: PhotoEvidenceCategory;
  photoReleasedPiece: PhotoEvidenceCategory;
  photoPalletized: PhotoEvidenceCategory;
  customPhotos?: Record<string, PhotoEvidenceCategory>;

  // Disposition / Dictamen
  status: LotStatus;
  tagColor: 'Verde' | 'Roja' | 'Amarilla';
  cuarentenaMoved: boolean;
  notificationSent40min: boolean;
  observaciones: string;
  planDeAccion: string;

  // Signatures (Exactamente 2 firmas operativas: Calidad y Maquila)
  firmaCalidad: { 
    nombre: string; 
    fecha: string; 
    firmado: boolean; 
    cargo?: string; // Inspector o Supervisor de Calidad que realizó la inspección
    signatureDataUrl?: string; 
  };
  firmaMaquila: { 
    nombre: string; 
    fecha: string; 
    firmado: boolean; 
    cargo?: string; // Supervisor de Maquila que aprueba la inspección realizada
    signatureDataUrl?: string; 
  };
  firmaAlmacen?: { nombre: string; fecha: string; firmado: boolean; localizador?: string; signatureDataUrl?: string }; // Deprecado / Opcional para retrocompatibilidad

  // ZIP File attachment metadata
  zipAttachment?: {
    filename: string;
    sizeBytes: number;
    uploadedAt: string;
    filesCount: number;
  };

  updatedAt: string;
}
