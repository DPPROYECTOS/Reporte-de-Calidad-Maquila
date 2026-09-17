import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
} from 'docx';
import { QualityReport } from '../types/qualityReport';

/**
 * Genera un documento de Microsoft Word (.docx) formal y ejecutivo
 * para la Inspección y Liberación de Calidad en Maquila.
 */
export async function generateInspectionWordDocument(report: QualityReport): Promise<Blob> {
  const isApproved = report.status === 'APROBADO';
  const isRejected = report.status === 'RECHAZADO';
  const statusColor = isApproved ? '16A34A' : isRejected ? 'DC2626' : 'D97706';

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 in
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          // ENCABEZADO PRINCIPAL
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'CV DIRECTO — CONTROL DE CALIDAD Y MAQUILA',
                bold: true,
                size: 28,
                color: '0F172A',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'INFORME EJECUTIVO DE INSPECCIÓN Y LIBERACIÓN DE LOTE',
                bold: true,
                size: 22,
                color: '334155',
              }),
            ],
            spacing: { after: 200 },
          }),

          // TABLA DE METADATOS Y DICTAMEN
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Folio OT: ', bold: true, size: 20 }),
                          new TextRun({ text: report.folioOT || 'S/N', size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Folio Maquila: ', bold: true, size: 20 }),
                          new TextRun({ text: report.folioMaquila || 'S/N', size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Fecha: ', bold: true, size: 20 }),
                          new TextRun({ text: `${report.inspectionDate} (${report.startTime || '--'} a ${report.endTime || '--'})`, size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Inspector: ', bold: true, size: 20 }),
                          new TextRun({ text: report.firmaCalidad?.nombre || report.inspectorName || 'Calidad', size: 20 }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: isApproved ? 'ECFDF5' : isRejected ? 'FEF2F2' : 'FFFBEB' },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'DICTAMEN FINAL', bold: true, size: 18, color: '64748B' }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: report.status,
                            bold: true,
                            size: 32,
                            color: statusColor,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: `Etiqueta Asignada: ${report.tagColor}`,
                            bold: true,
                            size: 20,
                            color: statusColor,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 200 } }),

          // DATOS DEL PRODUCTO / COMBO
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({ text: '1. Identificación del Producto y Armado', bold: true, size: 22, color: '1E293B' }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Clave / SKU Armado', bold: true, size: 19 })] })],
                  }),
                  new TableCell({
                    width: { size: 75, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: report.skuArmado || 'S/N', bold: true, size: 19, color: '0F172A' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Descripción', bold: true, size: 19 })] })],
                  }),
                  new TableCell({
                    width: { size: 75, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: report.descripcionArmado || 'S/D', size: 19 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Claves Componentes', bold: true, size: 19 })] })],
                  }),
                  new TableCell({
                    width: { size: 75, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: report.claveCompuesta || (report.componentesArmado?.map(c => c.sku).join(' / ') || 'N/A'), size: 19 })] })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 200 } }),

          // MUESTREO Y PLAN AQL
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({ text: '2. Muestreo de Calidad (Plan AQL)', bold: true, size: 22, color: '1E293B' }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' }, children: [new Paragraph({ children: [new TextRun({ text: 'Lote Total', bold: true, size: 18 })] })] }),
                  new TableCell({ shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' }, children: [new Paragraph({ children: [new TextRun({ text: 'Muestra Requerida', bold: true, size: 18 })] })] }),
                  new TableCell({ shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' }, children: [new Paragraph({ children: [new TextRun({ text: 'Muestra Inspeccionada', bold: true, size: 18 })] })] }),
                  new TableCell({ shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' }, children: [new Paragraph({ children: [new TextRun({ text: 'Defectos Encontrados', bold: true, size: 18 })] })] }),
                  new TableCell({ shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' }, children: [new Paragraph({ children: [new TextRun({ text: 'Plan AQL (Ac / Re)', bold: true, size: 18 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${report.totalLotSize} pzas`, bold: true, size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${report.sampleSizeRequired} pzas`, size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${report.sampleSizeInspected || report.sampleSizeRequired} pzas`, bold: true, size: 19, color: '0284C7' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${report.totalDefectives}`, bold: true, size: 19, color: report.totalDefectives > 0 ? 'DC2626' : '16A34A' })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Ac: ${report.acLimit} | Re: ${report.reLimit} (${report.aqlTarget}%)`, size: 19 })] })] }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 200 } }),

          // OBSERVACIONES TÉCNICAS Y PLAN DE ACCIÓN
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({ text: '3. Observaciones Técnicas y Plan de Acción', bold: true, size: 22, color: '1E293B' }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Observaciones Técnicas', bold: true, size: 19 })] })],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: report.observaciones || 'Sin observaciones.', size: 19 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Plan de Acción / Re-trabajo', bold: true, size: 19 })] })],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: report.planDeAccion || 'N/A', size: 19 })] })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 200 } }),

          // FIRMAS
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({ text: '4. Firmas de Conformidad', bold: true, size: 22, color: '1E293B' }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'RESPONSABLE DE CALIDAD', bold: true, size: 18 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.firmaCalidad?.nombre || report.inspectorName || 'Calidad', size: 19 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.firmaCalidad?.fecha || report.inspectionDate, size: 16, color: '64748B' })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.firmaCalidad?.firmado ? '✓ FIRMADO DIGITALMENTE' : 'PENDIENTE', bold: true, size: 16, color: report.firmaCalidad?.firmado ? '16A34A' : 'DC2626' })] }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SUPERVISOR DE MAQUILA', bold: true, size: 18 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.firmaMaquila?.nombre || 'Maquila', size: 19 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.firmaMaquila?.fecha || report.inspectionDate, size: 16, color: '64748B' })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.firmaMaquila?.firmado ? '✓ FIRMADO DIGITALMENTE' : 'PENDIENTE', bold: true, size: 16, color: report.firmaMaquila?.firmado ? '16A34A' : 'DC2626' })] }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
