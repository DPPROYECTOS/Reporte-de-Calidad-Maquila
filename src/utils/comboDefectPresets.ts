import { DefectCheckItem, DefectSeverity, DefectCategory } from '../types/qualityReport';

export interface ComboDefectPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  items: Omit<DefectCheckItem, 'defectsFound' | 'passed'>[];
}

export const COMBO_DEFECT_PRESETS: ComboDefectPreset[] = [
  {
    id: 'cookware',
    name: 'Sartenes, Comales y Baterías Jade',
    icon: '🍳',
    description: 'Para armados de piezas antiadherentes, comales, tapas y mangos.',
    items: [
      // Críticos
      {
        id: 'ck-crit-01',
        category: 'Armado y Componentes',
        name: 'Pieza o componente faltante del combo (ej. falta sartén o tapa)',
        severity: 'Critico',
        description: 'La caja o kit está incompleto. Falta una de las piezas que indica la descripción del combo.',
      },
      {
        id: 'ck-crit-02',
        category: 'Armado y Componentes',
        name: 'Recubrimiento antiadherente desprendido, burbuja o fisura',
        severity: 'Critico',
        description: 'Desprendimiento del recubrimiento antiadherente que represente riesgo para la salud o daño severo.',
      },
      {
        id: 'ck-crit-03',
        category: 'Etiquetado y Códigos',
        name: 'Código de barras EAN/UPC incorrecto o no escaneable',
        severity: 'Critico',
        description: 'La etiqueta tiene código de barras de otro producto o la pistola láser no lo reconoce.',
      },

      // Mayores
      {
        id: 'ck-may-01',
        category: 'Armado y Componentes',
        name: 'Mango flojo, tornillo suelto o mal ensamblado',
        severity: 'Mayor',
        description: 'La baquelita del mango tiene juego mecánico o no asienta correctamente en el soporte.',
      },
      {
        id: 'ck-may-02',
        category: 'Apariencia Físico-Cosmética',
        name: 'Rayón visible en recubrimiento o disco difusor golpeado',
        severity: 'Mayor',
        description: 'Rayadura superficial mayor a 5mm en superficie de cocción o difusor con abolladura.',
      },
      {
        id: 'ck-may-03',
        category: 'Empaque y Cajas',
        name: 'Caja máster o caja individual rota, abierta o aplastada',
        severity: 'Mayor',
        description: 'El cartón no resiste la estiba o presenta rotura visible en aristas.',
      },
      {
        id: 'ck-may-04',
        category: 'Armado y Componentes',
        name: 'Falta instructivo, garantía o recetario en empaque',
        severity: 'Mayor',
        description: 'No se introdujo el folleto impreso dentro de la caja del combo.',
      },

      // Menores
      {
        id: 'ck-men-01',
        category: 'Apariencia Físico-Cosmética',
        name: 'Manchas de dedos, polvo o residuo lavable en aluminio',
        severity: 'Menor',
        description: 'Mancha ligera que no daña el acabado y se retira fácilmente con paño limpio.',
      },
      {
        id: 'ck-men-02',
        category: 'Etiquetado y Códigos',
        name: 'Etiqueta ligeramente desviada o con arruga mínima',
        severity: 'Menor',
        description: 'Desviación menor de etiqueta sin afectar la lectura del código ni textos.',
      },
      {
        id: 'ck-men-03',
        category: 'Empaque y Cajas',
        name: 'Cinta adhesiva de sellado con arruga leve sin abertura',
        severity: 'Menor',
        description: 'Cinta canela o impresa con pequeño pliegue estético pero sello firme.',
      },
    ],
  },
  {
    id: 'knives',
    name: 'Cuchillería y Sets Chef',
    icon: '🔪',
    description: 'Para kits de cuchillos, peladores, tijeras y bloques de madera.',
    items: [
      // Críticos
      {
        id: 'kn-crit-01',
        category: 'Armado y Componentes',
        name: 'Falta pieza del kit o cuchillo no corresponde al modelo',
        severity: 'Critico',
        description: 'Kit incompleto o se empacó un cuchillo equivocado diferente a la ficha técnica.',
      },
      {
        id: 'kn-crit-02',
        category: 'Apariencia Físico-Cosmética',
        name: 'Hoja con fisura, muesca en filo o acero con óxido',
        severity: 'Critico',
        description: 'Filo quebrado, acero inoxidable manchado o con daño estructural que comprometa seguridad.',
      },
      {
        id: 'kn-crit-03',
        category: 'Empaque y Cajas',
        name: 'Funda protectora de plástico suelta o filo expuesto en caja',
        severity: 'Critico',
        description: 'Riesgo de corte para el cliente final al abrir el empaque.',
      },

      // Mayores
      {
        id: 'kn-may-01',
        category: 'Armado y Componentes',
        name: 'Mango con holgura o remache suelto',
        severity: 'Mayor',
        description: 'El cabo del cuchillo no está firmemente prensado a la espiga de acero.',
      },
      {
        id: 'kn-may-02',
        category: 'Empaque y Cajas',
        name: 'Blíster o inserto termoformado roto',
        severity: 'Mayor',
        description: 'La charola interior no sujeta las piezas o tiene desgarre.',
      },
      {
        id: 'kn-may-03',
        category: 'Etiquetado y Códigos',
        name: 'Código de barras de combo ilegible o ausente',
        severity: 'Mayor',
        description: 'Etiqueta exterior dañada que impide el registro en almacén.',
      },

      // Menores
      {
        id: 'kn-men-01',
        category: 'Apariencia Físico-Cosmética',
        name: 'Manchas cosméticas en el acabado satinado de la hoja',
        severity: 'Menor',
        description: 'Marcas de manipulación de maquila que se limpian con microfibra.',
      },
      {
        id: 'kn-men-02',
        category: 'Empaque y Cajas',
        name: 'Caja con desgaste leve en esquinas',
        severity: 'Menor',
        description: 'Rozadura cosmética leve en cartoncillo exterior.',
      },
    ],
  },
  {
    id: 'marketplace',
    name: 'Combos Marketplace (Amazon / Mercado Libre / Retail)',
    icon: '📦',
    description: 'Para pedidos FBA, Full MeLi, Coppel, Suburbia con requerimientos estrictos.',
    items: [
      // Críticos
      {
        id: 'mk-crit-01',
        category: 'Etiquetado y Códigos',
        name: 'Etiqueta FNSKU / ASIN / MeLi errónea o ausente',
        severity: 'Critico',
        description: 'Rechazo directo en centro de distribución por código de producto equivocado.',
      },
      {
        id: 'mk-crit-02',
        category: 'Armado y Componentes',
        name: 'Falta componente promocional o regalo anunciado',
        severity: 'Critico',
        description: 'Falta el utensilio, recetario o producto bundle prometido en la publicación.',
      },

      // Mayores
      {
        id: 'mk-may-01',
        category: 'Empaque y Cajas',
        name: 'Caja máster sin etiqueta de identificación de lote o tarima',
        severity: 'Mayor',
        description: 'Falta formato CVD-AMA-F-03 en tarima con firma de supervisión.',
      },
      {
        id: 'mk-may-02',
        category: 'Empaque y Cajas',
        name: 'Cinta de sellado rota o empaque semi-abierto',
        severity: 'Mayor',
        description: 'El paquete se puede abrir durante el tránsito a la bodega del cliente.',
      },
      {
        id: 'mk-may-03',
        category: 'Estiba y Paletizado',
        name: 'Tarima sin esquineros o emplayado flojo',
        severity: 'Mayor',
        description: 'Riesgo de colapso de cajas durante el transporte en camión.',
      },

      // Menores
      {
        id: 'mk-men-01',
        category: 'Empaque y Cajas',
        name: 'Etiqueta de frágil ligeramente chueca',
        severity: 'Menor',
        description: 'Etiqueta de advertencia visible pero colocada con inclinación.',
      },
      {
        id: 'mk-men-02',
        category: 'Apariencia Físico-Cosmética',
        name: 'Polvo superficial en cara superior de caja máster',
        severity: 'Menor',
        description: 'Polvo acumulado en mesa de maquila retirado antes de emplayar.',
      },
    ],
  },
  {
    id: 'general',
    name: 'Estándar General de Maquila',
    icon: '📋',
    description: 'Catálogo de defectos equilibrado para cualquier tipo de armado o kit.',
    items: [
      // Críticos
      {
        id: 'gen-crit-01',
        category: 'Armado y Componentes',
        name: 'Integridad del Combo (Componentes y Claves Base Correctas)',
        severity: 'Critico',
        description: 'Comprobar que no falten piezas, mangos, cuchillos, accesorios ni instructivos del combo.',
      },
      {
        id: 'gen-crit-02',
        category: 'Etiquetado y Códigos',
        name: 'Código de Barras EAN / UPC Legible y Escaneable',
        severity: 'Critico',
        description: 'Código de barras de la clave o kit correcto, sin borrones ni errores de lectura scanner.',
      },

      // Mayores
      {
        id: 'gen-may-01',
        category: 'Empaque y Cajas',
        name: 'Caja Máster / Empaque Primario sin Daños ni Humedad',
        severity: 'Mayor',
        description: 'Cajas sin aplastamientos, roturas, manchas o humedad que comprometan la protección del producto.',
      },
      {
        id: 'gen-may-02',
        category: 'Empaque y Cajas',
        name: 'Sellado de Cinta / Fleje / Blíster Termo-encogible',
        severity: 'Mayor',
        description: 'Cintas adhesivas corporativas correctamente colocadas, flejes firmes y termo-encogible sin aberturas.',
      },
      {
        id: 'gen-may-03',
        category: 'Armado y Componentes',
        name: 'Ensamble y Ajuste Mecánico / Mangos / Tapas',
        severity: 'Mayor',
        description: 'Mangos firmes sin holgura, tapas ajustan correctamente, accesorios fijados de fábrica.',
      },
      {
        id: 'gen-may-04',
        category: 'Apariencia Físico-Cosmética',
        name: 'Superficie Antiadherente Limpia (Sin Rayaduras ni Despostillados)',
        severity: 'Mayor',
        description: 'Revisión visual del recubrimiento antiadherente de teflón/cerámica sin rayones ni golpes.',
      },
      {
        id: 'gen-may-05',
        category: 'Estiba y Paletizado',
        name: 'Patrón de Estiba Autorizado y Emplayado Compacto',
        severity: 'Mayor',
        description: 'Respetar altura máxima, camas cruzadas y plástico emplayado asegurando la carga al pallet.',
      },

      // Menores
      {
        id: 'gen-men-01',
        category: 'Apariencia Físico-Cosmética',
        name: 'Ausencia de Contaminantes, Grasa o Polvo Excesivo',
        severity: 'Menor',
        description: 'Piezas limpias libres de residuos del proceso de empaque o manipulación.',
      },
      {
        id: 'gen-men-02',
        category: 'Etiquetado y Códigos',
        name: 'Etiqueta levemente descentrada sin afectar legibilidad',
        severity: 'Menor',
        description: 'Desalineación estética menor que no obstruye ningún dato impreso.',
      },
    ],
  },
];

// Helper to auto-suggest a preset based on combo SKU or description
export function suggestPresetForCombo(sku: string, description: string, cliente: string = ''): ComboDefectPreset {
  const combined = `${sku} ${description} ${cliente}`.toUpperCase();

  if (combined.includes('CUCHILL') || combined.includes('CHEF') || combined.includes('FILO') || combined.includes('TIJERA')) {
    return COMBO_DEFECT_PRESETS.find((p) => p.id === 'knives') || COMBO_DEFECT_PRESETS[0];
  }

  if (combined.includes('AMAZON') || combined.includes('MELI') || combined.includes('MERCADO') || combined.includes('SUBURBIA') || combined.includes('COPPEL')) {
    return COMBO_DEFECT_PRESETS.find((p) => p.id === 'marketplace') || COMBO_DEFECT_PRESETS[0];
  }

  if (combined.includes('SARTEN') || combined.includes('COMAL') || combined.includes('BATERIA') || combined.includes('JADE') || combined.includes('CACEROLA') || combined.includes('OLLA')) {
    return COMBO_DEFECT_PRESETS.find((p) => p.id === 'cookware') || COMBO_DEFECT_PRESETS[0];
  }

  return COMBO_DEFECT_PRESETS.find((p) => p.id === 'general') || COMBO_DEFECT_PRESETS[0];
}

// Master General Defect Blocks Pool (Deduplicated, comprehensive library of standard defects)
export const MASTER_GENERAL_DEFECT_BLOCKS: Omit<DefectCheckItem, 'defectsFound' | 'passed'>[] = [
  // Críticos (Ac = 0)
  {
    id: 'block-crit-01',
    name: 'Pieza o Componente Faltante del Combo',
    severity: 'Critico',
    category: 'Armado y Componentes',
    description: 'El combo no contiene todas las piezas, tapas, mangos o accesorios prometidos en la ficha técnica.',
  },
  {
    id: 'block-crit-02',
    name: 'Código de Barras EAN / UPC Inválido o No Escaneable',
    severity: 'Critico',
    category: 'Etiquetado y Códigos',
    description: 'Etiqueta con código incorrecto, faltante o dañado que la pistola láser rechaza en el almacén.',
  },
  {
    id: 'block-crit-03',
    name: 'Etiqueta FNSKU / ASIN / MeLi Errónea o Ausente',
    severity: 'Critico',
    category: 'Etiquetado y Códigos',
    description: 'Falta etiquetado de cumplimiento obligatorio para entregas en Amazon FBA, Full MeLi o Retail.',
  },
  {
    id: 'block-crit-04',
    name: 'Desprendimiento o Ampolla de Recubrimiento Antiadherente',
    severity: 'Critico',
    category: 'Armado y Componentes',
    description: 'Desprendimiento visible del teflón, pintura o cerámica que comprometa la inocuidad alimentaria.',
  },
  {
    id: 'block-crit-05',
    name: 'Filo Expuesto, Quebrado o Protección de Cuchillos Rota',
    severity: 'Critico',
    category: 'Armado y Componentes',
    description: 'Riesgo inminente de cortadura física para el personal de almacén o para el cliente final.',
  },
  {
    id: 'block-crit-06',
    name: 'Clave Base Errónea en Componente Interior',
    severity: 'Critico',
    category: 'Armado y Componentes',
    description: 'Se introdujo una pieza perteneciente a otro modelo o variante de color diferente.',
  },

  // Mayores
  {
    id: 'block-may-01',
    name: 'Mango Flojo, Tornillo Suelto o Desajuste Mecánico',
    severity: 'Mayor',
    category: 'Armado y Componentes',
    description: 'Baquelita o perilla con juego mecánico mayor a 2mm o tornillo sin torque suficiente.',
  },
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
    id: 'block-may-04',
    name: 'Sellado de Cinta Deficiente o Cinta Despegada',
    severity: 'Mayor',
    category: 'Empaque y Cajas',
    description: 'La cinta canela o cinta de seguridad se levanta dejando cajas semi-abiertas en el lote.',
  },
  {
    id: 'block-may-05',
    name: 'Falta Manual de Uso, Póliza de Garantía o Recetario',
    severity: 'Mayor',
    category: 'Armado y Componentes',
    description: 'El combo no incluye la folletería impresa obligatoria según la especificación del armado.',
  },
  {
    id: 'block-may-06',
    name: 'Termoencogible Roto o Blíster con Desgarre',
    severity: 'Mayor',
    category: 'Empaque y Cajas',
    description: 'Plástico retráctil perforado o empaque transparente roto que permite que la pieza se mueva.',
  },
  {
    id: 'block-may-07',
    name: 'Tarima sin Esquineros o Emplayado Flojo',
    severity: 'Mayor',
    category: 'Estiba y Paletizado',
    description: 'Pallet inestable que no cumple con el patrón de camas cruzadas o carece de esquineros rígidos.',
  },
  {
    id: 'block-may-08',
    name: 'Exceso de Altura en Tarima o Estiba Chueca',
    severity: 'Mayor',
    category: 'Estiba y Paletizado',
    description: 'La tarima sobrepasa el límite permitido para racks o presenta desplome lateral riesgoso.',
  },

  // Menores
  {
    id: 'block-men-01',
    name: 'Manchas de Grasa, Huellas o Polvo Limpiable',
    severity: 'Menor',
    category: 'Apariencia Físico-Cosmética',
    description: 'Suciedad superficial provocada durante el armado que se retira fácilmente con paño de microfibra.',
  },
  {
    id: 'block-men-02',
    name: 'Etiqueta Levemente Inclinada o con Arruga Mínima',
    severity: 'Menor',
    category: 'Etiquetado y Códigos',
    description: 'Desviación menor sin obstruir textos, logotipos ni códigos de lectura.',
  },
  {
    id: 'block-men-03',
    name: 'Pequeño Pliegue en Cinta de Sellado sin Abertura',
    severity: 'Menor',
    category: 'Empaque y Cajas',
    description: 'Burbuja o pliegue estético en la cinta adhesiva, manteniendo el sellado hermético.',
  },
  {
    id: 'block-men-04',
    name: 'Rozadura Cosmética Leve en Esquinas de Cartoncillo',
    severity: 'Menor',
    category: 'Empaque y Cajas',
    description: 'Ligero desgaste por fricción en transporte interno que no deforma la caja.',
  },
];

// Helper to load stored custom defect blocks for a combo from localStorage
export function getStoredDefectsForCombo(sku: string): DefectCheckItem[] | null {
  if (!sku || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`cvd_defects_${sku}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error loading combo defects from storage:', e);
  }
  return null;
}

// Helper to save configured defect blocks for a combo to localStorage
export function saveStoredDefectsForCombo(sku: string, items: DefectCheckItem[]): void {
  if (!sku || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`cvd_defects_${sku}`, JSON.stringify(items));
  } catch (e) {
    console.warn('Error saving combo defects to storage:', e);
  }
}

