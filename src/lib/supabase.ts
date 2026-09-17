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
 * Check connectivity and status of the Supabase database via the Express proxy
 */
export async function checkSupabaseStatus(): Promise<SupabaseStatusResponse> {
  try {
    const res = await fetch('/api/supabase/status');
    if (!res.ok) {
      return {
        online: false,
        configured: true,
        url: cleanUrl,
        message: `Servidor proxy respondió con estado HTTP ${res.status}`,
      };
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      online: false,
      configured: Boolean(cleanUrl && SUPABASE_ANON_KEY),
      url: cleanUrl,
      message: err.message || 'Error de conexión con el proxy backend de Supabase',
    };
  }
}

/**
 * Execute SELECT queries via the backend Express proxy
 */
export async function proxyDbGet<T = any>(
  table: string,
  options: QueryOptions = {}
): Promise<{ data: T[] | null; count: number | null; error: string | null }> {
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

    const result = await res.json();

    if (!res.ok) {
      return {
        data: null,
        count: null,
        error: result.error || `HTTP ${res.status}: Falló consulta a ${table}`,
      };
    }

    return {
      data: result.data || [],
      count: result.count ?? null,
      error: null,
    };
  } catch (err: any) {
    console.error(`proxyDbGet [${table}] Error:`, err);
    return {
      data: null,
      count: null,
      error: err.message || 'Error de red en consulta proxy',
    };
  }
}

/**
 * Fetch ALL rows from a table, seamlessly paginating past the Supabase 1,000-row limit.
 * Guaranteed to return all 8,000+ rows without truncation.
 */
export async function proxyDbGetAll<T = any>(
  table: string,
  options: Omit<QueryOptions, 'limit' | 'page' | 'fetchAll'> = {}
): Promise<{ data: T[]; count: number; error: string | null }> {
  try {
    // 1. First attempt with backend proxy automatic parallel pagination
    const res = await proxyDbGet<T>(table, {
      ...options,
      fetchAll: true,
    });

    if (!res.error && res.data && res.data.length > 0) {
      // If the backend fetched everything (or matches count)
      if (res.count === null || res.data.length >= res.count || res.data.length > 1000) {
        return {
          data: res.data,
          count: res.count ?? res.data.length,
          error: null,
        };
      }
    }

    // 2. Client-side sequential fallback if the proxy only returned the first 1000 items
    const allRows: T[] = res.data ? [...res.data] : [];
    const expectedCount = res.count ?? 0;

    if (allRows.length < expectedCount && allRows.length >= 1000) {
      let page = 2;
      let hasMore = true;

      while (hasMore) {
        const nextRes = await proxyDbGet<T>(table, {
          ...options,
          limit: 1000,
          page,
          fetchAll: false,
        });

        if (nextRes.error || !nextRes.data || nextRes.data.length === 0) {
          hasMore = false;
          break;
        }

        allRows.push(...nextRes.data);
        if (nextRes.data.length < 1000 || allRows.length >= expectedCount) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    return {
      data: allRows,
      count: expectedCount || allRows.length,
      error: res.error,
    };
  } catch (err: any) {
    console.error(`proxyDbGetAll [${table}] Error:`, err);
    return {
      data: [],
      count: 0,
      error: err.message || 'Error al obtener registros completos',
    };
  }
}

/**
 * Execute INSERT or UPSERT operations via the backend Express proxy
 */
export async function proxyDbPost<T = any>(
  table: string,
  records: any | any[],
  upsert = false,
  returnData = true
): Promise<{ data: T | T[] | null; error: string | null }> {
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

    const result = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: result.error || `HTTP ${res.status}: Falló inserción en ${table}`,
      };
    }

    return {
      data: result.data,
      error: null,
    };
  } catch (err: any) {
    console.error(`proxyDbPost [${table}] Error:`, err);
    return {
      data: null,
      error: err.message || 'Error de red en inserción proxy',
    };
  }
}

/**
 * Execute UPDATE operations via the backend Express proxy
 */
export async function proxyDbPut<T = any>(
  table: string,
  values: any,
  matchOrId: string | number | Record<string, any>
): Promise<{ data: T | T[] | null; error: string | null }> {
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

    const result = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: result.error || `HTTP ${res.status}: Falló actualización en ${table}`,
      };
    }

    return {
      data: result.data,
      error: null,
    };
  } catch (err: any) {
    console.error(`proxyDbPut [${table}] Error:`, err);
    return {
      data: null,
      error: err.message || 'Error de red en actualización proxy',
    };
  }
}

/**
 * Execute DELETE operations via the backend Express proxy
 */
export async function proxyDbDelete(
  table: string,
  matchOrId?: string | number | Record<string, any>,
  options?: { truncate?: boolean; filters?: QueryFilter[] }
): Promise<{ success: boolean; data?: any; error: string | null }> {
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

    const result = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${res.status}: Falló eliminación en ${table}`,
      };
    }

    return {
      success: true,
      data: result.data,
      error: null,
    };
  } catch (err: any) {
    console.error(`proxyDbDelete [${table}] Error:`, err);
    return {
      success: false,
      error: err.message || 'Error de red en eliminación proxy',
    };
  }
}
