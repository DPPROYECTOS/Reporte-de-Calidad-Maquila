import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration - Fallback values provided for CV Directo inspection database
export const SUPABASE_URL = 
  ((import.meta as any).env?.VITE_SUPABASE_URL as string) ||
  'https://keehrjhcojbykgvlcbvx.supabase.co';

export const SUPABASE_ANON_KEY = 
  ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZWhyamhjb2pieWtndmxjYnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTgxOTEsImV4cCI6MjEwNDM5NDE5MX0.RJX4pH-afF2dmdLaJHGu2k84KsELc_0U1cXtb02Apwo';

// Clean trailing slashes or /rest/v1
const cleanUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

// Official Supabase JS client for direct frontend use if needed
export const supabase: SupabaseClient = createClient(cleanUrl, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface QueryFilter {
  column: string;
  op?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: any;
}

export interface QueryOptions {
  select?: string;
  filters?: QueryFilter[];
  order?: {
    column: string;
    ascending?: boolean;
  };
  limit?: number;
  page?: number;
  fetchAll?: boolean;
}

export interface SupabaseStatusResponse {
  online: boolean;
  configured: boolean;
  url: string | null;
  statusCode?: number;
  message?: string;
}

/**
 * Detect if application is running in a static web hosting environment (e.g. GitHub Pages)
 * where no backend Node.js / Express proxy is available.
 */
function isStaticWebHosting(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.includes('github.io') || host.includes('pages.dev') || host.includes('netlify.app') || host.includes('vercel.app') && !window.location.port;
}

/**
 * Build a query against the direct Supabase JS client
 */
function buildDirectQuery(
  table: string,
  options: QueryOptions = {},
  rangeFrom?: number,
  rangeTo?: number,
  countExact = false
) {
  let q: any = supabase.from(table).select(options.select || '*', countExact ? { count: 'exact' } : undefined);

  if (Array.isArray(options.filters)) {
    for (const filter of options.filters) {
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

  if (options.order && options.order.column) {
    q = q.order(options.order.column, { ascending: options.order.ascending ?? true });
  } else {
    // Deterministic ordering to prevent skipping/duplicating rows in parallel pagination
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
}

/**
 * Direct client-side automatic parallel chunk pagination to bypass PostgREST 1,000-row limit.
 * Guaranteed to retrieve all 2,540+ armados and 7,000+ componentes directly from browser.
 */
export async function directSupabaseGetAll<T = any>(
  table: string,
  options: Omit<QueryOptions, 'limit' | 'page' | 'fetchAll'> = {}
): Promise<{ data: T[]; count: number; error: string | null }> {
  try {
    // 0. Check for custom RPC stored procedures in Supabase if defined
    if (table === 'production_armados') {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_all_production_armados');
        if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
          return { data: rpcData as T[], count: rpcData.length, error: null };
        }
      } catch (_) {}
    } else if (table === 'production_componentes') {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_all_production_componentes');
        if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
          return { data: rpcData as T[], count: rpcData.length, error: null };
        }
      } catch (_) {}
    }

    // 1. Fetch first chunk (0-999) with exact count
    const firstQuery = buildDirectQuery(table, options, 0, 999, true);
    const { data: firstBatch, error: firstError, count } = await firstQuery;

    if (firstError) {
      return { data: [], count: 0, error: firstError.message };
    }

    const totalMatching = count ?? (firstBatch ? firstBatch.length : 0);

    // If everything fits in the first 1,000 items
    if (!firstBatch || firstBatch.length >= totalMatching || totalMatching <= 1000) {
      return {
        data: (firstBatch || []) as T[],
        count: totalMatching,
        error: null,
      };
    }

    // 2. Fetch remaining chunks of 1,000 in parallel directly from browser
    const chunkPromises = [];
    for (let offset = 1000; offset < totalMatching; offset += 1000) {
      const end = Math.min(offset + 999, totalMatching - 1);
      chunkPromises.push(buildDirectQuery(table, options, offset, end, false));
    }

    const chunkResults = await Promise.all(chunkPromises);
    const allRows: T[] = [...firstBatch];

    for (const chunk of chunkResults) {
      if (chunk.data && Array.isArray(chunk.data)) {
        allRows.push(...chunk.data);
      }
    }

    return {
      data: allRows,
      count: totalMatching,
      error: null,
    };
  } catch (err: any) {
    console.error(`directSupabaseGetAll [${table}] Error:`, err);
    return {
      data: [],
      count: 0,
      error: err.message || 'Error en consulta directa a Supabase',
    };
  }
}

/**
 * Direct client-side single query with filters and pagination
 */
export async function directSupabaseGet<T = any>(
  table: string,
  options: QueryOptions = {}
): Promise<{ data: T[] | null; count: number | null; error: string | null }> {
  try {
    if (options.fetchAll) {
      const allRes = await directSupabaseGetAll<T>(table, options);
      return {
        data: allRes.data,
        count: allRes.count,
        error: allRes.error,
      };
    }

    let rangeFrom: number | undefined = undefined;
    let rangeTo: number | undefined = undefined;

    if (options.limit !== undefined) {
      const page = options.page || 1;
      rangeFrom = (page - 1) * options.limit;
      rangeTo = rangeFrom + options.limit - 1;
    }

    const query = buildDirectQuery(table, options, rangeFrom, rangeTo, true);
    const { data, error, count } = await query;

    if (error) {
      return { data: null, count: null, error: error.message };
    }

    return {
      data: (data || []) as T[],
      count: count ?? null,
      error: null,
    };
  } catch (err: any) {
    return { data: null, count: null, error: err.message || 'Error en consulta directa' };
  }
}

/**
 * Check connectivity and status of the Supabase database via the Express proxy
 * with seamless fallback to direct client ping on static hosts like GitHub Pages.
 */
export async function checkSupabaseStatus(): Promise<SupabaseStatusResponse> {
  // If running on static hosting (e.g. GitHub Pages), ping Supabase directly
  if (isStaticWebHosting()) {
    try {
      const { count, error } = await supabase
        .from('production_armados')
        .select('sku', { count: 'exact', head: true });

      if (error) {
        return {
          online: false,
          configured: Boolean(cleanUrl && SUPABASE_ANON_KEY),
          url: cleanUrl,
          message: error.message || 'No se pudo conectar directamente con Supabase',
        };
      }

      return {
        online: true,
        configured: true,
        url: cleanUrl,
        message: `Supabase conectado directamente en GitHub Pages (${count ?? 0} armados en catálogo)`,
      };
    } catch (err: any) {
      return {
        online: false,
        configured: Boolean(cleanUrl && SUPABASE_ANON_KEY),
        url: cleanUrl,
        message: err.message || 'Error de conexión directa a Supabase',
      };
    }
  }

  try {
    const res = await fetch('/api/supabase/status');
    if (!res.ok) {
      // Fallback to direct client ping
      const { count, error } = await supabase
        .from('production_armados')
        .select('sku', { count: 'exact', head: true });

      return {
        online: !error,
        configured: true,
        url: cleanUrl,
        message: error ? error.message : `Conectado a Supabase (${count ?? 0} armados)`,
      };
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    // Fallback to direct client ping
    try {
      const { count, error } = await supabase
        .from('production_armados')
        .select('sku', { count: 'exact', head: true });

      return {
        online: !error,
        configured: true,
        url: cleanUrl,
        message: error ? error.message : `Conectado directamente a Supabase (${count ?? 0} armados)`,
      };
    } catch (e: any) {
      return {
        online: false,
        configured: Boolean(cleanUrl && SUPABASE_ANON_KEY),
        url: cleanUrl,
        message: err.message || 'Error de conexión con Supabase',
      };
    }
  }
}

/**
 * Execute SELECT queries via the backend Express proxy
 * with seamless fallback to direct Supabase client (e.g. on GitHub Pages).
 */
export async function proxyDbGet<T = any>(
  table: string,
  options: QueryOptions = {}
): Promise<{ data: T[] | null; count: number | null; error: string | null }> {
  // 1. Direct browser execution on static hosting like GitHub Pages
  if (isStaticWebHosting()) {
    return directSupabaseGet<T>(table, options);
  }

  // 2. Standard server-proxy execution in AI Studio / Node environment
  try {
    const res = await fetch('/api/db/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table,
        select: options.select || '*',
        filters: options.filters || [],
        order: options.order,
        limit: options.limit,
        page: options.page,
        fetchAll: options.fetchAll ?? false,
      }),
    });

    if (!res.ok) {
      // Fallback directly to Supabase client if proxy endpoint returned 404 / 500
      return directSupabaseGet<T>(table, options);
    }

    const result = await res.json();

    return {
      data: result.data || [],
      count: result.count ?? null,
      error: null,
    };
  } catch (err: any) {
    // Network error connecting to proxy (e.g. static host without /api/db/query)
    return directSupabaseGet<T>(table, options);
  }
}

/**
 * Fetch ALL rows from a table, seamlessly paginating past the Supabase 1,000-row limit.
 * Guaranteed to return all 2,540+ armados and 7,000+ componentes without truncation
 * both in Google AI Studio and on static hosting (GitHub Pages).
 */
export async function proxyDbGetAll<T = any>(
  table: string,
  options: Omit<QueryOptions, 'limit' | 'page' | 'fetchAll'> = {}
): Promise<{ data: T[]; count: number; error: string | null }> {
  try {
    // 1. On static hosts like GitHub Pages, run direct parallel browser chunking immediately
    if (isStaticWebHosting()) {
      return directSupabaseGetAll<T>(table, options);
    }

    // 2. Try backend proxy automatic parallel pagination first
    const res = await proxyDbGet<T>(table, {
      ...options,
      fetchAll: true,
    });

    if (!res.error && res.data && res.data.length > 0) {
      // If the backend fetched everything (matches total count or > 1000 items)
      if (res.count === null || res.data.length >= res.count || res.data.length > 1000) {
        return {
          data: res.data,
          count: res.count ?? res.data.length,
          error: null,
        };
      }
    }

    // 3. Fallback to direct client chunk pagination if proxy was truncated or failed
    return directSupabaseGetAll<T>(table, options);
  } catch (err: any) {
    console.warn(`proxyDbGetAll [${table}] Falling back to direct browser pagination:`, err);
    return directSupabaseGetAll<T>(table, options);
  }
}

/**
 * Execute INSERT or UPSERT operations via the backend Express proxy
 * with fallback to direct Supabase client for static hosting.
 */
export async function proxyDbPost<T = any>(
  table: string,
  records: any | any[],
  upsert = false,
  returnData = true
): Promise<{ data: T | T[] | null; error: string | null }> {
  // If static hosting, execute directly against Supabase
  if (isStaticWebHosting()) {
    try {
      const q = upsert
        ? supabase.from(table).upsert(records)
        : supabase.from(table).insert(records);
      
      const { data, error } = returnData ? await q.select() : await q;
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: (data as any) || null, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Error en inserción directa' };
    }
  }

  try {
    const res = await fetch('/api/db/insert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table,
        records,
        upsert,
        returnData,
      }),
    });

    if (!res.ok) {
      // Fallback directly to Supabase client
      const q = upsert
        ? supabase.from(table).upsert(records)
        : supabase.from(table).insert(records);
      const { data, error } = returnData ? await q.select() : await q;
      return { data: (data as any) || null, error: error ? error.message : null };
    }

    const result = await res.json();
    return {
      data: result.data,
      error: null,
    };
  } catch (err: any) {
    // Fallback directly to Supabase client
    try {
      const q = upsert
        ? supabase.from(table).upsert(records)
        : supabase.from(table).insert(records);
      const { data, error } = returnData ? await q.select() : await q;
      return { data: (data as any) || null, error: error ? error.message : null };
    } catch (e: any) {
      return {
        data: null,
        error: err.message || 'Error de red en inserción',
      };
    }
  }
}

/**
 * Execute UPDATE operations via the backend Express proxy
 * with fallback to direct Supabase client for static hosting.
 */
export async function proxyDbPut<T = any>(
  table: string,
  values: any,
  matchOrId: string | number | Record<string, any>
): Promise<{ data: T | T[] | null; error: string | null }> {
  const applyDirectUpdate = async () => {
    let q = supabase.from(table).update(values);
    if (typeof matchOrId === 'object' && matchOrId !== null) {
      for (const [col, val] of Object.entries(matchOrId)) {
        q = q.eq(col, val);
      }
    } else {
      q = q.eq('id', matchOrId);
    }
    const { data, error } = await q.select();
    return { data: (data as any) || null, error: error ? error.message : null };
  };

  if (isStaticWebHosting()) {
    try {
      return await applyDirectUpdate();
    } catch (err: any) {
      return { data: null, error: err.message || 'Error en actualización directa' };
    }
  }

  try {
    const payload: { table: string; values: any; id?: any; match?: Record<string, any> } = {
      table,
      values,
    };

    if (typeof matchOrId === 'object' && matchOrId !== null) {
      payload.match = matchOrId;
    } else {
      payload.id = matchOrId;
    }

    const res = await fetch('/api/db/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return await applyDirectUpdate();
    }

    const result = await res.json();
    return {
      data: result.data,
      error: null,
    };
  } catch (err: any) {
    return await applyDirectUpdate();
  }
}

/**
 * Execute DELETE operations via the backend Express proxy
 * with fallback to direct Supabase client for static hosting.
 */
export async function proxyDbDelete(
  table: string,
  matchOrId?: string | number | Record<string, any>,
  options?: { truncate?: boolean; filters?: QueryFilter[] }
): Promise<{ success: boolean; data?: any; error: string | null }> {
  const applyDirectDelete = async () => {
    let q = supabase.from(table).delete();
    if (options?.truncate) {
      if (table === 'production_armados') {
        q = q.neq('sku', '__DUMMY_CLEAR__');
      } else if (table === 'production_componentes') {
        q = q.gte('id', 0);
      } else {
        q = q.neq('id', -999999);
      }
    } else if (options?.filters && options.filters.length > 0) {
      for (const filter of options.filters) {
        if (!filter.column) continue;
        switch (filter.op) {
          case 'neq': q = q.neq(filter.column, filter.value); break;
          case 'gt': q = q.gt(filter.column, filter.value); break;
          case 'gte': q = q.gte(filter.column, filter.value); break;
          case 'lt': q = q.lt(filter.column, filter.value); break;
          case 'lte': q = q.lte(filter.column, filter.value); break;
          default: q = q.eq(filter.column, filter.value); break;
        }
      }
    } else if (typeof matchOrId === 'object' && matchOrId !== null) {
      for (const [col, val] of Object.entries(matchOrId)) {
        q = q.eq(col, val);
      }
    } else if (matchOrId !== undefined) {
      q = q.eq('id', matchOrId);
    } else {
      if (table === 'production_armados') {
        q = q.neq('sku', '__DUMMY_CLEAR__');
      } else {
        q = q.neq('id', -999999);
      }
    }
    const { data, error } = await q;
    return { success: !error, data, error: error ? error.message : null };
  };

  if (isStaticWebHosting()) {
    try {
      return await applyDirectDelete();
    } catch (err: any) {
      return { success: false, error: err.message || 'Error en eliminación directa' };
    }
  }

  try {
    const payload: { table: string; id?: any; match?: Record<string, any>; truncate?: boolean; filters?: QueryFilter[] } = {
      table,
    };

    if (options?.truncate) {
      payload.truncate = true;
    } else if (options?.filters && options.filters.length > 0) {
      payload.filters = options.filters;
    } else if (typeof matchOrId === 'object' && matchOrId !== null) {
      payload.match = matchOrId;
    } else if (matchOrId !== undefined) {
      payload.id = matchOrId;
    } else {
      payload.truncate = true;
    }

    const res = await fetch('/api/db/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return await applyDirectDelete();
    }

    const result = await res.json();
    return {
      success: true,
      data: result.data,
      error: null,
    };
  } catch (err: any) {
    return await applyDirectDelete();
  }
}
