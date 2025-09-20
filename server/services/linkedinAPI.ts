import fetch from 'node-fetch';

export interface LinkedInCourse {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  url: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration: string;
  instructors: LinkedInInstructor[];
  skills: string[];
  releaseDate?: string;
  lastUpdated?: string;
  rating?: number;
  enrollmentCount?: number;
  thumbnailUrl?: string;
  price?: string;
  isFree?: boolean;
  language?: string;
  subtitles?: string[];
  prerequisites?: string[];
}

export interface LinkedInInstructor {
  id: string;
  name: string;
  title?: string;
  profileUrl?: string;
  imageUrl?: string;
  bio?: string;
}

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  summary?: string;
  location?: string;
  industry?: string;
  profileUrl: string;
  imageUrl?: string;
  skills: LinkedInSkill[];
  experiences: LinkedInExperience[];
  education: LinkedInEducation[];
}

export interface LinkedInSkill {
  id: string;
  name: string;
  endorsements?: number;
}

export interface LinkedInExperience {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  skills?: string[];
}

export interface LinkedInEducation {
  id: string;
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  description?: string;
}

export interface LinkedInLearningPath {
  id: string;
  title: string;
  description: string;
  courses: LinkedInCourse[];
  duration: string;
  level: string;
  skills: string[];
  thumbnailUrl?: string;
}

export class LinkedInAPIService {
  private readonly CLIENT_ID: string;
  private readonly CLIENT_SECRET: string;
  private readonly LEARNING_API_BASE = 'https://api.linkedin.com/v2/learning';
  private readonly PROFILE_API_BASE = 'https://api.linkedin.com/v2';
  private readonly REDIRECT_URI: string;

  constructor() {
    this.CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
    this.CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
    this.REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || '';

    if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
      console.warn('LinkedIn API credentials not found. LinkedIn features will be limited.');
    }
  }

  /**
   * Get OAuth authorization URL for LinkedIn
   */
  getAuthorizationUrl(state?: string): string {
    const scope = [
      'r_liteprofile',
      'r_emailaddress',
      'w_member_social',
      'r_learning_content'
    ].join('%20');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      state: state || '',
      scope: scope
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(authCode: string): Promise<string | null> {
    try {
      if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
        return null;
      }

      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: authCode,
          redirect_uri: this.REDIRECT_URI,
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET
        })
      });

      if (!response.ok) {
        console.error('LinkedIn token exchange failed:', response.status);
        return null;
      }

      const data = await response.json();
      return data.access_token || null;

    } catch (error) {
      console.error('Error exchanging LinkedIn auth code:', error);
      return null;
    }
  }

  /**
   * Search LinkedIn Learning courses by keyword
   */
  async searchCourses(query: string, accessToken: string, options?: {
    level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    duration?: string;
    skills?: string[];
    limit?: number;
  }): Promise<LinkedInCourse[]> {
    try {
      if (!this.CLIENT_ID || !accessToken) {
        return this.getFallbackCourses(query, options);
      }

      const params = new URLSearchParams({
        keywords: query,
        count: (options?.limit || 25).toString()
      });

      if (options?.level) {
        params.append('level', options.level);
      }

      const url = `${this.LEARNING_API_BASE}/courses?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      if (!response.ok) {
        console.error('LinkedIn Learning API error:', response.status);
        return this.getFallbackCourses(query, options);
      }

      const data = await response.json();
      return this.transformLinkedInCourses(data.elements || []);

    } catch (error) {
      console.error('Error searching LinkedIn courses:', error);
      return this.getFallbackCourses(query, options);
    }
  }

  /**
   * Get course recommendations based on user profile
   */
  async getRecommendedCourses(
    userSkills: string[], 
    targetRole: string, 
    accessToken: string
  ): Promise<LinkedInCourse[]> {
    try {
      if (!this.CLIENT_ID || !accessToken) {
        return this.getFallbackRecommendations(userSkills, targetRole);
      }

      // Use skills and target role to find relevant courses
      const searchQueries = [targetRole, ...userSkills.slice(0, 3)];
      const allCourses: LinkedInCourse[] = [];

      for (const query of searchQueries) {
        const courses = await this.searchCourses(query, accessToken, { limit: 5 });
        allCourses.push(...courses);
      }

      // Remove duplicates and sort by relevance
      const uniqueCourses = this.removeDuplicateCourses(allCourses);
      return this.rankCoursesByRelevance(uniqueCourses, userSkills, targetRole);

    } catch (error) {
      console.error('Error getting recommended courses:', error);
      return this.getFallbackRecommendations(userSkills, targetRole);
    }
  }

  /**
   * Get learning paths for a specific skill area
   */
  async getLearningPaths(skillArea: string, accessToken: string): Promise<LinkedInLearningPath[]> {
    try {
      if (!this.CLIENT_ID || !accessToken) {
        return this.getFallbackLearningPaths(skillArea);
      }

      const url = `${this.LEARNING_API_BASE}/learningPaths?keywords=${encodeURIComponent(skillArea)}&count=10`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      if (!response.ok) {
        console.error('LinkedIn Learning Paths API error:', response.status);
        return this.getFallbackLearningPaths(skillArea);
      }

      const data = await response.json();
      return this.transformLinkedInLearningPaths(data.elements || []);

    } catch (error) {
      console.error('Error fetching learning paths:', error);
      return this.getFallbackLearningPaths(skillArea);
    }
  }

  /**
   * Get user's LinkedIn profile information
   */
  async getUserProfile(accessToken: string): Promise<LinkedInProfile | null> {
    try {
      if (!this.CLIENT_ID || !accessToken) {
        return null;
      }

      const profileUrl = `${this.PROFILE_API_BASE}/people/~:(id,firstName,lastName,headline,summary,location,industry,profilePicture,positions,educations,skills)`;

      const response = await fetch(profileUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      if (!response.ok) {
        console.error('LinkedIn Profile API error:', response.status);
        return null;
      }

      const data = await response.json();
      return this.transformLinkedInProfile(data);

    } catch (error) {
      console.error('Error fetching LinkedIn profile:', error);
      return null;
    }
  }

  /**
   * Import LinkedIn profile data to enhance user profile
   */
  async importProfileData(accessToken: string): Promise<{
    profile: Partial<LinkedInProfile>;
    skills: string[];
    experience: LinkedInExperience[];
    education: LinkedInEducation[];
  } | null> {
    try {
      const profile = await this.getUserProfile(accessToken);
      if (!profile) return null;

      return {
        profile: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          headline: profile.headline,
          summary: profile.summary,
          location: profile.location,
          industry: profile.industry
        },
        skills: profile.skills.map(skill => skill.name),
        experience: profile.experiences,
        education: profile.education
      };

    } catch (error) {
      console.error('Error importing LinkedIn profile data:', error);
      return null;
    }
  }

  // Private transformation methods
  private transformLinkedInCourses(rawCourses: any[]): LinkedInCourse[] {
    return rawCourses.map(course => ({
      id: course.id || '',
      title: course.title || '',
      description: course.description || '',
      shortDescription: course.shortDescription,
      url: course.url || `https://www.linkedin.com/learning/${course.id}`,
      level: course.level || 'INTERMEDIATE',
      duration: course.duration || '1-2 hours',
      instructors: (course.instructors || []).map((instructor: any) => ({
        id: instructor.id || '',
        name: instructor.name || '',
        title: instructor.title,
        profileUrl: instructor.profileUrl,
        imageUrl: instructor.imageUrl,
        bio: instructor.bio
      })),
      skills: course.skills || [],
      releaseDate: course.releaseDate,
      lastUpdated: course.lastUpdated,
      rating: course.rating,
      enrollmentCount: course.enrollmentCount,
      thumbnailUrl: course.thumbnailUrl,
      price: 'LinkedIn Learning Subscription',
      isFree: false,
      language: course.language || 'English',
      subtitles: course.subtitles || [],
      prerequisites: course.prerequisites || []
    }));
  }

  private transformLinkedInProfile(rawProfile: any): LinkedInProfile {
    return {
      id: rawProfile.id || '',
      firstName: rawProfile.firstName?.localized?.en_US || '',
      lastName: rawProfile.lastName?.localized?.en_US || '',
      headline: rawProfile.headline?.localized?.en_US || '',
      summary: rawProfile.summary?.localized?.en_US || '',
      location: rawProfile.location?.name || '',
      industry: rawProfile.industry || '',
      profileUrl: `https://www.linkedin.com/in/${rawProfile.id}`,
      imageUrl: rawProfile.profilePicture?.displayImage || '',
      skills: (rawProfile.skills?.elements || []).map((skill: any) => ({
        id: skill.id || '',
        name: skill.name?.localized?.en_US || '',
        endorsements: skill.endorsements || 0
      })),
      experiences: (rawProfile.positions?.elements || []).map((position: any) => ({
        id: position.id || '',
        title: position.title?.localized?.en_US || '',
        company: position.companyName?.localized?.en_US || '',
        location: position.location?.name || '',
        startDate: this.formatLinkedInDate(position.timePeriod?.startDate),
        endDate: this.formatLinkedInDate(position.timePeriod?.endDate),
        isCurrent: !position.timePeriod?.endDate,
        description: position.description?.localized?.en_US || '',
        skills: position.skills || []
      })),
      education: (rawProfile.educations?.elements || []).map((edu: any) => ({
        id: edu.id || '',
        institution: edu.schoolName?.localized?.en_US || '',
        degree: edu.degreeName?.localized?.en_US || '',
        fieldOfStudy: edu.fieldOfStudy?.localized?.en_US || '',
        startDate: this.formatLinkedInDate(edu.timePeriod?.startDate),
        endDate: this.formatLinkedInDate(edu.timePeriod?.endDate),
        grade: edu.grade,
        description: edu.description?.localized?.en_US || ''
      }))
    };
  }

  private transformLinkedInLearningPaths(rawPaths: any[]): LinkedInLearningPath[] {
    return rawPaths.map(path => ({
      id: path.id || '',
      title: path.title || '',
      description: path.description || '',
      courses: this.transformLinkedInCourses(path.courses || []),
      duration: path.duration || '10-15 hours',
      level: path.level || 'INTERMEDIATE',
      skills: path.skills || [],
      thumbnailUrl: path.thumbnailUrl
    }));
  }

  private formatLinkedInDate(dateObj: any): string | undefined {
    if (!dateObj) return undefined;
    
    const year = dateObj.year || new Date().getFullYear();
    const month = dateObj.month || 1;
    const day = dateObj.day || 1;
    
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  // Fallback methods
  private getFallbackCourses(query: string, options?: any): LinkedInCourse[] {
    const fallbackCourses: LinkedInCourse[] = [
      {
        id: 'linkedin-fallback-1',
        title: `${query} Fundamentals`,
        description: `Master the fundamentals of ${query} with this comprehensive course.`,
        url: 'https://www.linkedin.com/learning/',
        level: 'BEGINNER',
        duration: '2-3 hours',
        instructors: [{ id: '1', name: 'Expert Instructor' }],
        skills: [query, 'Professional Development'],
        price: 'LinkedIn Learning Subscription',
        isFree: false,
        language: 'English'
      },
      {
        id: 'linkedin-fallback-2',
        title: `Advanced ${query} Techniques`,
        description: `Take your ${query} skills to the next level with advanced techniques.`,
        url: 'https://www.linkedin.com/learning/',
        level: 'ADVANCED',
        duration: '3-4 hours',
        instructors: [{ id: '2', name: 'Senior Expert' }],
        skills: [query, 'Advanced Techniques'],
        price: 'LinkedIn Learning Subscription',
        isFree: false,
        language: 'English'
      }
    ];

    return options?.limit ? fallbackCourses.slice(0, options.limit) : fallbackCourses;
  }

  private getFallbackRecommendations(userSkills: string[], targetRole: string): LinkedInCourse[] {
    return this.getFallbackCourses(targetRole, { limit: 5 });
  }

  private getFallbackLearningPaths(skillArea: string): LinkedInLearningPath[] {
    return [{
      id: 'path-fallback-1',
      title: `${skillArea} Learning Path`,
      description: `Comprehensive learning path for mastering ${skillArea}`,
      courses: this.getFallbackCourses(skillArea, { limit: 3 }),
      duration: '8-12 hours',
      level: 'INTERMEDIATE',
      skills: [skillArea, 'Professional Development']
    }];
  }

  private removeDuplicateCourses(courses: LinkedInCourse[]): LinkedInCourse[] {
    const seen = new Set<string>();
    return courses.filter(course => {
      if (seen.has(course.id)) return false;
      seen.add(course.id);
      return true;
    });
  }

  private rankCoursesByRelevance(courses: LinkedInCourse[], userSkills: string[], targetRole: string): LinkedInCourse[] {
    return courses.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, userSkills, targetRole);
      const bScore = this.calculateRelevanceScore(b, userSkills, targetRole);
      return bScore - aScore;
    }).slice(0, 10);
  }

  private calculateRelevanceScore(course: LinkedInCourse, userSkills: string[], targetRole: string): number {
    let score = 0;

    // Title relevance
    const titleLower = course.title.toLowerCase();
    const targetRoleLower = targetRole.toLowerCase();
    
    if (titleLower.includes(targetRoleLower)) score += 10;
    
    // Skill matching
    const courseSkillsLower = course.skills.map(s => s.toLowerCase());
    const userSkillsLower = userSkills.map(s => s.toLowerCase());
    
    courseSkillsLower.forEach(courseSkill => {
      userSkillsLower.forEach(userSkill => {
        if (courseSkill.includes(userSkill) || userSkill.includes(courseSkill)) {
          score += 5;
        }
      });
    });

    // Level appropriateness (prefer intermediate for most users)
    if (course.level === 'INTERMEDIATE') score += 2;

    return score;
  }
}

export const linkedinAPIService = new LinkedInAPIService();