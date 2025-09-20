import { db } from "../db";
import { achievements } from "@shared/schema";

const seedAchievements = [
  {
    code: "profile_complete",
    name: "Profile Pioneer",
    description: "Complete your profile with all required information",
    icon: "fas fa-user-circle",
    criteriaJson: {
      type: "profile_completion",
      threshold: 100
    },
  },
  {
    code: "profile_first_skill",
    name: "Skill Seeker", 
    description: "Add your first skill to your profile",
    icon: "fas fa-star",
    criteriaJson: {
      type: "skill_count",
      threshold: 1
    },
  },
  {
    code: "profile_skill_master",
    name: "Skill Master",
    description: "Add 10 or more skills to your profile",
    icon: "fas fa-medal",
    criteriaJson: {
      type: "skill_count",
      threshold: 10
    },
  },
  {
    code: "learning_first_course",
    name: "Learning Beginner",
    description: "Enroll in your first course",
    icon: "fas fa-graduation-cap",
    criteriaJson: {
      type: "course_enrollment",
      threshold: 1
    },
  },
  {
    code: "learning_course_completed",
    name: "Course Finisher",
    description: "Complete your first course",
    icon: "fas fa-certificate",
    criteriaJson: {
      type: "course_completion",
      threshold: 1
    },
  },
  {
    code: "learning_streak",
    name: "Learning Streak",
    description: "Complete courses 7 days in a row",
    icon: "fas fa-fire",
    criteriaJson: {
      type: "learning_streak",
      threshold: 7
    },
  },
  {
    code: "career_path_set",
    name: "Path Finder",
    description: "Set your first career path goal",
    icon: "fas fa-route",
    criteriaJson: {
      type: "career_path",
      threshold: 1
    },
  },
  {
    code: "career_skill_gap_analyzed",
    name: "Gap Analyzer",
    description: "Complete your first skill gap analysis",
    icon: "fas fa-chart-bar",
    criteriaJson: {
      type: "skill_gap_analysis",
      threshold: 1
    },
  },
  {
    code: "career_doppelganger_found",
    name: "Mirror Mirror",
    description: "Find your first career doppelgänger",
    icon: "fas fa-search",
    criteriaJson: {
      type: "doppelganger_found",
      threshold: 1
    },
  },
  {
    code: "social_ai_chat_started",
    name: "AI Conversationalist",
    description: "Start your first AI conversation",
    icon: "fas fa-robot",
    criteriaJson: {
      type: "ai_chat_count",
      threshold: 1
    },
  },
  {
    code: "social_ai_chat_veteran",
    name: "AI Veteran",
    description: "Have 50 conversations with AI",
    icon: "fas fa-comments",
    criteriaJson: {
      type: "ai_chat_count",
      threshold: 50
    },
  },
];

async function seedAchievementsData() {
  try {
    console.log("Seeding achievements...");
    
    // Insert achievements if they don't exist
    for (const achievement of seedAchievements) {
      await db
        .insert(achievements)
        .values(achievement)
        .onConflictDoNothing(); // Don't insert if code already exists
    }
    
    console.log(`Seeded ${seedAchievements.length} achievements successfully`);
  } catch (error) {
    console.error("Error seeding achievements:", error);
    throw error;
  }
}

// Run if called directly
seedAchievementsData()
  .then(() => {
    console.log("Achievement seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Achievement seeding failed:", error);
    process.exit(1);
  });

export { seedAchievementsData };