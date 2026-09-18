import { DefectCheckItem } from '../types/qualityReport';

export const DEFAULT_CHECKLIST_ITEMS: Omit<DefectCheckItem, 'defectsFound' | 'passed'>[] = [
  {
    id: 'block-may-02',
    name: 'Rayón Visible >5mm en Cuerpo o Disco Difusor Abollado',
    severity: 'Mayor',
    category: 'Apariencia Físico-Cosmética',
    description: 'Rayadura que traspasa el esmalte exterior o golpe en la base de inducción de aluminio.',
  },
  {
    id: 'block-may-03',
    name: 'Caja Máster o Empaque Primario Roto / Aplastado',
    severity: 'Mayor',
    category: 'Empaque y Cajas',
    description: 'Cartón colapsado, esquinas vencidas o hendiduras que vulneran la integridad del producto.',
  },
  {
    id: 'block-men-03',
    name: 'Pequeño Pliegue en Cinta de Sellado sin Abertura',
    severity: 'Menor',
    category: 'Empaque y Cajas',
    description: 'Burbuja o pliegue estético en la cinta adhesiva, manteniendo el sellado hermético.',
  },
];
