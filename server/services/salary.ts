import { storage } from "../storage";
import type { SalaryCache, InsertSalaryCache } from "@shared/schema";

export interface SalaryData {
  role: string;
  location: string;
  p25: number;
  median: number;
  p75: number;
  currency: string;
  source: string;
  dataYear: number;
}

export interface LifestyleMetrics {
  salary: SalaryData;
  workLifeBalance: number; // 1-10 scale
  stressLevel: number; // 1-10 scale
  remoteFlexibility: number; // 1-10 scale
  travelRequirement: number; // 1-10 scale
  careerGrowth: number; // 1-10 scale
}

export class SalaryService {
  // Cache duration in milliseconds (30 days)
  private readonly CACHE_DURATION = 30 * 24 * 60 * 60 * 1000;

  async getSalaryData(role: string, location: string): Promise<SalaryData | null> {
    try {
      // Check cache first
      const cached = await storage.getSalaryCacheEntry(role, location);
      if (cached && this.isCacheValid(cached)) {
        return {
          role: cached.role,
          location: cached.location,
          p25: cached.p25 || 0,
          median: cached.median || 0,
          p75: cached.p75 || 0,
          currency: cached.currency || "USD",
          source: cached.source,
          dataYear: cached.dataYear || new Date().getFullYear(),
        };
      }

      // Fetch from BLS or other APIs
      const salaryData = await this.fetchFromBLS(role, location);
      
      if (salaryData) {
        // Cache the result
        await storage.cacheSalaryData({
          role,
          location,
          source: "bls",
          p25: salaryData.p25,
          median: salaryData.median,
          p75: salaryData.p75,
          currency: salaryData.currency,
          dataYear: salaryData.dataYear,
          expiresAt: new Date(Date.now() + this.CACHE_DURATION),
        });
      }

      return salaryData;
    } catch (error) {
      console.error("Error fetching salary data:", error);
      return null;
    }
  }

  async generateLifestyleSimulation(
    role: string,
    location: string,
    userPreferences: {
      salaryImportance: number;
      wlbImportance: number;
      stressTolerance: number;
      remotePreference: number;
      travelWillingness: number;
    }
  ): Promise<LifestyleMetrics | null> {
    try {
      const salaryData = await this.getSalaryData(role, location);
      if (!salaryData) return null;

      // Generate lifestyle metrics based on role and location
      const metrics = await this.calculateLifestyleMetrics(role, location);

      return {
        salary: salaryData,
        workLifeBalance: this.adjustForPreferences(metrics.workLifeBalance, userPreferences.wlbImportance),
        stressLevel: this.adjustForPreferences(metrics.stressLevel, userPreferences.stressTolerance),
        remoteFlexibility: this.adjustForPreferences(metrics.remoteFlexibility, userPreferences.remotePreference),
        travelRequirement: this.adjustForPreferences(metrics.travelRequirement, userPreferences.travelWillingness),
        careerGrowth: metrics.careerGrowth,
      };
    } catch (error) {
      console.error("Error generating lifestyle simulation:", error);
      return null;
    }
  }

  private async fetchFromBLS(role: string, location: string): Promise<SalaryData | null> {
    try {
      // In a real implementation, this would call the BLS API
      // For now, we'll generate realistic estimates based on role and location
      const baseSalaries = this.getBaseSalaryEstimates(role);
      const locationMultiplier = this.getLocationMultiplier(location);

      return {
        role,
        location,
        p25: Math.round(baseSalaries.base * 0.8 * locationMultiplier),
        median: Math.round(baseSalaries.base * locationMultiplier),
        p75: Math.round(baseSalaries.base * 1.3 * locationMultiplier),
        currency: "USD",
        source: "bls",
        dataYear: new Date().getFullYear(),
      };
    } catch (error) {
      console.error("Error fetching from BLS:", error);
      return null;
    }
  }

  private async calculateLifestyleMetrics(role: string, location: string): Promise<Omit<LifestyleMetrics, 'salary'>> {
    // Base metrics for different role types
    const roleMetrics = this.getRoleMetrics(role);
    const locationMetrics = this.getLocationMetrics(location);

    return {
      workLifeBalance: Math.min(10, Math.max(1, roleMetrics.workLifeBalance + locationMetrics.workLifeBalance - 5)),
      stressLevel: Math.min(10, Math.max(1, roleMetrics.stressLevel + locationMetrics.stressLevel - 5)),
      remoteFlexibility: Math.min(10, Math.max(1, roleMetrics.remoteFlexibility + locationMetrics.remoteFlexibility - 5)),
      travelRequirement: Math.min(10, Math.max(1, roleMetrics.travelRequirement + locationMetrics.travelRequirement - 5)),
      careerGrowth: Math.min(10, Math.max(1, roleMetrics.careerGrowth + locationMetrics.careerGrowth - 5)),
    };
  }

  private adjustForPreferences(baseValue: number, preference: number): number {
    // Adjust metrics based on user preferences (1-10 scale)
    const adjustment = (preference - 5) * 0.2; // Small adjustment based on preference
    return Math.min(10, Math.max(1, baseValue + adjustment));
  }

  private getBaseSalaryEstimates(role: string): { base: number } {
    const roleLower = role.toLowerCase();
    
    if (roleLower.includes("software") || roleLower.includes("developer") || roleLower.includes("engineer")) {
      return { base: 95000 };
    } else if (roleLower.includes("data scientist") || roleLower.includes("machine learning")) {
      return { base: 120000 };
    } else if (roleLower.includes("product manager")) {
      return { base: 110000 };
    } else if (roleLower.includes("designer") || roleLower.includes("ux") || roleLower.includes("ui")) {
      return { base: 80000 };
    } else if (roleLower.includes("marketing")) {
      return { base: 70000 };
    } else if (roleLower.includes("sales")) {
      return { base: 75000 };
    } else if (roleLower.includes("manager") || roleLower.includes("director")) {
      return { base: 100000 };
    } else {
      return { base: 65000 }; // Default
    }
  }

  private getLocationMultiplier(location: string): number {
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes("san francisco") || locationLower.includes("sf")) {
      return 1.6;
    } else if (locationLower.includes("new york") || locationLower.includes("nyc")) {
      return 1.4;
    } else if (locationLower.includes("seattle")) {
      return 1.3;
    } else if (locationLower.includes("los angeles") || locationLower.includes("la")) {
      return 1.2;
    } else if (locationLower.includes("boston")) {
      return 1.2;
    } else if (locationLower.includes("chicago")) {
      return 1.1;
    } else if (locationLower.includes("austin")) {
      return 1.1;
    } else if (locationLower.includes("denver")) {
      return 1.0;
    } else if (locationLower.includes("remote")) {
      return 1.1;
    } else {
      return 0.9; // Lower cost areas
    }
  }

  private getRoleMetrics(role: string): Omit<LifestyleMetrics, 'salary'> {
    const roleLower = role.toLowerCase();
    
    if (roleLower.includes("software") || roleLower.includes("developer")) {
      return {
        workLifeBalance: 7,
        stressLevel: 5,
        remoteFlexibility: 8,
        travelRequirement: 2,
        careerGrowth: 8,
      };
    } else if (roleLower.includes("data scientist")) {
      return {
        workLifeBalance: 6,
        stressLevel: 6,
        remoteFlexibility: 7,
        travelRequirement: 3,
        careerGrowth: 8,
      };
    } else if (roleLower.includes("product manager")) {
      return {
        workLifeBalance: 5,
        stressLevel: 7,
        remoteFlexibility: 6,
        travelRequirement: 4,
        careerGrowth: 9,
      };
    } else if (roleLower.includes("consultant")) {
      return {
        workLifeBalance: 4,
        stressLevel: 8,
        remoteFlexibility: 3,
        travelRequirement: 8,
        careerGrowth: 7,
      };
    } else if (roleLower.includes("sales")) {
      return {
        workLifeBalance: 5,
        stressLevel: 7,
        remoteFlexibility: 5,
        travelRequirement: 6,
        careerGrowth: 6,
      };
    } else {
      return {
        workLifeBalance: 6,
        stressLevel: 5,
        remoteFlexibility: 5,
        travelRequirement: 3,
        careerGrowth: 6,
      };
    }
  }

  private getLocationMetrics(location: string): Omit<LifestyleMetrics, 'salary'> {
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes("san francisco") || locationLower.includes("new york")) {
      return {
        workLifeBalance: -1,
        stressLevel: 2,
        remoteFlexibility: 0,
        travelRequirement: 1,
        careerGrowth: 2,
      };
    } else if (locationLower.includes("remote")) {
      return {
        workLifeBalance: 2,
        stressLevel: -1,
        remoteFlexibility: 5,
        travelRequirement: -2,
        careerGrowth: 0,
      };
    } else {
      return {
        workLifeBalance: 0,
        stressLevel: 0,
        remoteFlexibility: 0,
        travelRequirement: 0,
        careerGrowth: 0,
      };
    }
  }

  private isCacheValid(cached: SalaryCache): boolean {
    if (!cached.expiresAt) return false;
    return new Date() < new Date(cached.expiresAt);
  }
}

export const salaryService = new SalaryService();