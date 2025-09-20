import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { courseService } from "../services/courses";
import { storage } from "../storage";

export function registerCourseRoutes(app: Express) {
  // Search for courses based on skills and providers
  app.get('/api/courses/search', isAuthenticated, async (req: any, res) => {
    try {
      const { skills, providers } = req.query;

      if (!skills) {
        return res.status(400).json({ 
          message: "Skills parameter is required" 
        });
      }

      // Parse skills and providers from query string
      const skillsArray = Array.isArray(skills) ? skills : skills.split(',');
      const providersArray = providers ? 
        (Array.isArray(providers) ? providers : providers.split(',')) : 
        [];

      const courses = await courseService.searchCourses(skillsArray, providersArray);
      res.json(courses);
    } catch (error) {
      console.error("Error searching courses:", error);
      res.status(500).json({ message: "Failed to search courses" });
    }
  });

  // Get recommended courses based on skill gaps
  app.get('/api/courses/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get latest skill gap analysis
      const skillGap = await storage.getLatestSkillGap(userId);
      
      if (!skillGap) {
        return res.status(404).json({ 
          message: "No skill gap analysis found. Please run skill gap analysis first." 
        });
      }

      const courses = await courseService.getRecommendedCourses(
        skillGap.missingSkills || [],
        skillGap.improvementSkills || []
      );

      res.json({
        skillGap: {
          targetRole: skillGap.targetRole,
          missingSkills: skillGap.missingSkills,
          improvementSkills: skillGap.improvementSkills,
        },
        courses,
      });
    } catch (error) {
      console.error("Error getting course recommendations:", error);
      res.status(500).json({ message: "Failed to get course recommendations" });
    }
  });

  // Get course details by external course ID (for future API integrations)
  app.get('/api/courses/:courseId', isAuthenticated, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      
      // For now, return a placeholder response
      // In a real implementation, this would fetch from the actual course provider's API
      res.json({
        id: courseId,
        message: "Course details would be fetched from external API",
        note: "This endpoint is prepared for future integration with course provider APIs"
      });
    } catch (error) {
      console.error("Error fetching course details:", error);
      res.status(500).json({ message: "Failed to fetch course details" });
    }
  });
}