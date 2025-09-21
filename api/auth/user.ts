import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, type AuthenticatedRequest } from '../_lib/auth';
import { getStorage } from '../_lib/db';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const storage = getStorage();
    const claims = req.user?.claims || {};
    const userId = claims.sub;
    let user = await storage.getUser(userId);

    // In production, create a user record if it doesn't exist yet
    if (!user) {
      user = await storage.upsertUser({
        id: userId,
        email: claims.email || 'unknown@example.com',
        firstName: claims.first_name || 'Unknown',
        lastName: claims.last_name || 'User',
      });
    }

    const profile = await storage.getUserProfile(userId);
    
    res.json({
      ...(user || {}),
      profile,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}

export default function(req: VercelRequest, res: VercelResponse) {
  return withAuth(req, res, handler);
}