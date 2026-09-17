import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = 3000;

// Read Supabase credentials from environment or fallback to .supabase-config.json
let supabaseUrl = process.env.SUPABASE_URL || '';
let supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  try {
    const configPath = path.join(process.cwd(), '.supabase-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      supabaseUrl = supabaseUrl || parsed.url || '';
      supabaseKey = supabaseKey || parsed.key || '';
    }
  } catch (err) {
    console.warn('Could not read .supabase-config.json:', err);
  }
}

// Clean URL format (remove trailing slashes or /rest/v1 if included)
supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ==========================================
  // SUPABASE DATABASE PROXY ENDPOINTS
  // ==========================================

  // 1. Connection Health / Status
  app.get('/api/supabase/status', async (_req, res) => {
    try {
      if (!supabase || !supabaseUrl || !supabaseKey) {
        return res.json({
          online: false,
          configured: false,
          message: 'Supabase URL o Key no configurados.',
          url: supabaseUrl || null,
        });
      }

      // Test connection against Supabase Auth Health endpoint
      const pingUrl = `${supabaseUrl}/auth/v1/health`;
      const pingResponse = await fetch(pingUrl, {
        method: 'GET',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });

      const isReachable = pingResponse.status === 200;
      let healthData: any = {};
      try {
        healthData = await pingResponse.json();
      } catch (_) {}

      return res.json({
        online: isReachable,
        configured: true,
        url: supabaseUrl,
        statusCode: pingResponse.status,
        version: healthData?.version,
        message: isReachable
          ? 'Conexión establecida exitosamente con la base de datos Supabase.'
          : `Supabase respondió con código HTTP ${pingResponse.status}`,
      });
    } catch (error: any) {
      console.error('Supabase Status Check Error:', error);
      return res.json({
        online: false,
        configured: Boolean(supabaseUrl && supabaseKey),
        url: supabaseUrl || null,
        message: error.message || 'No se pudo conectar con Supabase.',
      });
    }
  });

  // 2. Query / SELECT (supports automatic chunk pagination for tables with > 1000 rows)
  app.post('/api/db/query', async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: 'Supabase client is not initialized.' });
      }

      const { table, select = '*', filters = [], order, limit, page = 1, fetchAll = false } = req.body;
      if (!table) {
        return res.status(400).json({ error: 'Field "table" is required.' });
      }

      const buildBaseQuery = (rangeFrom?: number, rangeTo?: number, countExact = false) => {
        let q: any = supabase.from(table).select(select, countExact ? { count: 'exact' } : undefined);

        if (Array.isArray(filters)) {
          for (const filter of filters) {
            const { column, op = 'eq', value } = filter;
            if (!column) continue;
            switch (op) {
              case 'eq':
                q = q.eq(column, value);
                break;
              case 'neq':
                q = q.neq(column, value);
                break;
              case 'gt':
                q = q.gt(column, value);
                break;
              case 'gte':
                q = q.gte(column, value);
                break;
              case 'lt':
                q = q.lt(column, value);
                break;
              case 'lte':
                q = q.lte(column, value);
                break;
              case 'like':
                q = q.like(column, value);
                break;
              case 'ilike':
                q = q.ilike(column, value);
                break;
              case 'in':
                q = q.in(column, Array.isArray(value) ? value : [value]);
                break;
              case 'is':
                q = q.is(column, value);
                break;
              default:
                q = q.eq(column, value);
                break;
            }
          }
        }

        if (order && order.column) {
          q = q.order(order.column, { ascending: order.ascending ?? true });
        } else {
          // CRITICAL: In PostgreSQL, parallel range pagination without ORDER BY returns non-deterministic,
          // overlapping rows. We must provide a deterministic default sort column.
          if (table === 'production_armados') {
            q = q.order('sku', { ascending: true });
          } else if (table === 'production_componentes') {
            q = q.order('id', { ascending: true });
          } else if (table === 'quality_reports') {
            q = q.order('created_at', { ascending: false });
          }
        }

        if (rangeFrom !== undefined && rangeTo !== undefined) {
          q = q.range(rangeFrom, rangeTo);
        }

        return q;
      };

      const requestedLimit = limit ? Number(limit) : undefined;
      const wantsAll = Boolean(fetchAll || (requestedLimit && requestedLimit > 1000));

      // If user wants standard pagination (<= 1000 rows)
      if (!wantsAll && requestedLimit && requestedLimit <= 1000) {
        const take = requestedLimit;
        const skip = (Number(page || 1) - 1) * take;
        const query = buildBaseQuery(skip, skip + take - 1, true);
        const { data, error, count } = await query;

        if (error) {
          return res.status(400).json({
            error: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
        }
        return res.json({ data, count });
      }

      // If user wants all records or limit > 1000:
      // Step A: First request with exact count (first 1000 records)
      const firstQuery = buildBaseQuery(0, 999, true);
      const { data: firstBatch, error: firstError, count } = await firstQuery;

      if (firstError) {
        return res.status(400).json({
          error: firstError.message,
          details: firstError.details,
          hint: firstError.hint,
          code: firstError.code,
        });
      }

      const totalMatching = count ?? (firstBatch ? firstBatch.length : 0);
      const maxToFetch = requestedLimit ? Math.min(requestedLimit, totalMatching) : totalMatching;

      // If all records fit in the first batch
      if (!firstBatch || firstBatch.length >= maxToFetch || totalMatching <= 1000) {
        return res.json({ data: firstBatch || [], count: totalMatching });
      }

      // Step B: Fetch remaining chunks of 1000 in parallel
      const chunkPromises = [];
      for (let offset = 1000; offset < maxToFetch; offset += 1000) {
        const end = Math.min(offset + 999, maxToFetch - 1);
        chunkPromises.push(buildBaseQuery(offset, end, false));
      }

      const chunkResults = await Promise.all(chunkPromises);
      const combinedData = [...firstBatch];

      for (const resItem of chunkResults) {
        if (resItem.data && Array.isArray(resItem.data)) {
          combinedData.push(...resItem.data);
        }
      }

      return res.json({ data: combinedData, count: totalMatching });
    } catch (err: any) {
      console.error('Proxy Query Error:', err);
      return res.status(500).json({ error: err.message || 'Internal proxy error' });
    }
  });

  // 3. Insert / Upsert
  app.post('/api/db/insert', async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: 'Supabase client is not initialized.' });
      }

      const { table, records, upsert = false, returnData = true } = req.body;
      if (!table || records === undefined) {
        return res.status(400).json({ error: 'Fields "table" and "records" are required.' });
      }

      let query: any = upsert
        ? supabase.from(table).upsert(records)
        : supabase.from(table).insert(records);

      if (returnData) {
        query = query.select();
      }

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      }

      return res.json({ data: data || [] });
    } catch (err: any) {
      console.error('Proxy Insert Error:', err);
      return res.status(500).json({ error: err.message || 'Internal proxy error' });
    }
  });

  // 4. Update
  app.put('/api/db/update', async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: 'Supabase client is not initialized.' });
      }

      const { table, values, id, match } = req.body;
      if (!table || !values) {
        return res.status(400).json({ error: 'Fields "table" and "values" are required.' });
      }

      let query: any = supabase.from(table).update(values);

      if (id !== undefined) {
        query = query.eq('id', id);
      } else if (match && typeof match === 'object') {
        for (const [col, val] of Object.entries(match)) {
          query = query.eq(col, val);
        }
      } else {
        return res.status(400).json({ error: 'Provide either "id" or a "match" object to update.' });
      }

      const { data, error } = await query.select();

      if (error) {
        return res.status(400).json({
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      }

      return res.json({ data });
    } catch (err: any) {
      console.error('Proxy Update Error:', err);
      return res.status(500).json({ error: err.message || 'Internal proxy error' });
    }
  });

  // 5. Delete
  app.delete('/api/db/delete', async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: 'Supabase client is not initialized.' });
      }

      const { table, id, match, filters, truncate } = req.body;
      if (!table) {
        return res.status(400).json({ error: 'Field "table" is required.' });
      }

      let query: any = supabase.from(table).delete();

      if (truncate) {
        // In PostgreSQL/PostgREST, mass deletion requires a condition
        if (table === 'production_armados') {
          query = query.neq('sku', '__DUMMY_CLEAR__');
        } else if (table === 'production_componentes') {
          query = query.gte('id', 0);
        } else {
          query = query.neq('id', -999999);
        }
      } else if (id !== undefined) {
        query = query.eq('id', id);
      } else if (Array.isArray(filters) && filters.length > 0) {
        for (const filter of filters) {
          const { column, op = 'eq', value } = filter;
          if (!column) continue;
          switch (op) {
            case 'neq':
              query = query.neq(column, value);
              break;
            case 'gt':
              query = query.gt(column, value);
              break;
            case 'gte':
              query = query.gte(column, value);
              break;
            case 'lt':
              query = query.lt(column, value);
              break;
            case 'lte':
              query = query.lte(column, value);
              break;
            default:
              query = query.eq(column, value);
              break;
          }
        }
      } else if (match && typeof match === 'object') {
        for (const [col, val] of Object.entries(match)) {
          query = query.eq(col, val);
        }
      } else {
        return res.status(400).json({ error: 'Provide either "id", "match", "filters" or "truncate" to delete.' });
      }

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      }

      return res.json({ success: true, data });
    } catch (err: any) {
      console.error('Proxy Delete Error:', err);
      return res.status(500).json({ error: err.message || 'Internal proxy error' });
    }
  });

  // 6. Supabase Storage Upload for Inspection Photos (< 0.5 MB per photo)
  app.post('/api/storage/upload', async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: 'Supabase client is not initialized.' });
      }

      const { bucket = 'inspection-photos', path: filePath, fileBase64, contentType = 'image/jpeg' } = req.body;
      if (!filePath || !fileBase64) {
        return res.status(400).json({ error: 'Fields "path" and "fileBase64" are required.' });
      }

      // Convert base64 data to Buffer
      const cleanBase64 = fileBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      // Enforce strict 0.5 MB (512 KB) limit
      const maxBytes = 512 * 1024; // 524,288 bytes (0.5 MB)
      if (buffer.length > maxBytes) {
        return res.status(400).json({
          error: `La foto excede el límite permitido de 0.5MB (${(buffer.length / 1024).toFixed(1)} KB).`,
        });
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Retrieve public URL from Supabase CDN
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

      return res.json({
        success: true,
        path: data.path,
        publicUrl: urlData.publicUrl,
        sizeKb: (buffer.length / 1024).toFixed(1),
      });
    } catch (err: any) {
      console.error('Storage Upload Error:', err);
      return res.status(500).json({ error: err.message || 'Error al subir foto a Supabase Storage' });
    }
  });

  // ==========================================
  // GEMINI AI QUALITY ASSISTANT ENDPOINT
  // ==========================================
  app.post('/api/gemini/assist', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'GEMINI_API_KEY is not configured in server environment.' });
      }

      const { prompt } = req.body;

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
        contents: prompt || 'Analiza el estado del reporte de inspección de maquila.',
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      return res.json({ text: response.text });
    } catch (error: any) {
      console.error('Server Gemini Error:', error);
      return res.status(500).json({ error: error.message || 'Error processing request' });
    }
  });

  // ==========================================
  // VITE DEV MIDDLEWARE OR PRODUCTION SERVE
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
