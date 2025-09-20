import {
  users,
  userProfiles,
  userSkills,
  careerPaths,
  profileEmbeddings,
  classes,
  enrollments,
  skillGaps,
  aiGuidance,
  chatMessages,
  achievements,
  userAchievements,
  notifications,
  salaryCache,
  type User,
  type UpsertUser,
  type UserProfile,
  type InsertUserProfile,
  type UserSkill,
  type InsertUserSkill,
  type CareerPath,
  type InsertCareerPath,
  type ProfileEmbedding,
  type Class,
  type InsertClass,
  type Enrollment,
  type InsertEnrollment,
  type SkillGap,
  type InsertSkillGap,
  type AIGuidance,
  type InsertAIGuidance,
  type ChatMessage,
  type InsertChatMessage,
  type Achievement,
  type InsertAchievement,
  type UserAchievement,
  type InsertUserAchievement,
  type Notification,
  type InsertNotification,
  type SalaryCache,
  type InsertSalaryCache,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Profile operations
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile>;
  
  // Skills operations
  getUserSkills(userId: string): Promise<UserSkill[]>;
  addUserSkill(skill: InsertUserSkill): Promise<UserSkill>;
  deleteUserSkill(userId: string, skillName: string): Promise<void>;
  
  // Career paths operations
  getUserCareerPaths(userId: string): Promise<CareerPath[]>;
  addCareerPath(path: InsertCareerPath): Promise<CareerPath>;
  
  // Profile embeddings operations
  getProfileEmbedding(userId: string): Promise<ProfileEmbedding | undefined>;
  upsertProfileEmbedding(userId: string, embedding: number[], profileData: any): Promise<ProfileEmbedding>;
  findSimilarProfiles(embedding: number[], limit: number): Promise<ProfileEmbedding[]>;
  
  // Classes operations
  getActiveClasses(): Promise<Class[]>;
  getClassById(id: string): Promise<Class | undefined>;
  searchClasses(query: string, category?: string, location?: string): Promise<Class[]>;
  updateClassEnrollment(classId: string, increment: number): Promise<void>;
  
  // Enrollment operations
  enrollUserInClass(enrollment: InsertEnrollment): Promise<Enrollment>;
  getUserEnrollments(userId: string): Promise<(Enrollment & { class: Class })[]>;
  
  // Skill gap operations
  getLatestSkillGap(userId: string): Promise<SkillGap | undefined>;
  createSkillGap(skillGap: InsertSkillGap): Promise<SkillGap>;
  
  // AI guidance operations
  createAIGuidance(guidance: InsertAIGuidance): Promise<AIGuidance>;
  getUserAIGuidance(userId: string, limit?: number): Promise<AIGuidance[]>;
  
  // Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getUserChatHistory(userId: string, limit?: number): Promise<ChatMessage[]>;
  
  // Achievement operations
  getAchievements(): Promise<Achievement[]>;
  getUserAchievements(userId: string): Promise<(UserAchievement & { achievement: Achievement })[]>;
  awardAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, status?: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  
  // Salary cache operations
  getSalaryCacheEntry(role: string, location: string): Promise<SalaryCache | undefined>;
  cacheSalaryData(salaryData: InsertSalaryCache): Promise<SalaryCache>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Profile operations
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [newProfile] = await db
      .insert(userProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateUserProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile> {
    const [updatedProfile] = await db
      .update(userProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updatedProfile;
  }

  // Skills operations
  async getUserSkills(userId: string): Promise<UserSkill[]> {
    return await db
      .select()
      .from(userSkills)
      .where(eq(userSkills.userId, userId))
      .orderBy(desc(userSkills.proficiency));
  }

  async addUserSkill(skill: InsertUserSkill): Promise<UserSkill> {
    const [newSkill] = await db
      .insert(userSkills)
      .values(skill)
      .onConflictDoUpdate({
        target: [userSkills.userId, userSkills.skillName],
        set: {
          proficiency: skill.proficiency,
          verified: skill.verified,
        },
      })
      .returning();
    return newSkill;
  }

  async deleteUserSkill(userId: string, skillName: string): Promise<void> {
    await db
      .delete(userSkills)
      .where(and(
        eq(userSkills.userId, userId),
        eq(userSkills.skillName, skillName)
      ));
  }

  // Career paths operations
  async getUserCareerPaths(userId: string): Promise<CareerPath[]> {
    return await db
      .select()
      .from(careerPaths)
      .where(eq(careerPaths.userId, userId))
      .orderBy(desc(careerPaths.startDate));
  }

  async addCareerPath(path: InsertCareerPath): Promise<CareerPath> {
    const [newPath] = await db
      .insert(careerPaths)
      .values(path)
      .returning();
    return newPath;
  }

  // Profile embeddings operations
  async getProfileEmbedding(userId: string): Promise<ProfileEmbedding | undefined> {
    const [embedding] = await db
      .select()
      .from(profileEmbeddings)
      .where(eq(profileEmbeddings.userId, userId));
    return embedding;
  }

  async upsertProfileEmbedding(userId: string, embedding: number[], profileData: any): Promise<ProfileEmbedding> {
    const [result] = await db
      .insert(profileEmbeddings)
      .values({
        userId,
        embedding,
        profileData,
      })
      .onConflictDoUpdate({
        target: profileEmbeddings.userId,
        set: {
          embedding,
          profileData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async findSimilarProfiles(embedding: number[], limit: number): Promise<ProfileEmbedding[]> {
    // Simple cosine similarity using array operations
    // In production, you'd want to use a proper vector database like Pinecone or pgvector
    const allEmbeddings = await db.select().from(profileEmbeddings);
    
    const similarities = allEmbeddings.map(profile => {
      const similarity = this.cosineSimilarity(embedding, profile.embedding || []);
      return { ...profile, similarity };
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Classes operations
  async getActiveClasses(): Promise<Class[]> {
    return await db
      .select()
      .from(classes)
      .where(eq(classes.isActive, true))
      .orderBy(desc(classes.startDate));
  }

  async getClassById(id: string): Promise<Class | undefined> {
    const [classItem] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, id));
    return classItem;
  }

  async searchClasses(query: string, category?: string, location?: string): Promise<Class[]> {
    let whereConditions = eq(classes.isActive, true);
    
    if (category) {
      const categoryCondition = and(whereConditions, eq(classes.category, category));
      if (categoryCondition) whereConditions = categoryCondition;
    }
    
    if (location && location !== "Online") {
      const locationCondition = and(whereConditions, eq(classes.location, location));
      if (locationCondition) whereConditions = locationCondition;
    } else if (location === "Online") {
      const onlineCondition = and(whereConditions, eq(classes.isOnline, true));
      if (onlineCondition) whereConditions = onlineCondition;
    }

    // Simple text search - in production you'd want full-text search
    return await db
      .select()
      .from(classes)
      .where(whereConditions)
      .orderBy(desc(classes.startDate));
  }

  async updateClassEnrollment(classId: string, increment: number): Promise<void> {
    await db
      .update(classes)
      .set({
        currentStudents: sql`${classes.currentStudents} + ${increment}`,
      })
      .where(eq(classes.id, classId));
  }

  // Enrollment operations
  async enrollUserInClass(enrollment: InsertEnrollment): Promise<Enrollment> {
    const [newEnrollment] = await db
      .insert(enrollments)
      .values(enrollment)
      .returning();
    
    // Update class enrollment count
    await this.updateClassEnrollment(enrollment.classId, 1);
    
    return newEnrollment;
  }

  async getUserEnrollments(userId: string): Promise<(Enrollment & { class: Class })[]> {
    return await db
      .select({
        id: enrollments.id,
        userId: enrollments.userId,
        classId: enrollments.classId,
        enrolledAt: enrollments.enrolledAt,
        completed: enrollments.completed,
        completedAt: enrollments.completedAt,
        class: classes,
      })
      .from(enrollments)
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .where(eq(enrollments.userId, userId))
      .orderBy(desc(enrollments.enrolledAt));
  }

  // Skill gap operations
  async getLatestSkillGap(userId: string): Promise<SkillGap | undefined> {
    const [skillGap] = await db
      .select()
      .from(skillGaps)
      .where(eq(skillGaps.userId, userId))
      .orderBy(desc(skillGaps.createdAt))
      .limit(1);
    return skillGap;
  }

  async createSkillGap(skillGap: InsertSkillGap): Promise<SkillGap> {
    const [newSkillGap] = await db
      .insert(skillGaps)
      .values(skillGap)
      .returning();
    return newSkillGap;
  }

  // AI guidance operations
  async createAIGuidance(guidance: InsertAIGuidance): Promise<AIGuidance> {
    const [newGuidance] = await db
      .insert(aiGuidance)
      .values(guidance)
      .returning();
    return newGuidance;
  }

  async getUserAIGuidance(userId: string, limit = 10): Promise<AIGuidance[]> {
    return await db
      .select()
      .from(aiGuidance)
      .where(eq(aiGuidance.userId, userId))
      .orderBy(desc(aiGuidance.createdAt))
      .limit(limit);
  }

  // Chat operations
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getUserChatHistory(userId: string, limit = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  // Achievement operations
  async getAchievements(): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.isActive, true))
      .orderBy(achievements.name);
  }

  async getUserAchievements(userId: string): Promise<(UserAchievement & { achievement: Achievement })[]> {
    const results = await db
      .select({
        id: userAchievements.id,
        userId: userAchievements.userId,
        achievementId: userAchievements.achievementId,
        earnedAt: userAchievements.earnedAt,
        progress: userAchievements.progress,
        achievement: achievements,
      })
      .from(userAchievements)
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.earnedAt));
    
    return results as (UserAchievement & { achievement: Achievement })[];
  }

  async awardAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement> {
    const [newAchievement] = await db
      .insert(userAchievements)
      .values(userAchievement)
      .returning();
    return newAchievement;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getUserNotifications(userId: string, status?: string): Promise<Notification[]> {
    const conditions = [eq(notifications.userId, userId)];
    
    if (status) {
      conditions.push(eq(notifications.status, status));
    }

    return await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        status: "read", 
        readAt: new Date() 
      })
      .where(eq(notifications.id, notificationId));
  }

  // Salary cache operations
  async getSalaryCacheEntry(role: string, location: string): Promise<SalaryCache | undefined> {
    const [cached] = await db
      .select()
      .from(salaryCache)
      .where(and(
        eq(salaryCache.role, role),
        eq(salaryCache.location, location)
      ))
      .orderBy(desc(salaryCache.cachedAt))
      .limit(1);
    return cached;
  }

  async cacheSalaryData(salaryData: InsertSalaryCache): Promise<SalaryCache> {
    const [cached] = await db
      .insert(salaryCache)
      .values(salaryData)
      .returning();
    return cached;
  }
}

export const storage = new DatabaseStorage();
