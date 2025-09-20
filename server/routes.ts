import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { openAIService } from "./services/openai";
import { vectorSearchService } from "./services/vectorSearch";
import { registerLifestyleRoutes } from "./routes/lifestyle";
import { registerCourseRoutes } from "./routes/courses";
import { registerCareerMapRoutes } from "./routes/career-map";
import { registerAchievementRoutes } from "./routes/achievements";
import { dataIngestionService } from "./services/dataIngestion";
import { onetService } from "./services/onet";
import { escoService } from "./services/esco";
import {
  insertUserProfileSchema,
  insertUserSkillSchema,
  insertCareerPathSchema,
  insertEnrollmentSchema,
  insertChatMessageSchema,
} from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF, DOC, DOCX files
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload PDF, DOC, DOCX, or TXT files.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const profile = await storage.getUserProfile(userId);
      
      res.json({
        ...user,
        profile,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
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
  });

  app.post('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = insertUserProfileSchema.parse({ ...req.body, userId });
      
      const existingProfile = await storage.getUserProfile(userId);
      let profile;
      
      if (existingProfile) {
        profile = await storage.updateUserProfile(userId, profileData);
      } else {
        profile = await storage.createUserProfile(profileData);
      }

      // Update profile embedding when profile changes
      await vectorSearchService.updateProfileEmbedding(userId);
      
      res.json(profile);
    } catch (error) {
      console.error("Error saving profile:", error);
      res.status(500).json({ message: "Failed to save profile" });
    }
  });

  // Resume upload and parsing
  app.post('/api/profile/upload-resume', isAuthenticated, upload.single('resume'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Extract text from uploaded file (simplified - in production you'd use proper PDF/DOC parsers)
      const resumeText = req.file.buffer.toString('utf-8');
      
      // Parse resume using OpenAI
      const parsedProfile = await openAIService.parseResume(resumeText, userId);
      
      // Save parsed information
      if (parsedProfile.currentRole || parsedProfile.experience) {
        const profileData = {
          userId,
          currentRole: parsedProfile.currentRole,
          experience: parsedProfile.experience,
          education: parsedProfile.education,
          resumeText,
        };
        
        const existingProfile = await storage.getUserProfile(userId);
        if (existingProfile) {
          await storage.updateUserProfile(userId, profileData);
        } else {
          await storage.createUserProfile(profileData);
        }
      }

      // Save skills
      for (const skill of parsedProfile.skills) {
        await storage.addUserSkill(skill);
      }

      // Save career paths
      for (const path of parsedProfile.careerPaths) {
        await storage.addCareerPath(path);
      }

      // Update profile embedding
      await vectorSearchService.updateProfileEmbedding(userId);
      
      res.json({
        message: "Resume uploaded and parsed successfully",
        parsedData: parsedProfile,
      });
    } catch (error) {
      console.error("Error processing resume:", error);
      res.status(500).json({ message: "Failed to process resume" });
    }
  });

  // Skills routes
  app.post('/api/skills', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const skillData = insertUserSkillSchema.parse({ ...req.body, userId });
      
      const skill = await storage.addUserSkill(skillData);
      
      // Update profile embedding when skills change
      await vectorSearchService.updateProfileEmbedding(userId);
      
      res.json(skill);
    } catch (error) {
      console.error("Error adding skill:", error);
      res.status(500).json({ message: "Failed to add skill" });
    }
  });

  app.delete('/api/skills/:skillName', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { skillName } = req.params;
      
      await storage.deleteUserSkill(userId, skillName);
      
      // Update profile embedding when skills change
      await vectorSearchService.updateProfileEmbedding(userId);
      
      res.json({ message: "Skill deleted successfully" });
    } catch (error) {
      console.error("Error deleting skill:", error);
      res.status(500).json({ message: "Failed to delete skill" });
    }
  });

  // Career doppelgangers
  app.get('/api/doppelgangers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const doppelgangers = await vectorSearchService.findCareerDoppelgangers(userId, limit);
      
      res.json(doppelgangers);
    } catch (error) {
      console.error("Error fetching doppelgangers:", error);
      res.status(500).json({ message: "Failed to fetch career doppelgangers" });
    }
  });

  // Skill gap analysis
  app.post('/api/skill-gap-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { targetRole } = req.body;
      
      const userSkills = await storage.getUserSkills(userId);
      const skillNames = userSkills.map(skill => skill.skillName);
      
      const analysis = await openAIService.analyzeSkillGap(skillNames, targetRole);
      
      // Save the analysis
      const skillGap = await storage.createSkillGap({
        userId,
        targetRole,
        missingSkills: analysis.missingSkills,
        improvementSkills: analysis.improvementSkills,
        strongSkills: analysis.strongSkills,
        recommendations: analysis.recommendations,
      });
      
      res.json(skillGap);
    } catch (error) {
      console.error("Error analyzing skill gap:", error);
      res.status(500).json({ message: "Failed to analyze skill gap" });
    }
  });

  app.get('/api/skill-gap-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const skillGap = await storage.getLatestSkillGap(userId);
      
      res.json(skillGap);
    } catch (error) {
      console.error("Error fetching skill gap analysis:", error);
      res.status(500).json({ message: "Failed to fetch skill gap analysis" });
    }
  });

  // AI Career Guidance
  app.post('/api/ai-guidance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user context
      const user = await storage.getUser(userId);
      const profile = await storage.getUserProfile(userId);
      const careerPaths = await storage.getUserCareerPaths(userId);
      const skillGaps = await storage.getLatestSkillGap(userId);
      const doppelgangers = await vectorSearchService.findCareerDoppelgangers(userId, 3);
      
      const guidance = await openAIService.generateCareerGuidance(
        profile,
        careerPaths,
        skillGaps,
        doppelgangers
      );
      
      // Save the guidance
      const aiGuidance = await storage.createAIGuidance({
        userId,
        prompt: "Career guidance request",
        response: guidance.guidance,
        guidanceType: "career_advice",
      });
      
      res.json({
        ...guidance,
        id: aiGuidance.id,
      });
    } catch (error) {
      console.error("Error generating AI guidance:", error);
      res.status(500).json({ message: "Failed to generate AI guidance" });
    }
  });

  // Classes routes
  app.get('/api/classes', async (req, res) => {
    try {
      const { search, category, location } = req.query;
      
      let classes;
      if (search || category || location) {
        classes = await storage.searchClasses(
          search as string,
          category as string,
          location as string
        );
      } else {
        classes = await storage.getActiveClasses();
      }
      
      // Add spots remaining calculation
      const classesWithSpots = classes.map(cls => ({
        ...cls,
        spotsLeft: Math.max(0, (cls.maxStudents || 0) - (cls.currentStudents || 0)),
      }));
      
      res.json(classesWithSpots);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.get('/api/classes/recommended', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { search } = req.query;
      
      const recommendedClasses = await vectorSearchService.findRelevantClasses(
        userId,
        search as string
      );
      
      res.json(recommendedClasses);
    } catch (error) {
      console.error("Error fetching recommended classes:", error);
      res.status(500).json({ message: "Failed to fetch recommended classes" });
    }
  });

  app.post('/api/classes/:classId/enroll', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { classId } = req.params;
      
      // Check if class exists and has spots
      const classItem = await storage.getClassById(classId);
      if (!classItem) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      const spotsLeft = (classItem.maxStudents || 0) - (classItem.currentStudents || 0);
      if (spotsLeft <= 0) {
        return res.status(400).json({ message: "Class is full" });
      }
      
      const enrollment = await storage.enrollUserInClass({ userId, classId });
      
      res.json(enrollment);
    } catch (error) {
      console.error("Error enrolling in class:", error);
      res.status(500).json({ message: "Failed to enroll in class" });
    }
  });

  app.get('/api/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enrollments = await storage.getUserEnrollments(userId);
      
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  // Chat routes
  app.post('/api/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }
      
      // Save user message
      await storage.createChatMessage({
        userId,
        message,
        isBot: false,
      });
      
      // Get chat history for context
      const chatHistory = await storage.getUserChatHistory(userId, 10);
      
      // Generate AI response
      const response = await openAIService.generateChatResponse(message, userId, chatHistory);
      
      // Save bot response
      const botMessage = await storage.createChatMessage({
        userId,
        message: response,
        isBot: true,
      });
      
      res.json({
        message: response,
        id: botMessage.id,
      });
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  app.get('/api/chat/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const history = await storage.getUserChatHistory(userId, limit);
      
      res.json(history.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  // Dashboard data endpoint
  app.get('/api/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all dashboard data in parallel
      const [
        user,
        profile,
        skills,
        careerPaths,
        doppelgangers,
        skillGap,
        recommendedClasses,
        enrollments,
        latestGuidance
      ] = await Promise.all([
        storage.getUser(userId),
        storage.getUserProfile(userId),
        storage.getUserSkills(userId),
        storage.getUserCareerPaths(userId),
        vectorSearchService.findCareerDoppelgangers(userId, 5),
        storage.getLatestSkillGap(userId),
        vectorSearchService.findRelevantClasses(userId),
        storage.getUserEnrollments(userId),
        storage.getUserAIGuidance(userId, 1)
      ]);
      
      // Calculate profile completion
      let completionScore = 0;
      if (user?.firstName) completionScore += 20;
      if (user?.email) completionScore += 10;
      if (profile?.currentRole) completionScore += 20;
      if (skills.length > 0) completionScore += 25;
      if (profile?.resumeText) completionScore += 25;
      
      res.json({
        user,
        profile: {
          ...profile,
          profileCompletion: completionScore,
        },
        skills,
        careerPaths,
        doppelgangers,
        skillGap,
        recommendedClasses: recommendedClasses.slice(0, 5),
        enrollments,
        latestGuidance: latestGuidance[0],
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Data Pipeline and Career Insights routes
  app.post('/api/data-pipeline/ingest', isAuthenticated, async (req: any, res) => {
    try {
      console.log('Starting data ingestion pipeline...');
      const results = await dataIngestionService.runFullDataIngestion();
      
      res.json({
        message: 'Data ingestion completed',
        results: results,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error during data ingestion:', error);
      res.status(500).json({ 
        message: 'Data ingestion failed', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get('/api/career-insights/:role', isAuthenticated, async (req: any, res) => {
    try {
      const { role } = req.params;
      const insights = await dataIngestionService.getCareerInsights(role);
      
      res.json({
        role,
        insights,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting career insights:', error);
      res.status(500).json({ message: 'Failed to fetch career insights' });
    }
  });

  app.get('/api/onet/search/:query', isAuthenticated, async (req: any, res) => {
    try {
      const { query } = req.params;
      const occupations = await onetService.searchOccupations(query);
      
      res.json({
        query,
        occupations,
        count: occupations.length
      });
    } catch (error) {
      console.error('Error searching O*NET:', error);
      res.status(500).json({ message: 'O*NET search failed' });
    }
  });

  app.get('/api/esco/search/:query', isAuthenticated, async (req: any, res) => {
    try {
      const { query } = req.params;
      const { type = 'occupation', limit = '20' } = req.query;
      
      let results;
      if (type === 'skill') {
        results = await escoService.searchSkills(query, parseInt(limit));
      } else {
        results = await escoService.searchOccupations(query, parseInt(limit));
      }
      
      res.json({
        query,
        type,
        results,
        count: results.length
      });
    } catch (error) {
      console.error('Error searching ESCO:', error);
      res.status(500).json({ message: 'ESCO search failed' });
    }
  });

  app.get('/api/esco/career-data/:title', isAuthenticated, async (req: any, res) => {
    try {
      const { title } = req.params;
      const careerData = await escoService.getCareerData(title);
      
      if (!careerData) {
        return res.status(404).json({ message: 'Career data not found' });
      }
      
      res.json({
        title,
        careerData
      });
    } catch (error) {
      console.error('Error getting ESCO career data:', error);
      res.status(500).json({ message: 'Failed to fetch career data' });
    }
  });

  // Register additional route modules
  registerLifestyleRoutes(app);
  registerCourseRoutes(app);
  registerCareerMapRoutes(app);
  registerAchievementRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
