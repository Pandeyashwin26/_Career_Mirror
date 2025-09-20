import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { salaryService } from "../services/salary";
import { storage } from "../storage";

export function registerLifestyleRoutes(app: Express) {
  // Get lifestyle simulation for a specific role and location
  app.get('/api/lifestyle/simulate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role, location } = req.query;

      if (!role || !location) {
        return res.status(400).json({ 
          message: "Role and location are required" 
        });
      }

      // Get user preferences from profile
      const userProfile = await storage.getUserProfile(userId);
      const preferences = {
        salaryImportance: userProfile?.salaryImportance || 5,
        wlbImportance: userProfile?.wlbImportance || 5,
        stressTolerance: userProfile?.stressTolerance || 5,
        remotePreference: userProfile?.remotePreference || 5,
        travelWillingness: userProfile?.travelWillingness || 5,
      };

      const simulation = await salaryService.generateLifestyleSimulation(
        role as string,
        location as string,
        preferences
      );

      if (!simulation) {
        return res.status(404).json({ 
          message: "Unable to generate simulation for this role and location" 
        });
      }

      res.json(simulation);
    } catch (error) {
      console.error("Error generating lifestyle simulation:", error);
      res.status(500).json({ message: "Failed to generate lifestyle simulation" });
    }
  });

  // Get or update lifestyle preferences
  app.get('/api/lifestyle/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getUserProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const preferences = {
        salaryImportance: profile.salaryImportance || 5,
        wlbImportance: profile.wlbImportance || 5,
        stressTolerance: profile.stressTolerance || 5,
        remotePreference: profile.remotePreference || 5,
        travelWillingness: profile.travelWillingness || 5,
      };

      res.json(preferences);
    } catch (error) {
      console.error("Error fetching lifestyle preferences:", error);
      res.status(500).json({ message: "Failed to fetch lifestyle preferences" });
    }
  });

  app.post('/api/lifestyle/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { salaryImportance, wlbImportance, stressTolerance, remotePreference, travelWillingness } = req.body;

      // Validate inputs (1-10 scale)
      const preferences = {
        salaryImportance: Math.max(1, Math.min(10, salaryImportance || 5)),
        wlbImportance: Math.max(1, Math.min(10, wlbImportance || 5)),
        stressTolerance: Math.max(1, Math.min(10, stressTolerance || 5)),
        remotePreference: Math.max(1, Math.min(10, remotePreference || 5)),
        travelWillingness: Math.max(1, Math.min(10, travelWillingness || 5)),
      };

      const updatedProfile = await storage.updateUserProfile(userId, preferences);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating lifestyle preferences:", error);
      res.status(500).json({ message: "Failed to update lifestyle preferences" });
    }
  });
}