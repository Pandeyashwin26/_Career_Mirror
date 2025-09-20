import { db } from '../db';
import { eq, and, or, desc, asc, sql, inArray, ne } from 'drizzle-orm';
import {
  userConnections,
  mentorProfiles,
  mentorships,
  forumCategories,
  forumPosts,
  forumReplies,
  forumVotes,
  activityFeed,
  userInterests,
  studyGroups,
  studyGroupMembers,
  type UserConnection,
  type InsertUserConnection,
  type MentorProfile,
  type InsertMentorProfile,
  type Mentorship,
  type InsertMentorship,
  type ForumPost,
  type InsertForumPost,
  type ForumReply,
  type InsertForumReply,
  type StudyGroup,
  type InsertStudyGroup
} from '../../shared/community-schema';
import { users } from '@shared/schema';

export interface ConnectionRecommendation {
  userId: string;
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  matchScore: number;
  commonInterests: string[];
  mutualConnections: number;
  reason: string;
}

export interface MentorMatch {
  mentorId: string;
  mentor: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  profile: MentorProfile;
  matchScore: number;
  matchReasons: string[];
}

export class CommunityService {
  // User Connections
  async sendConnectionRequest(requesterId: string, recipientId: string, message?: string): Promise<UserConnection> {
    // Check if connection already exists
    const existingConnection = await db
      .select()
      .from(userConnections)
      .where(
        or(
          and(eq(userConnections.requesterId, requesterId), eq(userConnections.recipientId, recipientId)),
          and(eq(userConnections.requesterId, recipientId), eq(userConnections.recipientId, requesterId))
        )
      )
      .limit(1);

    if (existingConnection.length > 0) {
      throw new Error('Connection request already exists or users are already connected');
    }

    const [connection] = await db
      .insert(userConnections)
      .values({
        requesterId,
        recipientId,
        requestMessage: message,
        status: 'pending'
      })
      .returning();

    // Create activity feed entry
    await this.createActivityFeedEntry(recipientId, requesterId, 'connection_request', 'user', recipientId);

    return connection;
  }

  async respondToConnectionRequest(connectionId: string, userId: string, response: 'accepted' | 'declined'): Promise<UserConnection> {
    const [connection] = await db
      .update(userConnections)
      .set({ 
        status: response,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(userConnections.id, connectionId),
          eq(userConnections.recipientId, userId)
        )
      )
      .returning();

    if (!connection) {
      throw new Error('Connection request not found or unauthorized');
    }

    if (response === 'accepted') {
      // Create mutual activity feed entries
      await Promise.all([
        this.createActivityFeedEntry(connection.requesterId, userId, 'connection_accepted', 'user', connection.requesterId),
        this.createActivityFeedEntry(userId, connection.requesterId, 'connection_made', 'user', userId)
      ]);
    }

    return connection;
  }

  async getUserConnections(userId: string, status?: string): Promise<Array<UserConnection & { connectedUser: any }>> {
    let whereCondition = or(
      eq(userConnections.requesterId, userId),
      eq(userConnections.recipientId, userId)
    );

    if (status) {
      whereCondition = and(whereCondition, eq(userConnections.status, status));
    }

    const connections = await db
      .select({
        connection: userConnections,
        requester: users,
        recipient: users
      })
      .from(userConnections)
      .leftJoin(users, eq(userConnections.requesterId, users.id))
      .leftJoin(users, eq(userConnections.recipientId, users.id))
      .where(whereCondition)
      .orderBy(desc(userConnections.createdAt));

    return connections.map(({ connection, requester, recipient }) => ({
      ...connection,
      connectedUser: connection.requesterId === userId ? recipient : requester
    }));
  }

  async getConnectionRecommendations(userId: string, limit = 10): Promise<ConnectionRecommendation[]> {
    // Get user's interests and existing connections
    const [userInterestsData, existingConnections] = await Promise.all([
      this.getUserInterests(userId),
      this.getUserConnections(userId, 'accepted')
    ]);

    const existingConnectionIds = existingConnections.map(conn => 
      conn.requesterId === userId ? conn.recipientId : conn.requesterId
    );

    // Find users with similar interests (excluding existing connections)
    const potentialConnections = await db
      .select({
        userId: userInterests.userId,
        user: users,
        interests: sql`array_agg(${userInterests.interest})`.as('interests')
      })
      .from(userInterests)
      .innerJoin(users, eq(userInterests.userId, users.id))
      .where(
        and(
          ne(userInterests.userId, userId),
          existingConnectionIds.length > 0 ? 
            sql`${userInterests.userId} NOT IN ${existingConnectionIds}` : 
            sql`1 = 1`
        )
      )
      .groupBy(userInterests.userId, users.id)
      .limit(limit * 2); // Get more than needed for scoring

    const recommendations: ConnectionRecommendation[] = [];
    const userInterestSet = new Set(userInterestsData.map(i => i.interest.toLowerCase()));

    for (const potential of potentialConnections) {
      const potentialInterests = Array.isArray(potential.interests) ? potential.interests : [];
      const commonInterests = potentialInterests.filter(interest => 
        userInterestSet.has(interest.toLowerCase())
      );

      if (commonInterests.length > 0) {
        recommendations.push({
          userId: potential.userId,
          user: potential.user,
          matchScore: commonInterests.length * 10,
          commonInterests,
          mutualConnections: 0, // TODO: Calculate mutual connections
          reason: `You both are interested in ${commonInterests.slice(0, 2).join(', ')}`
        });
      }
    }

    return recommendations
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  // Mentorship System
  async createMentorProfile(userId: string, profileData: Omit<InsertMentorProfile, 'userId'>): Promise<MentorProfile> {
    const [profile] = await db
      .insert(mentorProfiles)
      .values({
        ...profileData,
        userId
      })
      .returning();

    await this.createActivityFeedEntry(userId, userId, 'became_mentor', 'mentor_profile', profile.id);

    return profile;
  }

  async findMentors(
    userSkills: string[], 
    targetRole?: string, 
    limit = 10
  ): Promise<MentorMatch[]> {
    const mentors = await db
      .select({
        profile: mentorProfiles,
        user: users
      })
      .from(mentorProfiles)
      .innerJoin(users, eq(mentorProfiles.userId, users.id))
      .where(
        and(
          eq(mentorProfiles.isActive, true),
          sql`${mentorProfiles.currentMentees} < ${mentorProfiles.maxMentees}`
        )
      )
      .orderBy(desc(mentorProfiles.rating));

    const matches: MentorMatch[] = [];

    for (const { profile, user } of mentors) {
      const matchScore = this.calculateMentorMatchScore(profile, userSkills, targetRole);
      
      if (matchScore > 0) {
        matches.push({
          mentorId: profile.userId,
          mentor: user,
          profile,
          matchScore,
          matchReasons: this.generateMentorMatchReasons(profile, userSkills, targetRole)
        });
      }
    }

    return matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  async requestMentorship(
    menteeId: string, 
    mentorId: string, 
    requestData: Partial<InsertMentorship>
  ): Promise<Mentorship> {
    // Check if mentor has capacity
    const mentorProfile = await db
      .select()
      .from(mentorProfiles)
      .where(eq(mentorProfiles.userId, mentorId))
      .limit(1);

    if (!mentorProfile.length) {
      throw new Error('Mentor profile not found');
    }

    const profile = mentorProfile[0];
    if (profile.currentMentees >= profile.maxMentees) {
      throw new Error('Mentor has reached maximum mentee capacity');
    }

    const [mentorship] = await db
      .insert(mentorships)
      .values({
        mentorId,
        menteeId,
        ...requestData,
        status: 'pending'
      })
      .returning();

    await this.createActivityFeedEntry(mentorId, menteeId, 'mentorship_request', 'mentorship', mentorship.id);

    return mentorship;
  }

  // Forum System
  async createForumPost(authorId: string, postData: Omit<InsertForumPost, 'authorId'>): Promise<ForumPost> {
    const [post] = await db
      .insert(forumPosts)
      .values({
        ...postData,
        authorId,
        slug: this.generateSlug(postData.title)
      })
      .returning();

    // Update category post count
    await db
      .update(forumCategories)
      .set({
        postCount: sql`${forumCategories.postCount} + 1`,
        lastPostAt: new Date(),
        lastPostId: post.id
      })
      .where(eq(forumCategories.id, post.categoryId));

    await this.createActivityFeedEntry(authorId, authorId, 'forum_post_created', 'forum_post', post.id);

    return post;
  }

  async replyToForumPost(authorId: string, postId: string, content: string, parentReplyId?: string): Promise<ForumReply> {
    const [reply] = await db
      .insert(forumReplies)
      .values({
        postId,
        authorId,
        content,
        parentReplyId
      })
      .returning();

    // Update post reply count and last reply info
    await db
      .update(forumPosts)
      .set({
        replyCount: sql`${forumPosts.replyCount} + 1`,
        lastReplyAt: new Date(),
        lastReplyId: reply.id,
        lastReplyUserId: authorId
      })
      .where(eq(forumPosts.id, postId));

    return reply;
  }

  async getForumPosts(categoryId?: string, limit = 20, offset = 0): Promise<Array<ForumPost & { author: any; lastReplyUser?: any }>> {
    let whereCondition = eq(forumPosts.isDeleted, false);
    
    if (categoryId) {
      whereCondition = and(whereCondition, eq(forumPosts.categoryId, categoryId));
    }

    return await db
      .select({
        post: forumPosts,
        author: users,
        lastReplyUser: users
      })
      .from(forumPosts)
      .innerJoin(users, eq(forumPosts.authorId, users.id))
      .leftJoin(users, eq(forumPosts.lastReplyUserId, users.id))
      .where(whereCondition)
      .orderBy(desc(forumPosts.isPinned), desc(forumPosts.lastReplyAt))
      .limit(limit)
      .offset(offset)
      .then(results => results.map(({ post, author, lastReplyUser }) => ({
        ...post,
        author,
        lastReplyUser
      })));
  }

  // Study Groups
  async createStudyGroup(creatorId: string, groupData: Omit<InsertStudyGroup, 'creatorId'>): Promise<StudyGroup> {
    const [group] = await db
      .insert(studyGroups)
      .values({
        ...groupData,
        creatorId
      })
      .returning();

    // Add creator as first member
    await db
      .insert(studyGroupMembers)
      .values({
        groupId: group.id,
        userId: creatorId,
        role: 'creator',
        status: 'active'
      });

    await this.createActivityFeedEntry(creatorId, creatorId, 'study_group_created', 'study_group', group.id);

    return group;
  }

  async joinStudyGroup(groupId: string, userId: string): Promise<void> {
    // Check if group has capacity
    const group = await db
      .select()
      .from(studyGroups)
      .where(eq(studyGroups.id, groupId))
      .limit(1);

    if (!group.length) {
      throw new Error('Study group not found');
    }

    if (group[0].currentMembers >= group[0].maxMembers) {
      throw new Error('Study group is full');
    }

    // Add member
    await db
      .insert(studyGroupMembers)
      .values({
        groupId,
        userId,
        role: 'member',
        status: 'active'
      });

    // Update member count
    await db
      .update(studyGroups)
      .set({
        currentMembers: sql`${studyGroups.currentMembers} + 1`
      })
      .where(eq(studyGroups.id, groupId));

    await this.createActivityFeedEntry(userId, userId, 'study_group_joined', 'study_group', groupId);
  }

  async searchStudyGroups(query?: string, subject?: string, level?: string): Promise<Array<StudyGroup & { creator: any }>> {
    let whereCondition = eq(studyGroups.isActive, true);

    if (subject) {
      whereCondition = and(whereCondition, eq(studyGroups.subject, subject));
    }

    if (level && level !== 'mixed') {
      whereCondition = and(whereCondition, eq(studyGroups.level, level));
    }

    return await db
      .select({
        group: studyGroups,
        creator: users
      })
      .from(studyGroups)
      .innerJoin(users, eq(studyGroups.creatorId, users.id))
      .where(whereCondition)
      .orderBy(desc(studyGroups.createdAt))
      .then(results => results.map(({ group, creator }) => ({
        ...group,
        creator
      })));
  }

  // Activity Feed
  async getUserActivityFeed(userId: string, limit = 50): Promise<Array<any>> {
    return await db
      .select({
        activity: activityFeed,
        actor: users
      })
      .from(activityFeed)
      .leftJoin(users, eq(activityFeed.actorId, users.id))
      .where(
        and(
          eq(activityFeed.userId, userId),
          eq(activityFeed.isVisible, true)
        )
      )
      .orderBy(desc(activityFeed.createdAt))
      .limit(limit)
      .then(results => results.map(({ activity, actor }) => ({
        ...activity,
        actor
      })));
  }

  async createActivityFeedEntry(
    userId: string,
    actorId: string,
    activityType: string,
    objectType: string,
    objectId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await db
      .insert(activityFeed)
      .values({
        userId,
        actorId,
        activityType,
        objectType,
        objectId,
        metadata
      });
  }

  // User Interests
  async getUserInterests(userId: string): Promise<Array<any>> {
    return await db
      .select()
      .from(userInterests)
      .where(eq(userInterests.userId, userId))
      .orderBy(desc(userInterests.level));
  }

  async addUserInterest(userId: string, category: string, interest: string, level = 5): Promise<void> {
    await db
      .insert(userInterests)
      .values({
        userId,
        category,
        interest,
        level,
        source: 'manual'
      })
      .onConflictDoUpdate({
        target: [userInterests.userId, userInterests.category, userInterests.interest],
        set: {
          level,
          updatedAt: new Date()
        }
      });
  }

  // Helper methods
  private calculateMentorMatchScore(profile: MentorProfile, userSkills: string[], targetRole?: string): number {
    let score = 0;

    // Expertise matching
    const mentorExpertise = Array.isArray(profile.expertise) ? profile.expertise : [];
    const userSkillsLower = userSkills.map(s => s.toLowerCase());

    mentorExpertise.forEach(expertise => {
      if (userSkillsLower.some(skill => skill.includes(expertise.toLowerCase()) || expertise.toLowerCase().includes(skill))) {
        score += 20;
      }
    });

    // Target role matching
    if (targetRole) {
      const mentorshipAreas = Array.isArray(profile.mentorshipAreas) ? profile.mentorshipAreas : [];
      mentorshipAreas.forEach(area => {
        if (area.toLowerCase().includes(targetRole.toLowerCase()) || targetRole.toLowerCase().includes(area.toLowerCase())) {
          score += 30;
        }
      });
    }

    // Rating boost
    if (profile.rating) {
      score += Math.round(profile.rating / 10); // Convert back from stored format
    }

    // Availability boost
    const availabilityBonus = { high: 10, medium: 5, low: 0 };
    score += availabilityBonus[profile.availability as keyof typeof availabilityBonus] || 0;

    return score;
  }

  private generateMentorMatchReasons(profile: MentorProfile, userSkills: string[], targetRole?: string): string[] {
    const reasons: string[] = [];

    if (profile.rating && profile.rating > 40) {
      reasons.push(`Highly rated mentor (${(profile.rating / 10).toFixed(1)}/5.0)`);
    }

    if (profile.yearsExperience && profile.yearsExperience > 5) {
      reasons.push(`${profile.yearsExperience} years of experience`);
    }

    const mentorExpertise = Array.isArray(profile.expertise) ? profile.expertise : [];
    const matchingSkills = mentorExpertise.filter(expertise =>
      userSkills.some(skill => skill.toLowerCase().includes(expertise.toLowerCase()) || expertise.toLowerCase().includes(skill))
    );

    if (matchingSkills.length > 0) {
      reasons.push(`Expertise in ${matchingSkills.slice(0, 2).join(', ')}`);
    }

    if (profile.availability === 'high') {
      reasons.push('High availability for mentoring');
    }

    return reasons;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 50);
  }
}

export const communityService = new CommunityService();