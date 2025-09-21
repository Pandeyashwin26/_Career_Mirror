import type { Express, RequestHandler } from 'express';
import { setupAuth as setupReplitAuth, isAuthenticated as replitAuth } from './replitAuth';
import { isAuthenticated as supabaseAuth } from './supabaseAuth';

const useSupabase = process.env.USE_SUPABASE_AUTH === 'true';

export async function setupAuth(app: Express) {
  if (useSupabase) {
    // No server-side auth setup required for Supabase JWT verification
    return;
  }
  await setupReplitAuth(app);
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (useSupabase) return supabaseAuth(req, res, next);
  return replitAuth(req, res, next);
};