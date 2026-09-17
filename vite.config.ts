import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig(() => {
  return {
    base: '/Reporte-de-Calidad-Maquila/',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'gemini-api-server',
        configureServer(server) {
          server.middlewares.use('/api/gemini/assist', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method Not Allowed');
              return;
            }

            let bodyStr = '';
            req.on('data', (chunk) => {
              bodyStr += chunk;
            });

            req.on('end', async () => {
              try {
                const body = JSON.parse(bodyStr || '{}');
                const apiKey = process.env.GEMINI_API_KEY;

                if (!apiKey) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'GEMINI_API_KEY environment variable is missing.' }));
                  return;
                }

                const ai = new GoogleGenAI({
                  apiKey,
                  httpOptions: {
                    headers: {
                      'User-Agent': 'aistudio-build',
                    },
                  },
                });

                const systemInstruction = `
Eres el Asistente Experto en Control de Calidad e Inspección para CV Directo (Procedimiento CVD-AMA-PR-01 "CONTROL Y EJECUCION DE ARMADOS Y MAQUILA").
Tu objetivo es redactar observaciones técnicas formales de calidad, justificaciones de dictámenes AQL y planes de acción / re-trabajo según las normas de CV Directo:
- Procedimiento: CVD-AMA-PR-01
- Formato de Gestión: CVD-CCA-F-08
- Criterios de Aceptación: AQL 1.5% Nivel II Muestreo Normal (ANSI/ASQ Z1.4).
- Si supera Re: RECHAZADO, Etiqueta Roja, Cuarentena, notificación <40 min a Supervisor de Maquila y Gerente de Almacén F.
- Si no supera Ac: APROBADO, Etiqueta Verde, transferencia a Almacén PT.

Responde de manera estructurada, clara, con vocabulario técnico de inspección de calidad industrial.
`;

                const response = await ai.models.generateContent({
                  model: 'gemini-3.6-flash',
                  contents: body.prompt || 'Genera un resumen técnico de inspección de calidad para maquila CV Directo.',
                  config: {
                    systemInstruction,
                    temperature: 0.3,
                  },
                });

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ text: response.text }));
              } catch (err: any) {
                console.error('Gemini middleware error:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Error processing AI request' }));
              }
            });
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
