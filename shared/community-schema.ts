import { pgTable, text, timestamp, boolean, integer, uuid, jsonb, index, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./schema";

// User connections and networking
export const userConnections = pgTable("user_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  requesterId: text("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: text("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "accepted", "declined", "blocked"] }).notNull().default("pending"),
  requestMessage: text("request_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  requesterIdx: index("connections_requester_idx").on(table.requesterId),
  recipientIdx: index("connections_recipient_idx").on(table.recipientId),
  statusIdx: index("connections_status_idx").on(table.status),
}));

// Mentorship matching system
export const mentorProfiles = pgTable("mentor_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  expertise: jsonb("expertise").$type<string[]>().notNull().default([]),
  yearsExperience: integer("years_experience"),
  mentorshipAreas: jsonb("mentorship_areas").$type<string[]>().notNull().default([]),
  availability: text("availability", { enum: ["low", "medium", "high"] }).notNull().default("medium"),
  maxMentees: integer("max_mentees").notNull().default(3),
  currentMentees: integer("current_mentees").notNull().default(0),
  bio: text("bio"),
  preferredCommunicationStyle: text("preferred_communication_style"),
  timeZone: text("time_zone"),
  languages: jsonb("languages").$type<string[]>().notNull().default(["English"]),
  rating: integer("rating").default(0), // Average rating * 10 to avoid decimals
  totalReviews: integer("total_reviews").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("mentor_profiles_user_idx").on(table.userId),
  activeIdx: index("mentor_profiles_active_idx").on(table.isActive),
  expertiseIdx: index("mentor_profiles_expertise_idx").using("gin", table.expertise),
}));

// Mentorship relationships
export const mentorships = pgTable("mentorships", {
  id: uuid("id").defaultRandom().primaryKey(),
  mentorId: text("mentor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  menteeId: text("mentee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "active", "completed", "cancelled"] }).notNull().default("pending"),
  requestMessage: text("request_message"),
  goals: text("goals"),
  duration: text("duration", { enum: ["1_month", "3_months", "6_months", "12_months", "ongoing"] }),
  meetingFrequency: text("meeting_frequency", { enum: ["weekly", "biweekly", "monthly", "as_needed"] }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  completionNotes: text("completion_notes"),
  mentorRating: integer("mentor_rating"), // Rating given by mentee (1-5 * 10)
  menteeRating: integer("mentee_rating"), // Rating given by mentor (1-5 * 10)
  mentorFeedback: text("mentor_feedback"),
  menteeFeedback: text("mentee_feedback"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  mentorIdx: index("mentorships_mentor_idx").on(table.mentorId),
  menteeIdx: index("mentorships_mentee_idx").on(table.menteeId),
  statusIdx: index("mentorships_status_idx").on(table.status),
}));

// Career discussion forums
export const forumCategories = pgTable("forum_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  color: text("color").notNull().default("#3b82f6"),
  icon: text("icon").notNull().default("fas fa-comments"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  moderatorIds: jsonb("moderator_ids").$type<string[]>().notNull().default([]),
  postCount: integer("post_count").notNull().default(0),
  lastPostAt: timestamp("last_post_at"),
  lastPostId: uuid("last_post_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  activeIdx: index("forum_categories_active_idx").on(table.isActive),
  sortIdx: index("forum_categories_sort_idx").on(table.sortOrder),
}));

// Forum posts
export const forumPosts = pgTable("forum_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").notNull().references(() => forumCategories.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  slug: text("slug").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  viewCount: integer("view_count").notNull().default(0),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  replyCount: integer("reply_count").notNull().default(0),
  lastReplyAt: timestamp("last_reply_at"),
  lastReplyId: uuid("last_reply_id"),
  lastReplyUserId: text("last_reply_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  categoryIdx: index("forum_posts_category_idx").on(table.categoryId),
  authorIdx: index("forum_posts_author_idx").on(table.authorId),
  pinnedIdx: index("forum_posts_pinned_idx").on(table.isPinned),
  deletedIdx: index("forum_posts_deleted_idx").on(table.isDeleted),
  lastReplyIdx: index("forum_posts_last_reply_idx").on(table.lastReplyAt),
  tagsIdx: index("forum_posts_tags_idx").using("gin", table.tags),
}));

// Forum replies
export const forumReplies = pgTable("forum_replies", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => forumPosts.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentReplyId: uuid("parent_reply_id"), // For nested replies
  isDeleted: boolean("is_deleted").notNull().default(false),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  postIdx: index("forum_replies_post_idx").on(table.postId),
  authorIdx: index("forum_replies_author_idx").on(table.authorId),
  parentIdx: index("forum_replies_parent_idx").on(table.parentReplyId),
  deletedIdx: index("forum_replies_deleted_idx").on(table.isDeleted),
}));

// Post and reply votes
export const forumVotes = pgTable("forum_votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("post_id").references(() => forumPosts.id, { onDelete: "cascade" }),
  replyId: uuid("reply_id").references(() => forumReplies.id, { onDelete: "cascade" }),
  voteType: text("vote_type", { enum: ["up", "down"] }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userPostIdx: index("forum_votes_user_post_idx").on(table.userId, table.postId),
  userReplyIdx: index("forum_votes_user_reply_idx").on(table.userId, table.replyId),
}));

// User activity feed
export const activityFeed = pgTable("activity_feed", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => users.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull(), // e.g., "course_completed", "skill_added", "connection_made"
  objectType: text("object_type").notNull(), // e.g., "course", "skill", "user"
  objectId: text("object_id"), // ID of the object being referenced
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("activity_feed_user_idx").on(table.userId),
  actorIdx: index("activity_feed_actor_idx").on(table.actorId),
  typeIdx: index("activity_feed_type_idx").on(table.activityType),
  createdIdx: index("activity_feed_created_idx").on(table.createdAt),
  visibleIdx: index("activity_feed_visible_idx").on(table.isVisible),
}));

// User interests for better matching
export const userInterests = pgTable("user_interests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // e.g., "industry", "skill", "role", "hobby"
  interest: text("interest").notNull(),
  level: integer("level").notNull().default(5), // 1-10 scale of interest level
  source: text("source").notNull().default("manual"), // "manual", "imported", "inferred"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("user_interests_user_idx").on(table.userId),
  categoryIdx: index("user_interests_category_idx").on(table.category),
  interestIdx: index("user_interests_interest_idx").on(table.interest),
  levelIdx: index("user_interests_level_idx").on(table.level),
}));

// Study groups and collaborative learning
export const studyGroups = pgTable("study_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  creatorId: text("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  subject: text("subject").notNull(), // Main subject/skill being studied
  level: text("level", { enum: ["beginner", "intermediate", "advanced", "mixed"] }).notNull().default("mixed"),
  meetingType: text("meeting_type", { enum: ["online", "in_person", "hybrid"] }).notNull().default("online"),
  schedule: jsonb("schedule").$type<{
    frequency: string; // weekly, biweekly, monthly
    day: string; // monday, tuesday, etc.
    time: string; // HH:MM format
    timezone: string;
  }>(),
  maxMembers: integer("max_members").notNull().default(10),
  currentMembers: integer("current_members").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  isPrivate: boolean("is_private").notNull().default(false),
  location: text("location"), // For in-person or hybrid groups
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  resources: jsonb("resources").$type<Array<{
    title: string;
    url: string;
    type: string;
  }>>().notNull().default([]),
  rules: text("rules"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  creatorIdx: index("study_groups_creator_idx").on(table.creatorId),
  subjectIdx: index("study_groups_subject_idx").on(table.subject),
  activeIdx: index("study_groups_active_idx").on(table.isActive),
  privateIdx: index("study_groups_private_idx").on(table.isPrivate),
  tagsIdx: index("study_groups_tags_idx").using("gin", table.tags),
}));

// Study group memberships
export const studyGroupMembers = pgTable("study_group_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").notNull().references(() => studyGroups.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["creator", "moderator", "member"] }).notNull().default("member"),
  status: text("status", { enum: ["pending", "active", "inactive", "banned"] }).notNull().default("active"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  lastActive: timestamp("last_active"),
}, (table) => ({
  groupIdx: index("study_group_members_group_idx").on(table.groupId),
  userIdx: index("study_group_members_user_idx").on(table.userId),
  statusIdx: index("study_group_members_status_idx").on(table.status),
  // Unique constraint to prevent duplicate memberships
  uniqueMembership: primaryKey({ columns: [table.groupId, table.userId] }),
}));

// Types for TypeScript
export type UserConnection = typeof userConnections.$inferSelect;
export type InsertUserConnection = typeof userConnections.$inferInsert;

export type MentorProfile = typeof mentorProfiles.$inferSelect;
export type InsertMentorProfile = typeof mentorProfiles.$inferInsert;

export type Mentorship = typeof mentorships.$inferSelect;
export type InsertMentorship = typeof mentorships.$inferInsert;

export type ForumCategory = typeof forumCategories.$inferSelect;
export type InsertForumCategory = typeof forumCategories.$inferInsert;

export type ForumPost = typeof forumPosts.$inferSelect;
export type InsertForumPost = typeof forumPosts.$inferInsert;

export type ForumReply = typeof forumReplies.$inferSelect;
export type InsertForumReply = typeof forumReplies.$inferInsert;

export type ForumVote = typeof forumVotes.$inferSelect;
export type InsertForumVote = typeof forumVotes.$inferInsert;

export type ActivityFeedItem = typeof activityFeed.$inferSelect;
export type InsertActivityFeedItem = typeof activityFeed.$inferInsert;

export type UserInterest = typeof userInterests.$inferSelect;
export type InsertUserInterest = typeof userInterests.$inferInsert;

export type StudyGroup = typeof studyGroups.$inferSelect;
export type InsertStudyGroup = typeof studyGroups.$inferInsert;

export type StudyGroupMember = typeof studyGroupMembers.$inferSelect;
export type InsertStudyGroupMember = typeof studyGroupMembers.$inferInsert;