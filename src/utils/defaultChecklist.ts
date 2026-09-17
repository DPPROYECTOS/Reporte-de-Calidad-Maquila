import { DefectCheckItem } from '../types/qualityReport';

export const DEFAULT_CHECKLIST_ITEMS: Omit<DefectCheckItem, 'defectsFound' | 'passed'>[] = [
  // Empaque y Cajas
  {
    id: 'emp-01',
    category: 'Empaque y Cajas',
    name: 'Caja Máster / Empaque Primario sin Daños ni Humedad',
    severity: 'Mayor',
    description: 'Cajas sin aplastamientos, roturas, manchas o humedad que comprometan la protección del producto.',
  },
  {
    id: 'emp-02',
    category: 'Empaque y Cajas',
    name: 'Sellado de Cinta / Fleje / Blister Termo-encogible',
    severity: 'Mayor',
    description: 'Cintas adhesivas corporativas correctamente colocadas, flejes firmes y termo-encogible sin aberturas.',
  },
  
  // Etiquetado y Códigos
  {
    id: 'etiq-01',
    category: 'Etiquetado y Códigos',
    name: 'Etiqueta de Producto Armado (CVD-AMA-F-03) en Tarima',
    severity: 'Mayor',
    description: 'Formato de identificación visible por tarima con clave, cliente, cantidad y firma.',
  },
  {
    id: 'etiq-02',
    category: 'Etiquetado y Códigos',
    name: 'Código de Barras EAN / UPC Legible y Escaneable',
    severity: 'Critico',
    description: 'Código de barras de la clave o kit correcto, sin borrones ni errores de lectura scanner.',
  },
  {
    id: 'etiq-03',
    category: 'Etiquetado y Códigos',
    name: 'Etiqueta de Cliente Especifico (Amazon / Meli / Suburbia)',
    severity: 'Mayor',
    description: 'Verificación de requerimientos de etiquetado Retail/E-commerce según Orden de Trabajo.',
  },

  // Armado y Componentes
  {
    id: 'arm-01',
    category: 'Armado y Componentes',
    name: 'Integridad del Combo (Componentes y Claves Base Correctas)',
    severity: 'Critico',
    description: 'Comprobar que no falten sartenes, tapas, mangos, cuchillos, accesorios ni instructivos del combo.',
  },
  {
    id: 'arm-02',
    category: 'Armado y Componentes',
    name: 'Ensamble y Ajuste Mecánico / Mangos / Tapas',
    severity: 'Mayor',
    description: 'Mangos firmes sin holgura, tapas ajustan correctamente, accesorios fijados de fábrica.',
  },

  // Apariencia Físico-Cosmética
  {
    id: 'cosm-01',
    category: 'Apariencia Físico-Cosmética',
    name: 'Superficie Antiadherente Limpia (Sin Rayaduras ni Despostillados)',
    severity: 'Mayor',
    description: 'Revisión visual del recubrimiento antiadherente de teflón/cerámica sin rayones ni golpes.',
  },
  {
    id: 'cosm-02',
    category: 'Apariencia Físico-Cosmética',
    name: 'Ausencia de Contaminantes, Grasa o Polvo Excesivo',
    severity: 'Menor',
    description: 'Piezas limpias libres de residuos del proceso de empaque o restos de empaque anterior.',
  },

  // Estiba y Paletizado
  {
    id: 'est-01',
    category: 'Estiba y Paletizado',
    name: 'Patrón de Estiba Autorizado por Almacén F',
    severity: 'Mayor',
    description: 'Respetar altura máxima, camas cruzadas autorizadas y tarima en buen estado (1.20 x 1.00 m).',
  },
  {
    id: 'est-02',
    category: 'Estiba y Paletizado',
    name: 'Emplayado Firmemente Ajustado y Esquineros',
    severity: 'Mayor',
    description: 'Película plástica emplayada compacta asegurando la carga hasta el piso de la tarima.',
  },
];
