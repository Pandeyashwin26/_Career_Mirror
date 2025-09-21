import { QueryClient, QueryFunction } from "@tanstack/react-query";

import { supabase } from '@/lib/supabase';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  let token: string | undefined;
  if (supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    token = sessionData.session?.access_token;
  }
  const headers: Record<string, string> = {};
  if (data) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL from queryKey: first element is path, second optional element is params object
    let url = String(queryKey[0] ?? "");
    const maybeParams = queryKey[1] as Record<string, any> | undefined;
    if (maybeParams && typeof maybeParams === "object") {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(maybeParams)) {
        if (v !== undefined && v !== null && String(v).length > 0) {
          params.append(k, String(v));
        }
      }
      const qs = params.toString();
      if (qs) url += (url.includes("?") ? "&" : "?") + qs;
    }

    let token: string | undefined;
    if (supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      token = sessionData.session?.access_token;
    }
    const res = await fetch(url, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
