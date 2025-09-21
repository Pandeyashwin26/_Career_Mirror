import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, type AuthenticatedRequest } from '../_lib/auth';
import { getStorage } from '../_lib/db';
import { insertUserProfileSchema } from '../../shared/schema';

async function handleGet(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const storage = getStorage();
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    const skills = await storage.getUserSkills(userId);
    const careerPaths = await storage.getUserCareerPaths(userId);
    
    res.json({
      profile,
      skills,
      careerPaths,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
}

async function handlePost(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const storage = getStorage();
    const userId = req.user.claims.sub;
    const profileData = insertUserProfileSchema.parse({ ...req.body, userId });
    
    const existingProfile = await storage.getUserProfile(userId);
    let profile;
    
    if (existingProfile) {
      profile = await storage.updateUserProfile(userId, profileData);
    } else {
      profile = await storage.createUserProfile(profileData);
    }
    
    res.json(profile);
  } catch (error) {
    console.error("Error saving profile:", error);
    res.status(500).json({ message: "Failed to save profile" });
  }
}

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

export default function(req: VercelRequest, res: VercelResponse) {
  return withAuth(req, res, handler);
}