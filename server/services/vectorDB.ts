import { PineconeClient } from '@pinecone-database/pinecone';
import { openAIService } from './openai';

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
}

export interface ProfileVector {
  id: string;
  values: number[];
  metadata: {
    userId: string;
    profileData: any;
    lastUpdated: string;
    skills: string[];
    currentRole?: string;
    targetRole?: string;
    location?: string;
    experience?: number;
  };
}

export interface JobVector {
  id: string;
  values: number[];
  metadata: {
    jobTitle: string;
    company?: string;
    requiredSkills: string[];
    location?: string;
    salaryRange?: string;
    experienceLevel?: string;
    description: string;
    source: string;
  };
}

export interface SkillVector {
  id: string;
  values: number[];
  metadata: {
    skillName: string;
    category: string;
    description?: string;
    relatedSkills: string[];
    industryRelevance: string[];
  };
}

export class VectorDatabaseService {
  private pinecone: PineconeClient | null = null;
  private readonly INDEX_NAME: string;
  private readonly ENVIRONMENT: string;

  constructor() {
    this.INDEX_NAME = process.env.PINECONE_INDEX || 'career-mirror';
    this.ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || 'us-east1-gcp';
    
    this.initializePinecone();
  }

  private async initializePinecone(): Promise<void> {
    try {
      if (!process.env.PINECONE_API_KEY) {
        console.warn('Pinecone API key not found. Vector similarity search will use fallback implementation.');
        return;
      }

      this.pinecone = new PineconeClient();
      await this.pinecone.init({
        apiKey: process.env.PINECONE_API_KEY,
        environment: this.ENVIRONMENT,
      });

      console.log('Pinecone initialized successfully');
    } catch (error) {
      console.error('Error initializing Pinecone:', error);
      this.pinecone = null;
    }
  }

  /**
   * Create or update a profile vector
   */
  async upsertProfileVector(
    userId: string,
    profileData: any,
    embedding?: number[]
  ): Promise<void> {
    try {
      if (!this.pinecone) {
        console.log('Pinecone not available, skipping vector upsert');
        return;
      }

      // Generate embedding if not provided
      let vectorValues = embedding;
      if (!vectorValues) {
        vectorValues = await this.generateProfileEmbedding(profileData);
      }

      const profileVector: ProfileVector = {
        id: `profile_${userId}`,
        values: vectorValues,
        metadata: {
          userId,
          profileData,
          lastUpdated: new Date().toISOString(),
          skills: this.extractSkills(profileData),
          currentRole: profileData.currentRole,
          targetRole: profileData.targetRole,
          location: profileData.location,
          experience: profileData.experience
        }
      };

      const index = this.pinecone.Index(this.INDEX_NAME);
      await index.upsert({
        upsertRequest: {
          vectors: [profileVector],
          namespace: 'profiles'
        }
      });

      console.log(`Profile vector upserted for user ${userId}`);
    } catch (error) {
      console.error('Error upserting profile vector:', error);
      throw new Error('Failed to update profile vector');
    }
  }

  /**
   * Find similar profiles using vector similarity
   */
  async findSimilarProfiles(
    userId: string,
    limit = 10,
    minScore = 0.7
  ): Promise<VectorSearchResult[]> {
    try {
      if (!this.pinecone) {
        console.log('Pinecone not available, using fallback similarity search');
        return this.fallbackSimilaritySearch(userId, limit);
      }

      const index = this.pinecone.Index(this.INDEX_NAME);
      
      // Get the user's profile vector
      const userVector = await index.fetch({
        fetchRequest: {
          ids: [`profile_${userId}`],
          namespace: 'profiles'
        }
      });

      if (!userVector.vectors?.[`profile_${userId}`]) {
        throw new Error('User profile vector not found');
      }

      const userEmbedding = userVector.vectors[`profile_${userId}`].values;

      // Find similar profiles
      const queryResponse = await index.query({
        queryRequest: {
          vector: userEmbedding,
          topK: limit + 1, // +1 to exclude self
          includeMetadata: true,
          includeValues: false,
          namespace: 'profiles',
          filter: {
            userId: { $ne: userId } // Exclude self
          }
        }
      });

      return (queryResponse.matches || [])
        .filter(match => match.score >= minScore)
        .map(match => ({
          id: match.id || '',
          score: match.score || 0,
          metadata: match.metadata || {}
        }));

    } catch (error) {
      console.error('Error finding similar profiles:', error);
      return this.fallbackSimilaritySearch(userId, limit);
    }
  }

  /**
   * Upsert job vectors for career matching
   */
  async upsertJobVectors(jobs: Array<{
    id: string;
    title: string;
    company?: string;
    description: string;
    requiredSkills: string[];
    location?: string;
    salaryRange?: string;
    experienceLevel?: string;
    source: string;
  }>): Promise<void> {
    try {
      if (!this.pinecone) {
        console.log('Pinecone not available, skipping job vectors upsert');
        return;
      }

      const jobVectors: JobVector[] = [];

      for (const job of jobs) {
        const embedding = await this.generateJobEmbedding(job);
        
        jobVectors.push({
          id: `job_${job.id}`,
          values: embedding,
          metadata: {
            jobTitle: job.title,
            company: job.company,
            requiredSkills: job.requiredSkills,
            location: job.location,
            salaryRange: job.salaryRange,
            experienceLevel: job.experienceLevel,
            description: job.description,
            source: job.source
          }
        });
      }

      const index = this.pinecone.Index(this.INDEX_NAME);
      
      // Batch upsert (Pinecone supports up to 100 vectors per batch)
      const batchSize = 100;
      for (let i = 0; i < jobVectors.length; i += batchSize) {
        const batch = jobVectors.slice(i, i + batchSize);
        await index.upsert({
          upsertRequest: {
            vectors: batch,
            namespace: 'jobs'
          }
        });
      }

      console.log(`Upserted ${jobVectors.length} job vectors`);
    } catch (error) {
      console.error('Error upserting job vectors:', error);
      throw new Error('Failed to update job vectors');
    }
  }

  /**
   * Find matching jobs for a user profile
   */
  async findMatchingJobs(
    userId: string,
    limit = 20,
    filters?: {
      location?: string;
      experienceLevel?: string;
      salaryRange?: string;
    }
  ): Promise<VectorSearchResult[]> {
    try {
      if (!this.pinecone) {
        console.log('Pinecone not available, returning empty job matches');
        return [];
      }

      const index = this.pinecone.Index(this.INDEX_NAME);
      
      // Get the user's profile vector
      const userVector = await index.fetch({
        fetchRequest: {
          ids: [`profile_${userId}`],
          namespace: 'profiles'
        }
      });

      if (!userVector.vectors?.[`profile_${userId}`]) {
        throw new Error('User profile vector not found');
      }

      const userEmbedding = userVector.vectors[`profile_${userId}`].values;

      // Build filter criteria
      const filter: Record<string, any> = {};
      if (filters?.location) {
        filter.location = { $eq: filters.location };
      }
      if (filters?.experienceLevel) {
        filter.experienceLevel = { $eq: filters.experienceLevel };
      }
      if (filters?.salaryRange) {
        filter.salaryRange = { $eq: filters.salaryRange };
      }

      // Find matching jobs
      const queryResponse = await index.query({
        queryRequest: {
          vector: userEmbedding,
          topK: limit,
          includeMetadata: true,
          includeValues: false,
          namespace: 'jobs',
          filter: Object.keys(filter).length > 0 ? filter : undefined
        }
      });

      return (queryResponse.matches || [])
        .map(match => ({
          id: match.id || '',
          score: match.score || 0,
          metadata: match.metadata || {}
        }));

    } catch (error) {
      console.error('Error finding matching jobs:', error);
      return [];
    }
  }

  /**
   * Upsert skill vectors for skill recommendations
   */
  async upsertSkillVectors(skills: Array<{
    name: string;
    category: string;
    description?: string;
    relatedSkills: string[];
    industryRelevance: string[];
  }>): Promise<void> {
    try {
      if (!this.pinecone) {
        console.log('Pinecone not available, skipping skill vectors upsert');
        return;
      }

      const skillVectors: SkillVector[] = [];

      for (const skill of skills) {
        const embedding = await this.generateSkillEmbedding(skill);
        
        skillVectors.push({
          id: `skill_${skill.name.toLowerCase().replace(/\s+/g, '_')}`,
          values: embedding,
          metadata: {
            skillName: skill.name,
            category: skill.category,
            description: skill.description,
            relatedSkills: skill.relatedSkills,
            industryRelevance: skill.industryRelevance
          }
        });
      }

      const index = this.pinecone.Index(this.INDEX_NAME);
      
      // Batch upsert
      const batchSize = 100;
      for (let i = 0; i < skillVectors.length; i += batchSize) {
        const batch = skillVectors.slice(i, i + batchSize);
        await index.upsert({
          upsertRequest: {
            vectors: batch,
            namespace: 'skills'
          }
        });
      }

      console.log(`Upserted ${skillVectors.length} skill vectors`);
    } catch (error) {
      console.error('Error upserting skill vectors:', error);
      throw new Error('Failed to update skill vectors');
    }
  }

  /**
   * Find related skills based on user's current skills
   */
  async findRelatedSkills(
    userSkills: string[],
    limit = 10
  ): Promise<VectorSearchResult[]> {
    try {
      if (!this.pinecone || !userSkills.length) {
        return [];
      }

      // Generate embedding for user's skill combination
      const skillsText = userSkills.join(', ');
      const skillsEmbedding = await openAIService.generateProfileEmbedding({ skills: userSkills });

      const index = this.pinecone.Index(this.INDEX_NAME);

      // Find similar skills
      const queryResponse = await index.query({
        queryRequest: {
          vector: skillsEmbedding,
          topK: limit,
          includeMetadata: true,
          includeValues: false,
          namespace: 'skills',
          filter: {
            skillName: { $nin: userSkills } // Exclude skills user already has
          }
        }
      });

      return (queryResponse.matches || [])
        .map(match => ({
          id: match.id || '',
          score: match.score || 0,
          metadata: match.metadata || {}
        }));

    } catch (error) {
      console.error('Error finding related skills:', error);
      return [];
    }
  }

  /**
   * Delete a user's profile vector
   */
  async deleteProfileVector(userId: string): Promise<void> {
    try {
      if (!this.pinecone) {
        return;
      }

      const index = this.pinecone.Index(this.INDEX_NAME);
      await index.delete1({
        deleteRequest: {
          ids: [`profile_${userId}`],
          namespace: 'profiles'
        }
      });

      console.log(`Deleted profile vector for user ${userId}`);
    } catch (error) {
      console.error('Error deleting profile vector:', error);
    }
  }

  /**
   * Get vector database statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      if (!this.pinecone) {
        return null;
      }

      const index = this.pinecone.Index(this.INDEX_NAME);
      const stats = await index.describeIndexStats({
        describeIndexStatsRequest: {}
      });

      return stats;
    } catch (error) {
      console.error('Error getting index stats:', error);
      return null;
    }
  }

  // Private helper methods
  private async generateProfileEmbedding(profileData: any): Promise<number[]> {
    const profileText = this.serializeProfileData(profileData);
    return await openAIService.generateProfileEmbedding(profileText);
  }

  private async generateJobEmbedding(job: any): Promise<number[]> {
    const jobText = `${job.title} at ${job.company || 'Unknown Company'}. ${job.description}. Required skills: ${job.requiredSkills.join(', ')}.`;
    return await openAIService.generateProfileEmbedding({ jobDescription: jobText });
  }

  private async generateSkillEmbedding(skill: any): Promise<number[]> {
    const skillText = `${skill.name} - ${skill.category}. ${skill.description || ''}. Related to: ${skill.relatedSkills.join(', ')}.`;
    return await openAIService.generateProfileEmbedding({ skillDescription: skillText });
  }

  private serializeProfileData(profileData: any): string {
    const parts = [];
    
    if (profileData.name) parts.push(`Name: ${profileData.name}`);
    if (profileData.currentRole) parts.push(`Current Role: ${profileData.currentRole}`);
    if (profileData.targetRole) parts.push(`Target Role: ${profileData.targetRole}`);
    if (profileData.experience) parts.push(`Years of Experience: ${profileData.experience}`);
    if (profileData.education) parts.push(`Education: ${profileData.education}`);
    if (profileData.location) parts.push(`Location: ${profileData.location}`);
    
    if (profileData.skills && Array.isArray(profileData.skills)) {
      const skillNames = profileData.skills.map((s: any) => 
        typeof s === 'string' ? s : s.skillName || s.name
      ).filter(Boolean);
      if (skillNames.length > 0) {
        parts.push(`Skills: ${skillNames.join(', ')}`);
      }
    }
    
    if (profileData.careerPaths && Array.isArray(profileData.careerPaths)) {
      const roles = profileData.careerPaths.map((path: any) => path.role).filter(Boolean);
      if (roles.length > 0) {
        parts.push(`Career Path: ${roles.join(' → ')}`);
      }
    }
    
    return parts.join('\n');
  }

  private extractSkills(profileData: any): string[] {
    if (!profileData.skills) return [];
    
    return profileData.skills
      .map((skill: any) => typeof skill === 'string' ? skill : skill.skillName || skill.name)
      .filter(Boolean);
  }

  private async fallbackSimilaritySearch(userId: string, limit: number): Promise<VectorSearchResult[]> {
    console.log('Using fallback similarity search - this is less accurate than Pinecone');
    
    // This is a simplified fallback that would need to be implemented
    // using your existing database-based similarity search
    return [];
  }
}

export const vectorDB = new VectorDatabaseService();