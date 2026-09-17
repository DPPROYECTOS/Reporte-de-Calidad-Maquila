var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_supabase_js = require("@supabase/supabase-js");
var import_vite = require("vite");
import_dotenv.default.config();
var PORT = 3e3;
var supabaseUrl = process.env.SUPABASE_URL || "";
var supabaseKey = process.env.SUPABASE_ANON_KEY || "";
if (!supabaseUrl || !supabaseKey) {
  try {
    const configPath = import_path.default.join(process.cwd(), ".supabase-config.json");
    if (import_fs.default.existsSync(configPath)) {
      const parsed = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
      supabaseUrl = supabaseUrl || parsed.url || "";
      supabaseKey = supabaseKey || parsed.key || "";
    }
  } catch (err) {
    console.warn("Could not read .supabase-config.json:", err);
  }
}
supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
var supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
  app.get("/api/supabase/status", async (_req, res) => {
    try {
      if (!supabase || !supabaseUrl || !supabaseKey) {
        return res.json({
          online: false,
          configured: false,
          message: "Supabase URL o Key no configurados.",
          url: supabaseUrl || null
        });
      }
      const pingUrl = `${supabaseUrl}/auth/v1/health`;
      const pingResponse = await fetch(pingUrl, {
        method: "GET",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      });
      const isReachable = pingResponse.status === 200;
      let healthData = {};
      try {
        healthData = await pingResponse.json();
      } catch (_) {
      }
      return res.json({
        online: isReachable,
        configured: true,
        url: supabaseUrl,
        statusCode: pingResponse.status,
        version: healthData?.version,
        message: isReachable ? "Conexi\xF3n establecida exitosamente con la base de datos Supabase." : `Supabase respondi\xF3 con c\xF3digo HTTP ${pingResponse.status}`
      });
    } catch (error) {
      console.error("Supabase Status Check Error:", error);
      return res.json({
        online: false,
        configured: Boolean(supabaseUrl && supabaseKey),
        url: supabaseUrl || null,
        message: error.message || "No se pudo conectar con Supabase."
      });
    }
  });
  app.post("/api/db/query", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: "Supabase client is not initialized." });
      }
      const { table, select = "*", filters = [], order, limit, page = 1, fetchAll = false } = req.body;
      if (!table) {
        return res.status(400).json({ error: 'Field "table" is required.' });
      }
      const buildBaseQuery = (rangeFrom, rangeTo, countExact = false) => {
        let q = supabase.from(table).select(select, countExact ? { count: "exact" } : void 0);
        if (Array.isArray(filters)) {
          for (const filter of filters) {
            const { column, op = "eq", value } = filter;
            if (!column) continue;
            switch (op) {
              case "eq":
                q = q.eq(column, value);
                break;
              case "neq":
                q = q.neq(column, value);
                break;
              case "gt":
                q = q.gt(column, value);
                break;
              case "gte":
                q = q.gte(column, value);
                break;
              case "lt":
                q = q.lt(column, value);
                break;
              case "lte":
                q = q.lte(column, value);
                break;
              case "like":
                q = q.like(column, value);
                break;
              case "ilike":
                q = q.ilike(column, value);
                break;
              case "in":
                q = q.in(column, Array.isArray(value) ? value : [value]);
                break;
              case "is":
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
          if (table === "production_armados") {
            q = q.order("sku", { ascending: true });
          } else if (table === "production_componentes") {
            q = q.order("id", { ascending: true });
          } else if (table === "quality_reports") {
            q = q.order("created_at", { ascending: false });
          }
        }
        if (rangeFrom !== void 0 && rangeTo !== void 0) {
          q = q.range(rangeFrom, rangeTo);
        }
        return q;
      };
      const requestedLimit = limit ? Number(limit) : void 0;
      const wantsAll = Boolean(fetchAll || requestedLimit && requestedLimit > 1e3);
      if (!wantsAll && requestedLimit && requestedLimit <= 1e3) {
        const take = requestedLimit;
        const skip = (Number(page || 1) - 1) * take;
        const query = buildBaseQuery(skip, skip + take - 1, true);
        const { data, error, count: count2 } = await query;
        if (error) {
          return res.status(400).json({
            error: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
        }
        return res.json({ data, count: count2 });
      }
      const firstQuery = buildBaseQuery(0, 999, true);
      const { data: firstBatch, error: firstError, count } = await firstQuery;
      if (firstError) {
        return res.status(400).json({
          error: firstError.message,
          details: firstError.details,
          hint: firstError.hint,
          code: firstError.code
        });
      }
      const totalMatching = count ?? (firstBatch ? firstBatch.length : 0);
      const maxToFetch = requestedLimit ? Math.min(requestedLimit, totalMatching) : totalMatching;
      if (!firstBatch || firstBatch.length >= maxToFetch || totalMatching <= 1e3) {
        return res.json({ data: firstBatch || [], count: totalMatching });
      }
      const chunkPromises = [];
      for (let offset = 1e3; offset < maxToFetch; offset += 1e3) {
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
    } catch (err) {
      console.error("Proxy Query Error:", err);
      return res.status(500).json({ error: err.message || "Internal proxy error" });
    }
  });
  app.post("/api/db/insert", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: "Supabase client is not initialized." });
      }
      const { table, records, upsert = false, returnData = true } = req.body;
      if (!table || records === void 0) {
        return res.status(400).json({ error: 'Fields "table" and "records" are required.' });
      }
      let query = upsert ? supabase.from(table).upsert(records) : supabase.from(table).insert(records);
      if (returnData) {
        query = query.select();
      }
      const { data, error } = await query;
      if (error) {
        return res.status(400).json({
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
      }
      return res.json({ data: data || [] });
    } catch (err) {
      console.error("Proxy Insert Error:", err);
      return res.status(500).json({ error: err.message || "Internal proxy error" });
    }
  });
  app.put("/api/db/update", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: "Supabase client is not initialized." });
      }
      const { table, values, id, match } = req.body;
      if (!table || !values) {
        return res.status(400).json({ error: 'Fields "table" and "values" are required.' });
      }
      let query = supabase.from(table).update(values);
      if (id !== void 0) {
        query = query.eq("id", id);
      } else if (match && typeof match === "object") {
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
          code: error.code
        });
      }
      return res.json({ data });
    } catch (err) {
      console.error("Proxy Update Error:", err);
      return res.status(500).json({ error: err.message || "Internal proxy error" });
    }
  });
  app.delete("/api/db/delete", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: "Supabase client is not initialized." });
      }
      const { table, id, match, filters, truncate } = req.body;
      if (!table) {
        return res.status(400).json({ error: 'Field "table" is required.' });
      }
      let query = supabase.from(table).delete();
      if (truncate) {
        if (table === "production_armados") {
          query = query.neq("sku", "__DUMMY_CLEAR__");
        } else if (table === "production_componentes") {
          query = query.gte("id", 0);
        } else {
          query = query.neq("id", -999999);
        }
      } else if (id !== void 0) {
        query = query.eq("id", id);
      } else if (Array.isArray(filters) && filters.length > 0) {
        for (const filter of filters) {
          const { column, op = "eq", value } = filter;
          if (!column) continue;
          switch (op) {
            case "neq":
              query = query.neq(column, value);
              break;
            case "gt":
              query = query.gt(column, value);
              break;
            case "gte":
              query = query.gte(column, value);
              break;
            case "lt":
              query = query.lt(column, value);
              break;
            case "lte":
              query = query.lte(column, value);
              break;
            default:
              query = query.eq(column, value);
              break;
          }
        }
      } else if (match && typeof match === "object") {
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
          code: error.code
        });
      }
      return res.json({ success: true, data });
    } catch (err) {
      console.error("Proxy Delete Error:", err);
      return res.status(500).json({ error: err.message || "Internal proxy error" });
    }
  });
  app.post("/api/storage/upload", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: "Supabase client is not initialized." });
      }
      const { bucket = "inspection-photos", path: filePath, fileBase64, contentType = "image/jpeg" } = req.body;
      if (!filePath || !fileBase64) {
        return res.status(400).json({ error: 'Fields "path" and "fileBase64" are required.' });
      }
      const cleanBase64 = fileBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      const maxBytes = 512 * 1024;
      if (buffer.length > maxBytes) {
        return res.status(400).json({
          error: `La foto excede el l\xEDmite permitido de 0.5MB (${(buffer.length / 1024).toFixed(1)} KB).`
        });
      }
      const { data, error } = await supabase.storage.from(bucket).upload(filePath, buffer, {
        contentType,
        upsert: true
      });
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return res.json({
        success: true,
        path: data.path,
        publicUrl: urlData.publicUrl,
        sizeKb: (buffer.length / 1024).toFixed(1)
      });
    } catch (err) {
      console.error("Storage Upload Error:", err);
      return res.status(500).json({ error: err.message || "Error al subir foto a Supabase Storage" });
    }
  });
  app.post("/api/gemini/assist", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured in server environment." });
      }
      const { prompt } = req.body;
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const systemInstruction = `
Eres el Asistente Experto en Control de Calidad e Inspecci\xF3n para CV Directo (Procedimiento CVD-AMA-PR-01 "CONTROL Y EJECUCION DE ARMADOS Y MAQUILA").
Tu objetivo es redactar observaciones t\xE9cnicas formales de calidad, justificaciones de dict\xE1menes AQL y planes de acci\xF3n / re-trabajo seg\xFAn las normas de CV Directo:
- Procedimiento: CVD-AMA-PR-01
- Formato de Gesti\xF3n: CVD-CCA-F-08
- Criterios de Aceptaci\xF3n: AQL 1.5% Nivel II Muestreo Normal (ANSI/ASQ Z1.4).
- Si supera Re: RECHAZADO, Etiqueta Roja, Cuarentena, notificaci\xF3n <40 min a Supervisor de Maquila y Gerente de Almac\xE9n F.
- Si no supera Ac: APROBADO, Etiqueta Verde, transferencia a Almac\xE9n PT.

Responde de manera estructurada, clara, con vocabulario t\xE9cnico de inspecci\xF3n de calidad industrial.
`;
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt || "Analiza el estado del reporte de inspecci\xF3n de maquila.",
        config: {
          systemInstruction,
          temperature: 0.3
        }
      });
      return res.json({ text: response.text });
    } catch (error) {
      console.error("Server Gemini Error:", error);
      return res.status(500).json({ error: error.message || "Error processing request" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
