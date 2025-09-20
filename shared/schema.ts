import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  uuid,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User profiles with career information
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  currentRole: varchar("current_role"),
  targetRole: varchar("target_role"),
  experience: integer("experience"), // years of experience
  education: text("education"),
  location: varchar("location"),
  salary: integer("salary"),
  resumeText: text("resume_text"),
  resumeUrl: varchar("resume_url"),
  profileCompletion: integer("profile_completion").default(0),
  // Lifestyle simulation preferences (1-10 scale)
  salaryImportance: integer("salary_importance").default(5),
  wlbImportance: integer("wlb_importance").default(5), // work-life balance
  stressTolerance: integer("stress_tolerance").default(5),
  remotePreference: integer("remote_preference").default(5),
  commutePreference: integer("commute_preference").default(5), // max commute tolerance
  travelWillingness: integer("travel_willingness").default(5),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User skills
export const userSkills = pgTable("user_skills", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  skillName: varchar("skill_name").notNull(),
  proficiency: integer("proficiency"), // 1-5 scale
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Career paths and trajectories
export const careerPaths = pgTable("career_paths", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull(),
  company: varchar("company"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isCurrent: boolean("is_current").default(false),
  salary: integer("salary"),
  skills: text("skills").array(), // Array of skills used in this role
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Profile embeddings for similarity search
export const profileEmbeddings = pgTable("profile_embeddings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  embedding: real("embedding").array(), // Vector embedding
  profileData: jsonb("profile_data"), // Serialized profile data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Available classes and workshops
export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  category: varchar("category").notNull(),
  instructor: varchar("instructor"),
  price: decimal("price", { precision: 10, scale: 2 }),
  duration: varchar("duration"),
  location: varchar("location"),
  isOnline: boolean("is_online").default(false),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  maxStudents: integer("max_students"),
  currentStudents: integer("current_students").default(0),
  skills: text("skills").array(), // Skills taught in this class
  difficulty: varchar("difficulty"), // beginner, intermediate, advanced
  imageUrl: varchar("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User enrollments
export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
});

// Skill gap analysis results
export const skillGaps = pgTable("skill_gaps", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetRole: varchar("target_role").notNull(),
  missingSkills: text("missing_skills").array(),
  improvementSkills: text("improvement_skills").array(),
  strongSkills: text("strong_skills").array(),
  recommendations: jsonb("recommendations"), // Course recommendations
  createdAt: timestamp("created_at").defaultNow(),
});

// AI guidance sessions
export const aiGuidance = pgTable("ai_guidance", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  guidanceType: varchar("guidance_type"), // career_advice, skill_recommendation, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  response: text("response"),
  isBot: boolean("is_bot").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Achievements for gamification
export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(), // unique identifier for each achievement
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon"), // icon class or emoji
  criteriaJson: jsonb("criteria_json"), // JSON criteria for earning the achievement
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User achievements tracking
export const userAchievements = pgTable("user_achievements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementId: uuid("achievement_id").notNull().references(() => achievements.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earned_at").defaultNow(),
  progress: integer("progress").default(100), // percentage for partial achievements
});

// Notifications system
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channel: varchar("channel").notNull(), // 'in-app', 'email', 'sms'
  type: varchar("type").notNull(), // 'goal_reminder', 'achievement', 'course_suggestion', etc.
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  payloadJson: jsonb("payload_json"), // additional data for the notification
  dueAt: timestamp("due_at"), // when to send the notification
  status: varchar("status").default("pending"), // 'pending', 'sent', 'failed', 'read'
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Salary data cache for lifestyle simulation
export const salaryCache = pgTable("salary_cache", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  role: varchar("role").notNull(),
  location: varchar("location").notNull(),
  source: varchar("source").notNull(), // 'bls', 'onet', 'glassdoor', etc.
  p25: integer("p25"), // 25th percentile salary
  median: integer("median"), // median salary
  p75: integer("p75"), // 75th percentile salary
  currency: varchar("currency").default("USD"),
  dataYear: integer("data_year"),
  cachedAt: timestamp("cached_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // cache expiration
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  skills: many(userSkills),
  careerPaths: many(careerPaths),
  embeddings: one(profileEmbeddings, {
    fields: [users.id],
    references: [profileEmbeddings.userId],
  }),
  enrollments: many(enrollments),
  skillGaps: many(skillGaps),
  aiGuidance: many(aiGuidance),
  chatMessages: many(chatMessages),
  achievements: many(userAchievements),
  notifications: many(notifications),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const userSkillsRelations = relations(userSkills, ({ one }) => ({
  user: one(users, {
    fields: [userSkills.userId],
    references: [users.id],
  }),
}));

export const careerPathsRelations = relations(careerPaths, ({ one }) => ({
  user: one(users, {
    fields: [careerPaths.userId],
    references: [users.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [enrollments.classId],
    references: [classes.id],
  }),
}));

export const classesRelations = relations(classes, ({ many }) => ({
  enrollments: many(enrollments),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSkillSchema = createInsertSchema(userSkills).omit({
  id: true,
  createdAt: true,
});

export const insertCareerPathSchema = createInsertSchema(careerPaths).omit({
  id: true,
  createdAt: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  enrolledAt: true,
});

export const insertSkillGapSchema = createInsertSchema(skillGaps).omit({
  id: true,
  createdAt: true,
});

export const insertAIGuidanceSchema = createInsertSchema(aiGuidance).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  earnedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertSalaryCacheSchema = createInsertSchema(salaryCache).omit({
  id: true,
  cachedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserSkill = typeof userSkills.$inferSelect;
export type InsertUserSkill = z.infer<typeof insertUserSkillSchema>;
export type CareerPath = typeof careerPaths.$inferSelect;
export type InsertCareerPath = z.infer<typeof insertCareerPathSchema>;
export type ProfileEmbedding = typeof profileEmbeddings.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type SkillGap = typeof skillGaps.$inferSelect;
export type InsertSkillGap = z.infer<typeof insertSkillGapSchema>;
export type AIGuidance = typeof aiGuidance.$inferSelect;
export type InsertAIGuidance = z.infer<typeof insertAIGuidanceSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type SalaryCache = typeof salaryCache.$inferSelect;
export type InsertSalaryCache = z.infer<typeof insertSalaryCacheSchema>;
