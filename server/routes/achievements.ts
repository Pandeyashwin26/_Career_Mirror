import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  points: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
  requirements: string[];
}

interface UserStats {
  totalPoints: number;
  level: number;
  pointsToNextLevel: number;
  totalAchievements: number;
  unlockedAchievements: number;
  streakDays: number;
  profileCompletionPercent: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  currentValue: number;
  isCompleted: boolean;
  reward: string;
  deadline?: string;
}

export function registerAchievementRoutes(app: Express) {
  // Get user achievements, stats, and milestones
  app.get('/api/achievements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get all achievements from database
      const allAchievements = await storage.getAchievements();
      
      // Get user's earned achievements
      const userAchievements = await storage.getUserAchievements(userId);
      
      // Map achievements with user progress
      const achievementsWithProgress = allAchievements.map(achievement => {
        const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
        return {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description || "",
          category: achievement.code.split('_')[0], // Extract category from code
          icon: achievement.icon || "fas fa-trophy",
          points: getPointsForAchievement(achievement.code),
          isUnlocked: !!userAchievement,
          unlockedAt: userAchievement?.earnedAt,
          progress: userAchievement?.progress || 0,
          maxProgress: 100,
          requirements: getRequirementsForAchievement(achievement.code),
        };
      });

      // Calculate user stats
      const userStats = await calculateUserStats(userId);
      
      // Get user milestones
      const milestones = await generateUserMilestones(userId);

      res.json({
        achievements: achievementsWithProgress,
        userStats,
        milestones,
      });
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // Claim achievement reward
  app.post('/api/achievements/:achievementId/claim', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { achievementId } = req.params;

      // Check if user has this achievement
      const userAchievements = await storage.getUserAchievements(userId);
      const hasAchievement = userAchievements.some(ua => ua.achievementId === achievementId);

      if (!hasAchievement) {
        return res.status(404).json({ message: "Achievement not found or not unlocked" });
      }

      // TODO: Implement actual reward system
      // This could give rewards like:
      // - XP points to user profile
      // - Virtual currency
      // - Unlock premium features
      // - Special badges
      
      res.json({ 
        message: "Reward claimed successfully",
        reward: "Experience points added to your profile!"
      });
    } catch (error) {
      console.error("Error claiming achievement reward:", error);
      res.status(500).json({ message: "Failed to claim reward" });
    }
  });

  // Trigger achievement check (called after user actions)
  app.post('/api/achievements/check', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { action, data } = req.body;

      const newlyUnlocked = await checkAndUnlockAchievements(userId, action, data);
      
      res.json({ 
        newlyUnlocked: newlyUnlocked.length,
        achievements: newlyUnlocked,
      });
    } catch (error) {
      console.error("Error checking achievements:", error);
      res.status(500).json({ message: "Failed to check achievements" });
    }
  });
}

function getPointsForAchievement(code: string): number {
  const pointsMap: Record<string, number> = {
    'profile_complete': 50,
    'profile_first_skill': 25,
    'profile_skill_master': 100,
    'learning_first_course': 30,
    'learning_course_completed': 75,
    'learning_streak': 150,
    'career_path_set': 40,
    'career_skill_gap_analyzed': 60,
    'career_doppelganger_found': 80,
    'social_ai_chat_started': 35,
    'social_ai_chat_veteran': 200,
  };
  return pointsMap[code] || 25;
}

function getRequirementsForAchievement(code: string): string[] {
  const requirementsMap: Record<string, string[]> = {
    'profile_complete': [
      'Add profile photo',
      'Fill in basic information',
      'Add current role',
      'Upload resume',
      'Set career goals'
    ],
    'profile_first_skill': ['Add at least one skill'],
    'profile_skill_master': ['Add 10 different skills'],
    'learning_first_course': ['Enroll in any course'],
    'learning_course_completed': ['Complete any course'],
    'learning_streak': ['7-day learning streak'],
    'career_path_set': ['Set a career path goal'],
    'career_skill_gap_analyzed': ['Complete skill gap analysis'],
    'career_doppelganger_found': ['Find a career doppelgänger'],
    'social_ai_chat_started': ['Send first message to AI'],
    'social_ai_chat_veteran': ['50 AI conversations'],
  };
  return requirementsMap[code] || ['Complete the required action'];
}

function generateAllAchievements(): Achievement[] {
  return [
    // Profile Achievements
    {
      id: "profile_complete",
      name: "Profile Pioneer",
      description: "Complete your profile with all required information",
      category: "profile",
      icon: "fas fa-user-circle",
      points: 50,
      isUnlocked: false,
      maxProgress: 5,
      requirements: [
        "Add profile photo",
        "Fill in basic information",
        "Add current role",
        "Upload resume",
        "Set career goals"
      ],
    },
    {
      id: "first_skill",
      name: "Skill Seeker",
      description: "Add your first skill to your profile",
      category: "profile",
      icon: "fas fa-star",
      points: 25,
      isUnlocked: false,
      maxProgress: 1,
      requirements: ["Add at least one skill"],
    },
    {
      id: "skill_master",
      name: "Skill Master",
      description: "Add 10 or more skills to your profile",
      category: "profile",
      icon: "fas fa-medal",
      points: 100,
      isUnlocked: false,
      maxProgress: 10,
      requirements: ["Add 10 different skills"],
    },

    // Learning Achievements
    {
      id: "first_course",
      name: "Learning Beginner",
      description: "Enroll in your first course",
      category: "learning",
      icon: "fas fa-graduation-cap",
      points: 30,
      isUnlocked: false,
      maxProgress: 1,
      requirements: ["Enroll in any course"],
    },
    {
      id: "course_completed",
      name: "Course Finisher",
      description: "Complete your first course",
      category: "learning",
      icon: "fas fa-certificate",
      points: 75,
      isUnlocked: false,
      maxProgress: 1,
      requirements: ["Complete any course"],
    },
    {
      id: "learning_streak",
      name: "Learning Streak",
      description: "Complete courses 7 days in a row",
      category: "learning",
      icon: "fas fa-fire",
      points: 150,
      isUnlocked: false,
      maxProgress: 7,
      requirements: ["7-day learning streak"],
    },

    // Career Achievements
    {
      id: "career_path_set",
      name: "Path Finder",
      description: "Set your first career path goal",
      category: "career",
      icon: "fas fa-route",
      points: 40,
      isUnlocked: false,
      maxProgress: 1,
      requirements: ["Set a career path goal"],
    },
    {
      id: "skill_gap_analyzed",
      name: "Gap Analyzer",
      description: "Complete your first skill gap analysis",
      category: "career",
      icon: "fas fa-chart-bar",
      points: 60,
      isUnlocked: false,
      maxProgress: 1,
      requirements: ["Complete skill gap analysis"],
    },
    {
      id: "doppelganger_found",
      name: "Mirror Mirror",
      description: "Find your first career doppelgänger",
      category: "career",
      icon: "fas fa-search",
      points: 80,
      isUnlocked: false,
      maxProgress: 1,
      requirements: ["Find a career doppelgänger"],
    },

    // Social Achievements
    {
      id: "ai_chat_started",
      name: "AI Conversationalist",
      description: "Start your first AI conversation",
      category: "social",
      icon: "fas fa-robot",
      points: 35,
      isUnlocked: false,
      maxProgress: 1,
      requirements: ["Send first message to AI"],
    },
    {
      id: "ai_chat_veteran",
      name: "AI Veteran",
      description: "Have 50 conversations with AI",
      category: "social",
      icon: "fas fa-comments",
      points: 200,
      isUnlocked: false,
      maxProgress: 50,
      requirements: ["50 AI conversations"],
    },
  ];
}

async function calculateUserStats(userId: string): Promise<UserStats> {
  const [userAchievements, profile, skills] = await Promise.all([
    storage.getUserAchievements(userId),
    storage.getUserProfile(userId),
    storage.getUserSkills(userId),
  ]);

  const totalPoints = userAchievements.reduce((sum, achievement) => {
    const achievementData = generateAllAchievements().find(a => a.id === achievement.achievementId);
    return sum + (achievementData?.points || 0);
  }, 0);

  const level = Math.floor(totalPoints / 100) + 1;
  const pointsToNextLevel = (level * 100) - totalPoints;
  
  const allAchievements = generateAllAchievements();
  const profileCompletionPercent = calculateProfileCompletion(profile, skills);

  return {
    totalPoints,
    level,
    pointsToNextLevel,
    totalAchievements: allAchievements.length,
    unlockedAchievements: userAchievements.length,
    streakDays: 0, // TODO: Implement streak tracking
    profileCompletionPercent,
  };
}

function calculateProfileCompletion(profile: any, skills: any[]): number {
  let completion = 0;
  if (profile?.firstName) completion += 20;
  if (profile?.currentRole) completion += 20;
  if (profile?.resumeText) completion += 20;
  if (skills.length > 0) completion += 20;
  if (profile?.careerGoals) completion += 20;
  return completion;
}

function calculateAchievementProgress(achievementId: string, userId: string): number {
  // This is a simplified version - in a real implementation,
  // you'd calculate actual progress based on user data
  
  switch (achievementId) {
    case "profile_complete":
      return 3; // Example: 3 out of 5 profile sections completed
    case "skill_master":
      return 5; // Example: 5 out of 10 skills added
    case "learning_streak":
      return 2; // Example: 2 out of 7 days
    case "ai_chat_veteran":
      return 12; // Example: 12 out of 50 conversations
    default:
      return 0;
  }
}

async function generateUserMilestones(userId: string): Promise<Milestone[]> {
  const [profile, skills, careerPaths] = await Promise.all([
    storage.getUserProfile(userId),
    storage.getUserSkills(userId),
    storage.getUserCareerPaths(userId),
  ]);

  const milestones: Milestone[] = [];

  // Profile completion milestone
  const profileCompletion = calculateProfileCompletion(profile, skills);
  if (profileCompletion < 100) {
    milestones.push({
      id: "complete_profile",
      title: "Complete Your Profile",
      description: "Fill out all sections of your profile to unlock personalized recommendations",
      category: "profile",
      targetValue: 100,
      currentValue: profileCompletion,
      isCompleted: false,
      reward: "50 XP + Personalized recommendations",
    });
  }

  // Skills milestone
  if (skills.length < 5) {
    milestones.push({
      id: "add_skills",
      title: "Build Your Skill Portfolio",
      description: "Add at least 5 skills to get better career matching",
      category: "skills",
      targetValue: 5,
      currentValue: skills.length,
      isCompleted: false,
      reward: "75 XP + Advanced matching",
    });
  }

  // Career path milestone
  if (careerPaths.length === 0) {
    milestones.push({
      id: "set_career_path",
      title: "Define Your Career Journey",
      description: "Set your first career path to start tracking progress",
      category: "career",
      targetValue: 1,
      currentValue: 0,
      isCompleted: false,
      reward: "100 XP + Path tracking",
    });
  }

  return milestones;
}

async function checkAndUnlockAchievements(userId: string, action: string, data: any): Promise<Achievement[]> {
  // This would check if any achievements should be unlocked based on the user's action
  // For example: if action === "profile_updated", check profile completion achievements
  // Return any newly unlocked achievements
  
  return [];
}