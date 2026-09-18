import { QualityReport } from '../types/qualityReport';
import { calculateAQLPlan } from '../utils/aqlTable';
import { DEFAULT_CHECKLIST_ITEMS } from '../utils/defaultChecklist';

const aqlCoppel = calculateAQLPlan(924, 'General II', 1.5);
const aqlStock = calculateAQLPlan(300, 'General II', 1.5);
const aqlMeli = calculateAQLPlan(30, 'General II', 1.5);

export const SAMPLE_REPORTS: QualityReport[] = [
  {
    id: 'report-2420',
    folioCode: 'CVD-CCA-F-08',
    version: '00',
    revisionDate: '2026-08-03',
    folioOT: 'OT-2420',
    folioMaquila: '2420',
    
    inspectorName: 'Ing. Carlos Mendoza (Calidad)',
    inspectionDate: '2026-06-04',
    startTime: '10:30',
    endTime: '15:10',
    durationMinutes: 280,

    skuArmado: 'C0450-01',
    descripcionArmado: 'COMAL JADE NUEVA GENERACION (32 CM CON DISCO DIFUSOR) CON UTENSILIO LISO JADE',
    claveCompuesta: 'C0450-00/C0456-01',
    cliente: 'STOCK (COPPEL)',
    tipoMaquila: 'Armado Físico + Utensilio',
    moduloMaquila: 'Mesa 1',
    modulosMaquila: ['Mesa 1'],
    encargadoModulo: 'Eugenio López (Maquila)',

    totalLotSize: 924,
    totalTarimas: 8,
    piezasPorTarima: 115,

    inspectionLevel: 'General II',
    aqlTarget: 1.5,
    codeLetter: aqlCoppel.codeLetter,
    sampleSizeRequired: aqlCoppel.sampleSize,
    sampleSizeInspected: 80,
    acLimit: aqlCoppel.ac,
    reLimit: aqlCoppel.re,

    defectItems: DEFAULT_CHECKLIST_ITEMS.map((item) => {
      if (item.id === 'block-may-03') {
        return {
          ...item,
          defectsFound: 12, // 12 sampled boxes damaged
          description: 'Se detectaron 12 cajas máster aplastadas o rotas en la muestra recibida de Almacén F.',
          passed: false,
        };
      }
      return { ...item, defectsFound: 0, passed: true };
    }),

    totalCritical: 12,
    totalMajor: 0,
    totalMinor: 0,
    totalDefectives: 12,
    defectRatePercentage: 15.0,

    photoInitial: { captured: true, note: 'Foto de caja recibida de Almacén F con tarima incompleta' },
    photoProcess: { captured: true, note: 'Foto de mesa de armado en Módulo 1' },
    photoReleasedPiece: { captured: true, note: 'Detalle de comal sin el utensilio empacado' },
    photoPalletized: { captured: true, note: 'Tarima de producto entarimado identificada' },

    status: 'RECHAZADO',
    tagColor: 'Roja',
    cuarentenaMoved: true,
    notificationSent40min: true,
    observaciones: 'RECHAZADO POR CRITERIO AQL 1.5%: Se detectó un faltante físico de 120 piezas de utensilio liso Jade en el lote surtido por Almacén F. La muestra superó el límite de rechazo Re=3.',
    planDeAccion: '1. Trasladar las 8 tarimas al área de Cuarentena con etiqueta Roja de Producto No Conforme.\n2. Notificar vía correo electrónico a Supervisor de Maquila y Gerente de Almacén F en menos de 40 minutos.\n3. Solicitar resurtido prioritario de 120 utensilios faltantes a Almacén F para re-trabajo.',

    firmaCalidad: { nombre: 'Ing. Carlos Mendoza', fecha: '2026-06-04 15:10', firmado: true },
    firmaMaquila: { nombre: 'Eugenio López', fecha: '2026-06-04 15:15', firmado: true },
    firmaAlmacen: { nombre: 'Lic. Roberto Silva', fecha: '2026-06-04 15:20', firmado: true, localizador: 'A-12-04 (Cuarentena)' },

    updatedAt: '2026-06-04T15:20:00Z',
  },
  {
    id: 'report-2507',
    folioCode: 'CVD-CCA-F-08',
    version: '00',
    revisionDate: '2026-08-03',
    folioOT: 'OT-2507',
    folioMaquila: '2507',

    inspectorName: 'Lic. Laura Martínez (Calidad)',
    inspectionDate: '2026-06-22',
    startTime: '12:50',
    endTime: '15:10',
    durationMinutes: 140,

    skuArmado: 'C0361-23',
    descripcionArmado: 'SARTEN DE 20 CM, X4 JADECHEF CON UTENSILIO LISO JADE',
    claveCompuesta: 'C0361-00/C0456-01',
    cliente: 'STOCK',
    tipoMaquila: 'Armado Combo 4X',
    moduloMaquila: 'Módulo 2',
    encargadoModulo: 'Gabriel Torres (Maquila)',

    totalLotSize: 300,
    totalTarimas: 3,
    piezasPorTarima: 100,

    inspectionLevel: 'General II',
    aqlTarget: 1.5,
    codeLetter: aqlStock.codeLetter,
    sampleSizeRequired: aqlStock.sampleSize,
    sampleSizeInspected: 50,
    acLimit: aqlStock.ac,
    reLimit: aqlStock.re,

    defectItems: DEFAULT_CHECKLIST_ITEMS.map((item) => {
      if (item.id === 'block-men-03') {
        return {
          ...item,
          defectsFound: 1,
          description: 'Sobrante menor de 1 pz con pliegue en cinta sin abertura. No compromete la protección.',
          passed: true,
        };
      }
      return { ...item, defectsFound: 0, passed: true };
    }),

    totalCritical: 0,
    totalMajor: 1,
    totalMinor: 0,
    totalDefectives: 1,
    defectRatePercentage: 2.0,

    photoInitial: { captured: true, note: 'Ingreso de tarimas desde Almacén F' },
    photoProcess: { captured: true, note: 'Empaque y encintado en Módulo 2' },
    photoReleasedPiece: { captured: true, note: 'Juego de sartenes liberado en revisión' },
    photoPalletized: { captured: true, note: 'Estiba terminada con formato CVD-AMA-F-03' },

    status: 'APROBADO',
    tagColor: 'Verde',
    cuarentenaMoved: false,
    notificationSent40min: false,
    observaciones: 'LOTE APROBADO: El lote de 300 unidades cumple satisfactoriamente con los criterios de calidad visual, funcional y empaque. La muestra presentó 1 hallazgo no crítico (Ac=2), por lo que se procede a liberación física.',
    planDeAccion: 'Colocar Etiqueta Verde de Liberación en cada tarima y transferir al stock disponible de Almacén F.',

    firmaCalidad: { nombre: 'Lic. Laura Martínez', fecha: '2026-06-22 15:10', firmado: true },
    firmaMaquila: { nombre: 'Gabriel Torres', fecha: '2026-06-22 15:12', firmado: true },
    firmaAlmacen: { nombre: 'Hugo Ramírez', fecha: '2026-06-22 15:15', firmado: true, localizador: 'RAC-04-B' },

    updatedAt: '2026-06-22T15:15:00Z',
  }
];
