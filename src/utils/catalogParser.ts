import * as XLSX from 'xlsx';
import { ProductComboItem, ProductComponentItem } from '../data/productCatalog';

export interface ParseCatalogResult {
  success: boolean;
  armados: ProductComboItem[];
  stats: {
    totalArmados: number;
    totalComponentes: number;
    armadosConDescripcion: number;
    sheetsFound: string[];
  };
  warnings: string[];
  errors: string[];
}

/**
 * Normaliza cadenas quitando espacios redundantes y saltos de línea
 */
function cleanStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/\s+/g, ' ');
}

/**
 * Parsea cantidad numérica con respaldo seguro
 */
function parseQuantity(val: any): number {
  if (typeof val === 'number') return Math.max(1, Math.round(val));
  const str = cleanStr(val).replace(/,/g, '.');
  const num = parseFloat(str.replace(/[^\d.]/g, ''));
  return isNaN(num) || num <= 0 ? 1 : Math.round(num);
}

/**
 * Encuentra el índice de una columna según patrones regex
 */
function findColIndex(headers: any[], patterns: RegExp[]): number {
  for (let i = 0; i < headers.length; i++) {
    const text = cleanStr(headers[i]).toLowerCase();
    for (const pat of patterns) {
      if (pat.test(text)) return i;
    }
  }
  return -1;
}

/**
 * Parsea uno o múltiples archivos (Excel .xlsx/.xls o CSVs individuales/combinados)
 */
export async function parseCatalogFiles(files: File[]): Promise<ParseCatalogResult> {
  const armadosMap = new Map<
    string,
    { sku: string; desc: string; category?: string; componentes: ProductComponentItem[] }
  >();
  const sheetsFound: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    for (const file of files) {
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      const arrayBuffer = await file.arrayBuffer();

      let wb: XLSX.WorkBook;
      try {
        if (isCsv) {
          // Intentar decodificación UTF-8 con fallback a ISO-8859-1 para acentos en español
          const textDecoder = new TextDecoder('utf-8');
          let csvText = textDecoder.decode(arrayBuffer);
          // Si tiene caracteres extraños de codificación latina, recodificar
          if (csvText.includes('')) {
            const latinDecoder = new TextDecoder('iso-8859-1');
            csvText = latinDecoder.decode(arrayBuffer);
          }
          wb = XLSX.read(csvText, { type: 'string', raw: true });
        } else {
          wb = XLSX.read(arrayBuffer, { type: 'array' });
        }
      } catch (readErr: any) {
        errors.push(`No se pudo leer el archivo "${file.name}": ${readErr?.message || String(readErr)}`);
        continue;
      }

      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        warnings.push(`El archivo "${file.name}" no contiene hojas.`);
        continue;
      }

      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) continue;

        const sheetLabel = files.length > 1 ? `${file.name} (${sheetName})` : sheetName;
        sheetsFound.push(sheetLabel);

        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (!rows || rows.length < 2) {
          warnings.push(`La hoja "${sheetLabel}" está vacía o solo contiene 1 fila.`);
          continue;
        }

        // Buscar fila de encabezados (usualmente fila 0, o primera fila no vacía)
        let headerRowIndex = 0;
        for (let r = 0; r < Math.min(rows.length, 5); r++) {
          const rowText = rows[r].map(cleanStr).join(' ').toLowerCase();
          if (rowText.includes('clave') || rowText.includes('armad') || rowText.includes('cant') || rowText.includes('desc')) {
            headerRowIndex = r;
            break;
          }
        }

        const headerRow = rows[headerRowIndex] || [];

        // 1. Clave de Armado (e.g. "Claves armados", "Clave armada", "SKU Armado")
        let colArmado = findColIndex(headerRow, [
          /clave.*armad/i,
          /armad.*clave/i,
          /sku.*armad/i,
          /clave.*combo/i,
          /armado/i,
          /combo/i,
        ]);

        // 2. Descripción de producto armado (e.g. "Descripcion de producto armado", "Descripcion armado")
        let colArmadoDesc = findColIndex(headerRow, [
          /desc.*prod.*armad/i,
          /desc.*armad/i,
          /desc.*prod/i,
          /producto.*armad/i,
          /nombre.*armad/i,
          /nombre.*prod/i,
        ]);

        // 3. Clave individual (e.g. "Claves individuales", "Clave individual", "SKU Individual", "Pieza")
        let colIndSku = findColIndex(headerRow, [
          /clave.*individ/i,
          /clave.*ind/i,
          /sku.*individ/i,
          /sku.*ind/i,
          /clave.*piez/i,
          /clave.*comp/i,
          /individ/i,
          /componente/i,
          /pieza/i,
        ]);

        // 4. Cantidad (e.g. "Cantidad", "Cant", "Qty", "Piezas", "Unidades")
        let colCant = findColIndex(headerRow, [
          /^cant/i,
          /cantidad/i,
          /^qty/i,
          /piezas.*armad/i,
          /unidades/i,
          /pzas/i,
        ]);

        // 5. Descripción de claves individuales (e.g. "Descripcion de claves individuales", "Desc individual")
        let colIndDesc = findColIndex(headerRow, [
          /desc.*clave.*individ/i,
          /desc.*individ/i,
          /desc.*ind/i,
          /desc.*piez/i,
          /desc.*comp/i,
        ]);

        // Heurísticas de respaldo según número de columnas y contenido
        const numCols = headerRow.length;

        // Caso A: Pestaña o archivo de sólo 2 columnas ("Claves armados" y "Descripcion de producto armado")
        if (numCols === 2 || (colIndSku === -1 && colCant === -1 && colArmadoDesc !== -1)) {
          if (colArmado === -1) colArmado = 0;
          if (colArmadoDesc === -1) colArmadoDesc = 1;
        }
        // Caso B: Pestaña o archivo de 4 columnas de individuales ("Claves armados", "Claves individuales", "Cantidad", "Descripcion")
        else if (colArmadoDesc === -1 && colIndSku !== -1) {
          if (colArmado === -1) colArmado = 0;
          if (colIndSku === -1) colIndSku = 1;
          if (colCant === -1) colCant = 2;
          if (colIndDesc === -1) {
            // Si la columna 3 dice simplemente "Descripcion", asignarla a individual
            const genericDesc = findColIndex(headerRow, [/desc/i, /nombre/i]);
            colIndDesc = genericDesc !== -1 ? genericDesc : 3;
          }
        }
        // Caso C: Archivo de 5 columnas con ambas descripciones en una sola hoja/CSV
        else if (colArmadoDesc !== -1 && (colIndSku !== -1 || colCant !== -1)) {
          if (colArmado === -1) colArmado = 0;
          if (colIndDesc === -1) {
            // Buscar una descripción que no sea la del armado
            for (let c = 0; c < headerRow.length; c++) {
              if (c !== colArmadoDesc && /desc/i.test(cleanStr(headerRow[c]))) {
                colIndDesc = c;
                break;
              }
            }
          }
        }
        // Fallback genérico si no se detectaron encabezados pero tiene 4 columnas
        else if (colArmado === -1 && numCols >= 4) {
          colArmado = 0;
          colIndSku = 1;
          colCant = 2;
          colIndDesc = 3;
        }

        // Si después de los fallbacks no se encuentra columna de armado, saltar
        if (colArmado === -1) {
          warnings.push(
            `En "${sheetLabel}" no se identificó la columna de "Claves armados". Columnas leídas: [${headerRow.map(cleanStr).join(', ')}]`
          );
          continue;
        }

        // Procesar filas de datos
        for (let r = headerRowIndex + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const armadoSku = cleanStr(row[colArmado]).toUpperCase();
          if (!armadoSku || armadoSku.toLowerCase() === 'claves armados' || armadoSku.toLowerCase() === 'clave') {
            continue;
          }

          // Extraer descripción del armado si está disponible en esta hoja/columna
          const armadoDescFromCol = colArmadoDesc !== -1 ? cleanStr(row[colArmadoDesc]) : '';

          // Inicializar o recuperar armado en el mapa
          if (!armadosMap.has(armadoSku)) {
            armadosMap.set(armadoSku, {
              sku: armadoSku,
              desc: armadoDescFromCol || `ARMADO ${armadoSku}`,
              category: 'Maquila / Armados',
              componentes: [],
            });
          } else if (armadoDescFromCol) {
            // Si ya existía y esta fila trae una descripción no genérica, actualizarla
            const cur = armadosMap.get(armadoSku)!;
            if (!cur.desc || cur.desc.startsWith('ARMADO ') || cur.desc === armadoSku) {
              cur.desc = armadoDescFromCol;
            }
          }

          // Extraer componentes individuales si esta hoja/fila los contiene
          if (colIndSku !== -1 || colIndDesc !== -1 || colCant !== -1) {
            const indSku = colIndSku !== -1 ? cleanStr(row[colIndSku]).toUpperCase() : '';
            const indDesc = colIndDesc !== -1 ? cleanStr(row[colIndDesc]) : '';
            const cant = colCant !== -1 ? parseQuantity(row[colCant]) : 1;

            if (indSku || indDesc) {
              const currentArmado = armadosMap.get(armadoSku)!;
              const compKey = (indSku || indDesc).toUpperCase();

              const existingCompIdx = currentArmado.componentes.findIndex(
                (c) => c.sku.toUpperCase() === compKey || (indDesc && c.desc.toUpperCase() === indDesc.toUpperCase())
              );

              if (existingCompIdx >= 0) {
                // Si el componente ya existe en este armado, acumular cantidad
                currentArmado.componentes[existingCompIdx].cantidad += cant;
              } else {
                currentArmado.componentes.push({
                  sku: indSku || armadoSku,
                  desc: indDesc || indSku || 'Pieza individual',
                  cantidad: cant,
                  unidad: cant === 1 ? 'pieza' : 'piezas',
                });
              }
            }
          }
        }
      }
    }

    const resultArmados = Array.from(armadosMap.values());

    if (resultArmados.length === 0) {
      return {
        success: false,
        armados: [],
        stats: { totalArmados: 0, totalComponentes: 0, armadosConDescripcion: 0, sheetsFound },
        warnings,
        errors: errors.length > 0 ? errors : [
          'No se encontraron filas con claves de armados válidas.',
          'Verifica que las columnas coincidan con las plantillas: "Claves armados", "Claves individuales", "Cantidad", "Descripcion de claves individuales" y/o "Descripcion de producto armado".',
        ],
      };
    }

    let totalComponentes = 0;
    let armadosConDescripcion = 0;

    resultArmados.forEach((a) => {
      totalComponentes += a.componentes?.length || 0;
      if (a.desc && !a.desc.startsWith('ARMADO ') && a.desc.toUpperCase() !== a.sku.toUpperCase()) {
        armadosConDescripcion++;
      }
    });

    return {
      success: true,
      armados: resultArmados,
      stats: {
        totalArmados: resultArmados.length,
        totalComponentes,
        armadosConDescripcion,
        sheetsFound,
      },
      warnings,
      errors,
    };
  } catch (err: any) {
    return {
      success: false,
      armados: [],
      stats: { totalArmados: 0, totalComponentes: 0, armadosConDescripcion: 0, sheetsFound },
      warnings,
      errors: [`Error al procesar archivo: ${err?.message || String(err)}`],
    };
  }
}

/**
 * Función de compatibilidad para procesar un solo archivo
 */
export async function parseCatalogFile(file: File): Promise<ParseCatalogResult> {
  return parseCatalogFiles([file]);
}

/**
 * Parsea texto crudo pegado desde Excel (TSV o CSV)
 */
export function parsePastedCsvText(
  text: string,
  mode: 'auto' | 'individuales' | 'armados' = 'auto'
): ProductComboItem[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const armadosMap = new Map<string, ProductComboItem>();

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(cleanStr);
    if (cols.length < 2) continue;

    const col0 = cols[0].toUpperCase();
    if (!col0 || col0.toLowerCase().includes('clave')) continue;

    // Detectar si es tabla de 2 columnas: [Claves armados, Descripcion de producto armado]
    if (mode === 'armados' || (mode === 'auto' && cols.length === 2)) {
      const sku = col0;
      const desc = cols[1];
      if (!armadosMap.has(sku)) {
        armadosMap.set(sku, {
          sku,
          desc: desc || sku,
          category: 'Maquila / Armados',
          componentes: [],
        });
      } else {
        armadosMap.get(sku)!.desc = desc;
      }
    }
    // Detectar si es tabla de 5 columnas: [Claves armados, Descripcion armado, Clave ind, Cant, Desc ind]
    else if (cols.length >= 5) {
      const armadoSku = col0;
      const armadoDesc = cols[1];
      const indSku = (cols[2] || '').toUpperCase();
      const cant = parseQuantity(cols[3]);
      const indDesc = cols[4] || indSku;

      if (!armadosMap.has(armadoSku)) {
        armadosMap.set(armadoSku, {
          sku: armadoSku,
          desc: armadoDesc || `ARMADO ${armadoSku}`,
          category: 'Maquila / Armados',
          componentes: [],
        });
      }
      const item = armadosMap.get(armadoSku)!;
      if (armadoDesc && item.desc.startsWith('ARMADO ')) {
        item.desc = armadoDesc;
      }
      item.componentes = item.componentes || [];
      const compKey = (indSku || indDesc || armadoSku).toUpperCase();
      const existingComp = item.componentes.find(
        (c) => c.sku.toUpperCase() === compKey || (indDesc && c.desc.toUpperCase() === indDesc.toUpperCase())
      );
      if (existingComp) {
        existingComp.cantidad += cant;
        if (indDesc && (!existingComp.desc || existingComp.desc === existingComp.sku)) {
          existingComp.desc = indDesc;
        }
      } else {
        item.componentes.push({
          sku: indSku || armadoSku,
          desc: indDesc || indSku || 'Pieza individual',
          cantidad: cant,
          unidad: cant === 1 ? 'pieza' : 'piezas',
        });
      }
    }
    // Tabla clásica de 4 columnas: [Claves armados, Claves individuales, Cantidad, Descripcion ind]
    else {
      const armadoSku = col0;
      const indSku = (cols[1] || '').toUpperCase();
      const cant = cols[2] ? parseQuantity(cols[2]) : 1;
      const indDesc = cols[3] || cols[1] || '';

      if (!armadosMap.has(armadoSku)) {
        armadosMap.set(armadoSku, {
          sku: armadoSku,
          desc: `ARMADO ${armadoSku}`,
          category: 'Maquila / Armados',
          componentes: [],
        });
      }

      const item = armadosMap.get(armadoSku)!;
      item.componentes = item.componentes || [];
      const compKey = (indSku || indDesc || armadoSku).toUpperCase();
      const existingComp = item.componentes.find(
        (c) => c.sku.toUpperCase() === compKey || (indDesc && c.desc.toUpperCase() === indDesc.toUpperCase())
      );
      if (existingComp) {
        existingComp.cantidad += cant;
        if (indDesc && (!existingComp.desc || existingComp.desc === existingComp.sku)) {
          existingComp.desc = indDesc;
        }
      } else {
        item.componentes.push({
          sku: indSku || armadoSku,
          desc: indDesc || indSku || 'Pieza individual',
          cantidad: cant,
          unidad: cant === 1 ? 'pieza' : 'piezas',
        });
      }
    }
  }

  return Array.from(armadosMap.values());
}

/**
 * Datos de ejemplo basados en los archivos reales del usuario
 */
export const SAMPLE_TEMPLATE_DATA = {
  individuales: [
    ['Claves armados', 'Claves individuales', 'Cantidad', 'Descripcion de claves individuales'],
    ['AI26058-01', 'AI21369', 1, 'SET DE CUCHILLOS 4 PZAS CON MANGO NEGRO'],
    ['AI26058-01', 'AI26058', 1, 'COOKWARE 24PC SET CARBON STEEL NONSTICK COATING, BLACK'],
    ['ANZO-05', 'ANZO-UTEC-001', 1, 'BASE PARA VAPORERA DE SILICON'],
    ['ANZO-05', 'ANZO-UTEC-002', 1, 'TREBEDE DE SILICON EN FORMA DE FLOR'],
    ['ANZO-05', 'ANZO-UTEC-017', 1, 'CORTADOR DE PIZZA'],
    ['ANZO-05', 'ANZO-UTEC-021', 1, 'SET PINZAS DE NYLON'],
    ['ANZO-05', 'ANZO-UTEC-022', 1, 'PELADOR'],
    ['ANZO-05', 'ANZO-UTEC-032', 1, 'CIZALLA'],
    ['ANZO-05', 'ANZO-UTEC-033', 1, 'TIJERAS PARA COCINA'],
    ['ANZO-05', 'S0430-00', 1, 'SET DE 3 ESPATULAS DE SILICON'],
    ['ANZO-08', 'ANZO-UTEC-004', 1, 'CUCHARON DE MADERA CON SILICONA VERDE'],
    ['ANZO-08', 'ANZO-UTEC-006', 1, 'ESPATULA DE MADERA CON SILICONA VERDE'],
    ['ANZO-08', 'ANZO-UTEC-008', 1, 'SERVIDOR DE SPAGUETTI DE MADERA CON SILICONA VERDE'],
    ['ANZO-08', 'C0240-00', 1, 'TABLA PARA PICAR, VERDE'],
    ['ANZO-08', 'S0430-00', 1, 'SET DE 3 ESPATULAS DE SILICON'],
    ['BKP 110 THP', 'BKP-110H-THP', 1, 'NHM ASIENTO MASAJEADOR'],
    ['BRT-210-01', 'BRT-210', 32, 'NHM BRETHE AIR REVITALIZER'],
    ['C0079-00', 'C0079-N1', 1, 'SARTEN FAMILIAR, DE 28 CM, JADECOOK'],
    ['C0079-00', 'C0079-R1', 1, 'SARTEN PARA EL DIA A DIA, DE 24 CM, JADECOOK'],
    ['C0079-00', 'C0079-T1', 1, 'CACEROLA DE 24 CM, JADECOOK'],
    ['C0079-00', 'N0009-01', 1, 'TAPA DE VIDRIO PARA JADECOOK'],
    ['C0079-00', 'N0009-02', 1, 'PERILLA DE PIE PARA JADECOOK'],
    ['C0079-01', 'C0079-00', 2, 'BATERIA JADECOOK 4 PZ (QPNGW24+QAK24+QAK28)'],
  ],
  armados: [
    ['Claves armados', 'Descripcion de producto armado'],
    ['AI26058-01', 'BATERIA TOTALY 32 PIEZAS CV SHOPPING'],
    ['ANZO-05', 'KIT DE ACCESORIOS DE COCINA // N2'],
    ['ANZO-08', 'KIT DE ACCESORIOS DE LUJO // N'],
    ['BKP 110 THP', 'ASIENTO DE MASAJE DE VIBR, NHMS'],
    ['BRT-210-01', 'NHM BRETHE AIR REVITALIZER C/32'],
    ['C0079-00', 'BATERIA JADECOOK 4 PZ (QPNGW24+QAK24+QAK28)'],
    ['C0079-01', 'BATERIA JADECOOK, 8 PIEZAS'],
  ],
  combinada5Cols: [
    ['Claves armados', 'Descripcion de producto armado', 'Claves individuales', 'Cantidad', 'Descripcion de claves individuales'],
    ['AI26058-01', 'BATERIA TOTALY 32 PIEZAS CV SHOPPING', 'AI21369', 1, 'SET DE CUCHILLOS 4 PZAS CON MANGO NEGRO'],
    ['AI26058-01', 'BATERIA TOTALY 32 PIEZAS CV SHOPPING', 'AI26058', 1, 'COOKWARE 24PC SET CARBON STEEL NONSTICK COATING, BLACK'],
    ['ANZO-05', 'KIT DE ACCESORIOS DE COCINA // N2', 'ANZO-UTEC-001', 1, 'BASE PARA VAPORERA DE SILICON'],
    ['ANZO-05', 'KIT DE ACCESORIOS DE COCINA // N2', 'ANZO-UTEC-002', 1, 'TREBEDE DE SILICON EN FORMA DE FLOR'],
    ['ANZO-05', 'KIT DE ACCESORIOS DE COCINA // N2', 'ANZO-UTEC-017', 1, 'CORTADOR DE PIZZA'],
    ['ANZO-05', 'KIT DE ACCESORIOS DE COCINA // N2', 'ANZO-UTEC-021', 1, 'SET PINZAS DE NYLON'],
    ['ANZO-08', 'KIT DE ACCESORIOS DE LUJO // N', 'ANZO-UTEC-004', 1, 'CUCHARON DE MADERA CON SILICONA VERDE'],
    ['ANZO-08', 'KIT DE ACCESORIOS DE LUJO // N', 'ANZO-UTEC-006', 1, 'ESPATULA DE MADERA CON SILICONA VERDE'],
    ['C0079-00', 'BATERIA JADECOOK 4 PZ (QPNGW24+QAK24+QAK28)', 'C0079-N1', 1, 'SARTEN FAMILIAR, DE 28 CM, JADECOOK'],
    ['C0079-00', 'BATERIA JADECOOK 4 PZ (QPNGW24+QAK24+QAK28)', 'C0079-R1', 1, 'SARTEN PARA EL DIA A DIA, DE 24 CM, JADECOOK'],
  ],
};

/**
 * Genera el archivo Excel (.xlsx) con las 2 pestañas separadas y la pestaña combinada
 */
export function generateCatalogTemplateFile(): void {
  const wb = XLSX.utils.book_new();

  // Pestaña 1: Claves individuales
  const wsInd = XLSX.utils.aoa_to_sheet(SAMPLE_TEMPLATE_DATA.individuales);
  wsInd['!cols'] = [
    { wch: 18 }, // Claves armados
    { wch: 20 }, // Claves individuales
    { wch: 12 }, // Cantidad
    { wch: 55 }, // Descripcion
  ];
  XLSX.utils.book_append_sheet(wb, wsInd, 'Claves individuales');

  // Pestaña 2: Claves armados
  const wsArm = XLSX.utils.aoa_to_sheet(SAMPLE_TEMPLATE_DATA.armados);
  wsArm['!cols'] = [
    { wch: 18 }, // Claves armados
    { wch: 65 }, // Descripcion producto armado
  ];
  XLSX.utils.book_append_sheet(wb, wsArm, 'Claves armados');

  // Pestaña 3: Plantilla 1 Sola Hoja (5 Columnas)
  const ws5 = XLSX.utils.aoa_to_sheet(SAMPLE_TEMPLATE_DATA.combinada5Cols);
  ws5['!cols'] = [
    { wch: 18 },
    { wch: 50 },
    { wch: 20 },
    { wch: 12 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, ws5, 'Plantilla 1 Sola Hoja (5 Col)');

  XLSX.writeFile(wb, 'Plantilla_Claves_Maquila.xlsx');
}

/**
 * Genera archivo CSV con 1 sola hoja de 5 columnas
 */
export function generateSingleSheetCsvTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet(SAMPLE_TEMPLATE_DATA.combinada5Cols);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Plantilla_Armados_1_Hoja_5_Columnas.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera CSV de pestañas individuales
 */
export function generateCatalogCsv(tab: 'individuales' | 'armados'): void {
  const data = tab === 'individuales' ? SAMPLE_TEMPLATE_DATA.individuales : SAMPLE_TEMPLATE_DATA.armados;
  const ws = XLSX.utils.aoa_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = tab === 'individuales' ? 'Claves_individuales.csv' : 'Claves_armados.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
