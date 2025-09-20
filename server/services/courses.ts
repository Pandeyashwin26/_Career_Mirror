import { courseAggregatorService } from './courseAggregator.js';

export interface CourseProvider {
  id: string;
  name: string;
  url: string;
  logo?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  provider: CourseProvider;
  url: string;
  price: string;
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
  rating: number;
  enrollments: number;
  skills: string[];
  imageUrl?: string;
  isFree: boolean;
}

export class CourseService {
  private providers: Record<string, CourseProvider> = {
    coursera: {
      id: "coursera",
      name: "Coursera",
      url: "https://coursera.org",
      logo: "🎓"
    },
    udemy: {
      id: "udemy", 
      name: "Udemy",
      url: "https://udemy.com",
      logo: "📚"
    },
    linkedin: {
      id: "linkedin",
      name: "LinkedIn Learning", 
      url: "https://linkedin.com/learning",
      logo: "💼"
    },
    youtube: {
      id: "youtube",
      name: "YouTube",
      url: "https://youtube.com",
      logo: "📺"
    },
    codecademy: {
      id: "codecademy",
      name: "Codecademy",
      url: "https://codecademy.com",
      logo: "💻"
    }
  };

  async searchCourses(skills: string[], providers: string[] = []): Promise<Course[]> {
    try {
      console.log('Searching courses with live APIs for skills:', skills);
      
      // Use the new course aggregator service for real course data
      const realCourses = await courseAggregatorService.searchRealCourses(skills, providers);
      
      // If we get results from live APIs, use them
      if (realCourses.length > 0) {
        console.log('Found', realCourses.length, 'courses from live sources');
        return realCourses.slice(0, 20); // Limit to 20 courses
      }
      
      // Fallback to mock data if APIs are unavailable
      console.log('Falling back to mock course data');
      const courses: Course[] = [];
      
      for (const skill of skills.slice(0, 3)) { // Limit to first 3 skills
        const skillCourses = this.generateCoursesForSkill(skill, providers);
        courses.push(...skillCourses);
      }

      // Remove duplicates and sort by relevance
      const uniqueCourses = this.removeDuplicates(courses);
      return this.sortByRelevance(uniqueCourses, skills);
    } catch (error) {
      console.error("Error searching courses:", error);
      return [];
    }
  }

  async getRecommendedCourses(missingSkills: string[], improvementSkills: string[]): Promise<Course[]> {
    try {
      const allSkills = [...missingSkills, ...improvementSkills];
      const courses = await this.searchCourses(allSkills);
      
      // Prioritize courses for missing skills
      return courses.sort((a, b) => {
        const aHasMissingSkill = a.skills.some(skill => 
          missingSkills.some(missing => 
            missing.toLowerCase().includes(skill.toLowerCase()) || 
            skill.toLowerCase().includes(missing.toLowerCase())
          )
        );
        const bHasMissingSkill = b.skills.some(skill => 
          missingSkills.some(missing => 
            missing.toLowerCase().includes(skill.toLowerCase()) || 
            skill.toLowerCase().includes(missing.toLowerCase())
          )
        );
        
        if (aHasMissingSkill && !bHasMissingSkill) return -1;
        if (!aHasMissingSkill && bHasMissingSkill) return 1;
        return b.rating - a.rating;
      });
    } catch (error) {
      console.error("Error getting recommended courses:", error);
      return [];
    }
  }

  private generateCoursesForSkill(skill: string, preferredProviders: string[]): Course[] {
    const skillLower = skill.toLowerCase();
    const courses: Course[] = [];
    const providers = preferredProviders.length > 0 
      ? preferredProviders.map(p => this.providers[p]).filter(Boolean)
      : Object.values(this.providers);

    // Generate courses for each provider
    providers.forEach(provider => {
      const coursesForProvider = this.getCoursesForSkillAndProvider(skill, provider);
      courses.push(...coursesForProvider);
    });

    return courses;
  }

  private getCoursesForSkillAndProvider(skill: string, provider: CourseProvider): Course[] {
    const skillLower = skill.toLowerCase();
    const courses: Course[] = [];

    // Programming skills
    if (skillLower.includes("javascript") || skillLower.includes("js")) {
      courses.push({
        id: `${provider.id}-js-${Date.now()}`,
        title: `Complete ${skill} Masterclass`,
        description: `Learn ${skill} from beginner to advanced with hands-on projects`,
        provider,
        url: `${provider.url}/course/${skillLower.replace(/\s+/g, "-")}`,
        price: provider.id === "youtube" ? "Free" : "$49.99",
        duration: "40 hours",
        level: "intermediate",
        rating: 4.5 + Math.random() * 0.5,
        enrollments: Math.floor(Math.random() * 50000) + 10000,
        skills: [skill, "Web Development", "Programming"],
        isFree: provider.id === "youtube",
      });
    }

    if (skillLower.includes("python")) {
      courses.push({
        id: `${provider.id}-python-${Date.now()}`,
        title: `${skill} for Data Science and Machine Learning`,
        description: `Master ${skill} programming with real-world applications`,
        provider,
        url: `${provider.url}/course/${skillLower.replace(/\s+/g, "-")}`,
        price: provider.id === "youtube" ? "Free" : "$59.99",
        duration: "35 hours",
        level: "beginner",
        rating: 4.6 + Math.random() * 0.4,
        enrollments: Math.floor(Math.random() * 100000) + 20000,
        skills: [skill, "Data Science", "Machine Learning"],
        isFree: provider.id === "youtube",
      });
    }

    if (skillLower.includes("react")) {
      courses.push({
        id: `${provider.id}-react-${Date.now()}`,
        title: `Modern ${skill} Development`,
        description: `Build dynamic web applications with ${skill} and modern tools`,
        provider,
        url: `${provider.url}/course/${skillLower.replace(/\s+/g, "-")}`,
        price: provider.id === "youtube" ? "Free" : "$54.99",
        duration: "30 hours",
        level: "intermediate",
        rating: 4.7 + Math.random() * 0.3,
        enrollments: Math.floor(Math.random() * 75000) + 15000,
        skills: [skill, "JavaScript", "Frontend Development"],
        isFree: provider.id === "youtube",
      });
    }

    // Data Science skills
    if (skillLower.includes("machine learning") || skillLower.includes("ml")) {
      courses.push({
        id: `${provider.id}-ml-${Date.now()}`,
        title: `${skill} A-Z: Hands-On Projects`,
        description: `Complete guide to ${skill} with practical implementations`,
        provider,
        url: `${provider.url}/course/${skillLower.replace(/\s+/g, "-")}`,
        price: provider.id === "youtube" ? "Free" : "$69.99",
        duration: "50 hours",
        level: "intermediate",
        rating: 4.5 + Math.random() * 0.5,
        enrollments: Math.floor(Math.random() * 60000) + 12000,
        skills: [skill, "Python", "Data Science", "AI"],
        isFree: provider.id === "youtube",
      });
    }

    // Generic course for any skill
    if (courses.length === 0) {
      courses.push({
        id: `${provider.id}-generic-${skill.replace(/\s+/g, "-")}-${Date.now()}`,
        title: `Learn ${skill}: Complete Guide`,
        description: `Comprehensive course covering all aspects of ${skill}`,
        provider,
        url: `${provider.url}/course/${skillLower.replace(/\s+/g, "-")}`,
        price: provider.id === "youtube" ? "Free" : "$39.99",
        duration: "25 hours",
        level: "beginner",
        rating: 4.3 + Math.random() * 0.7,
        enrollments: Math.floor(Math.random() * 30000) + 5000,
        skills: [skill],
        isFree: provider.id === "youtube",
      });
    }

    return courses;
  }

  private removeDuplicates(courses: Course[]): Course[] {
    const seen = new Set<string>();
    return courses.filter(course => {
      const key = `${course.title}-${course.provider.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private sortByRelevance(courses: Course[], skills: string[]): Course[] {
    return courses.sort((a, b) => {
      // Calculate relevance score
      const aScore = this.calculateRelevanceScore(a, skills);
      const bScore = this.calculateRelevanceScore(b, skills);
      
      if (aScore !== bScore) return bScore - aScore;
      return b.rating - a.rating; // Secondary sort by rating
    });
  }

  private calculateRelevanceScore(course: Course, targetSkills: string[]): number {
    let score = 0;
    
    targetSkills.forEach(targetSkill => {
      const targetLower = targetSkill.toLowerCase();
      
      // Check title
      if (course.title.toLowerCase().includes(targetLower)) {
        score += 3;
      }
      
      // Check skills
      course.skills.forEach(courseSkill => {
        if (courseSkill.toLowerCase().includes(targetLower) || 
            targetLower.includes(courseSkill.toLowerCase())) {
          score += 2;
        }
      });
      
      // Check description
      if (course.description.toLowerCase().includes(targetLower)) {
        score += 1;
      }
    });
    
    return score;
  }
}

export const courseService = new CourseService();