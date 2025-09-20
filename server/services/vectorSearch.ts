import { storage } from "../storage";
import { openAIService } from "./openai";
import type { ProfileEmbedding } from "@shared/schema";

export interface SimilarProfile {
  userId: string;
  profileData: any;
  similarity: number;
  careerPath?: string;
  currentRole?: string;
  skills?: string[];
}

export class VectorSearchService {
  // Find career doppelgangers based on profile similarity
  async findCareerDoppelgangers(userId: string, limit = 10): Promise<SimilarProfile[]> {
    try {
      // Get user's profile embedding
      const userEmbedding = await storage.getProfileEmbedding(userId);
      
      if (!userEmbedding || !userEmbedding.embedding) {
        throw new Error("User profile embedding not found. Please update your profile first.");
      }

      // Find similar profiles
      const similarProfiles = await storage.findSimilarProfiles(
        userEmbedding.embedding,
        limit + 1 // +1 to exclude self
      );

      // Filter out the user's own profile and format results
      return similarProfiles
        .filter(profile => profile.userId !== userId)
        .slice(0, limit)
        .map(profile => ({
          userId: profile.userId,
          profileData: profile.profileData,
          similarity: (profile as any).similarity || 0,
          careerPath: this.generateCareerPathSummary((profile.profileData as any)?.careerPaths || []),
          currentRole: (profile.profileData as any)?.currentRole,
          skills: (profile.profileData as any)?.skills?.map((s: any) => s.skillName) || [],
        }));
    } catch (error) {
      console.error("Error finding career doppelgangers:", error);
      throw new Error("Failed to find career doppelgangers. Please try again.");
    }
  }

  // Update or create profile embedding
  async updateProfileEmbedding(userId: string): Promise<void> {
    try {
      // Get user's complete profile data
      const user = await storage.getUser(userId);
      const profile = await storage.getUserProfile(userId);
      const skills = await storage.getUserSkills(userId);
      const careerPaths = await storage.getUserCareerPaths(userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Combine all profile data
      const profileData = {
        userId,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        currentRole: profile?.currentRole,
        targetRole: profile?.targetRole,
        experience: profile?.experience,
        education: profile?.education,
        location: profile?.location,
        skills: skills,
        careerPaths: careerPaths,
      };

      // Generate embedding
      const embedding = await openAIService.generateProfileEmbedding(profileData);

      // Store embedding
      await storage.upsertProfileEmbedding(userId, embedding, profileData);
    } catch (error) {
      console.error("Error updating profile embedding:", error);
      throw new Error("Failed to update profile embedding. Please try again.");
    }
  }

  // Search for relevant classes based on user profile
  async findRelevantClasses(userId: string, query?: string): Promise<any[]> {
    try {
      // Get user's skills and target role
      const profile = await storage.getUserProfile(userId);
      const skills = await storage.getUserSkills(userId);
      const skillGap = await storage.getLatestSkillGap(userId);

      // Get all active classes
      let classes = await storage.getActiveClasses();

      // Filter based on user's needs
      if (skillGap) {
        const neededSkills = [
          ...(skillGap.missingSkills || []),
          ...(skillGap.improvementSkills || [])
        ].map(skill => skill.toLowerCase());

        classes = classes.filter(cls => {
          const classSkills = (cls.skills || []).map(skill => skill.toLowerCase());
          return classSkills.some(skill => 
            neededSkills.some(needed => skill.includes(needed) || needed.includes(skill))
          );
        });
      }

      // If query provided, filter by title/description
      if (query) {
        const queryLower = query.toLowerCase();
        classes = classes.filter(cls =>
          cls.title.toLowerCase().includes(queryLower) ||
          cls.description?.toLowerCase().includes(queryLower) ||
          (cls.skills || []).some(skill => skill.toLowerCase().includes(queryLower))
        );
      }

      // Add relevance scoring
      return classes.map(cls => ({
        ...cls,
        relevanceScore: this.calculateClassRelevance(cls, skills, skillGap),
        spotsLeft: Math.max(0, (cls.maxStudents || 0) - (cls.currentStudents || 0)),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error("Error finding relevant classes:", error);
      throw new Error("Failed to find relevant classes. Please try again.");
    }
  }

  private generateCareerPathSummary(careerPaths: any[]): string {
    if (!careerPaths || careerPaths.length === 0) return "";

    const sortedPaths = careerPaths.sort((a, b) => 
      new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime()
    );

    return sortedPaths
      .map(path => path.role)
      .join(" → ");
  }

  private calculateClassRelevance(
    classItem: any,
    userSkills: any[],
    skillGap: any
  ): number {
    let score = 0;

    const classSkills = (classItem.skills || []).map((s: string) => s.toLowerCase());
    const userSkillNames = userSkills.map(s => s.skillName.toLowerCase());
    const missingSkills = (skillGap?.missingSkills || []).map((s: string) => s.toLowerCase());
    const improvementSkills = (skillGap?.improvementSkills || []).map((s: string) => s.toLowerCase());

    // High score for classes that teach missing skills
    classSkills.forEach((skill: string) => {
      if (missingSkills.some((missing: string) => skill.includes(missing) || missing.includes(skill))) {
        score += 10;
      }
      if (improvementSkills.some((improvement: string) => skill.includes(improvement) || improvement.includes(skill))) {
        score += 5;
      }
    });

    // Moderate score for classes related to existing skills (for advancement)
    classSkills.forEach((skill: string) => {
      if (userSkillNames.some((userSkill: string) => skill.includes(userSkill) || userSkill.includes(skill))) {
        score += 2;
      }
    });

    // Boost for classes with available spots
    const spotsLeft = Math.max(0, (classItem.maxStudents || 0) - (classItem.currentStudents || 0));
    if (spotsLeft > 0) {
      score += Math.min(spotsLeft / 5, 3); // Up to 3 bonus points for availability
    }

    return score;
  }
}

export const vectorSearchService = new VectorSearchService();
