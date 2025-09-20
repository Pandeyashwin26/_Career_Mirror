import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";

interface SuggestedPath {
  role: string;
  timeframe: string;
  probability: number;
  requiredSkills: string[];
  salaryRange: string;
}

export function registerCareerMapRoutes(app: Express) {
  // Get career map data including timeline and suggestions
  app.get('/api/career-map', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get user's career paths
      const careerPaths = await storage.getUserCareerPaths(userId);
      
      // Get user's skills for recommendations
      const userSkills = await storage.getUserSkills(userId);
      const skillNames = userSkills.map(skill => skill.skillName);

      // Generate suggested career paths based on current profile
      const suggestedPaths = generateCareerSuggestions(careerPaths, skillNames);

      res.json({
        careerPaths,
        suggestedPaths,
        skillCount: skillNames.length,
        totalExperience: calculateTotalExperience(careerPaths),
      });
    } catch (error) {
      console.error("Error fetching career map data:", error);
      res.status(500).json({ message: "Failed to fetch career map data" });
    }
  });

  // Get career progression analytics
  app.get('/api/career-map/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const [careerPaths, userSkills] = await Promise.all([
        storage.getUserCareerPaths(userId),
        storage.getUserSkills(userId),
      ]);

      const analytics = {
        totalRoles: careerPaths.length,
        careerSpan: calculateCareerSpan(careerPaths),
        uniqueSkills: new Set(careerPaths.flatMap(path => path.skills || [])).size,
        companies: new Set(careerPaths.map(path => path.company).filter(Boolean)).size,
        averageTenure: calculateAverageTenure(careerPaths),
        salaryGrowth: calculateSalaryGrowth(careerPaths),
        skillEvolution: analyzeSkillEvolution(careerPaths),
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching career analytics:", error);
      res.status(500).json({ message: "Failed to fetch career analytics" });
    }
  });
}

function generateCareerSuggestions(careerPaths: any[], userSkills: string[]): SuggestedPath[] {
  if (careerPaths.length === 0) return [];

  const currentRole = careerPaths.find(path => path.isCurrent);
  const latestRole = currentRole || careerPaths[careerPaths.length - 1];
  
  if (!latestRole) return [];

  const suggestions: SuggestedPath[] = [];
  const currentRoleLower = latestRole.role.toLowerCase();

  // Generate role-specific suggestions
  if (currentRoleLower.includes("junior") || currentRoleLower.includes("associate")) {
    // Junior to Mid-level progression
    const baseRole = currentRoleLower.replace(/junior|associate/g, "").trim();
    suggestions.push({
      role: `Senior ${baseRole}`,
      timeframe: "2-3 years",
      probability: 0.8,
      requiredSkills: ["Leadership", "Mentoring", "Advanced Technical Skills"],
      salaryRange: "$80,000 - $120,000",
    });
  } else if (currentRoleLower.includes("senior")) {
    // Senior to Leadership progression
    suggestions.push(
      {
        role: "Engineering Manager",
        timeframe: "1-2 years",
        probability: 0.6,
        requiredSkills: ["Team Management", "Project Planning", "Strategic Thinking"],
        salaryRange: "$120,000 - $160,000",
      },
      {
        role: "Principal Engineer",
        timeframe: "3-4 years",
        probability: 0.7,
        requiredSkills: ["System Architecture", "Technical Leadership", "Cross-team Collaboration"],
        salaryRange: "$140,000 - $200,000",
      }
    );
  } else if (currentRoleLower.includes("manager")) {
    // Management progression
    suggestions.push(
      {
        role: "Director of Engineering",
        timeframe: "2-4 years",
        probability: 0.5,
        requiredSkills: ["Strategic Planning", "Budget Management", "Organizational Leadership"],
        salaryRange: "$160,000 - $250,000",
      },
      {
        role: "VP of Engineering",
        timeframe: "4-6 years",
        probability: 0.3,
        requiredSkills: ["Executive Leadership", "Business Strategy", "Organizational Development"],
        salaryRange: "$200,000 - $350,000",
      }
    );
  }

  // Add skill-based suggestions
  if (userSkills.some(skill => skill.toLowerCase().includes("data"))) {
    suggestions.push({
      role: "Data Science Manager",
      timeframe: "1-3 years",
      probability: 0.6,
      requiredSkills: ["Machine Learning", "Data Analysis", "Team Leadership"],
      salaryRange: "$110,000 - $160,000",
    });
  }

  if (userSkills.some(skill => skill.toLowerCase().includes("product"))) {
    suggestions.push({
      role: "Product Manager",
      timeframe: "6 months - 2 years",
      probability: 0.7,
      requiredSkills: ["Product Strategy", "Market Research", "User Experience"],
      salaryRange: "$100,000 - $150,000",
    });
  }

  // Add entrepreneurial path
  if (careerPaths.length >= 2) {
    suggestions.push({
      role: "Startup Founder/CTO",
      timeframe: "1-5 years",
      probability: 0.4,
      requiredSkills: ["Business Development", "Technical Vision", "Risk Management"],
      salaryRange: "Equity-based compensation",
    });
  }

  return suggestions.slice(0, 5); // Limit to top 5 suggestions
}

function calculateTotalExperience(careerPaths: any[]): number {
  if (careerPaths.length === 0) return 0;

  return careerPaths.reduce((total, path) => {
    const startDate = new Date(path.startDate || Date.now());
    const endDate = new Date(path.endDate || Date.now());
    const years = Math.max(0, endDate.getFullYear() - startDate.getFullYear());
    return total + years;
  }, 0);
}

function calculateCareerSpan(careerPaths: any[]): number {
  if (careerPaths.length === 0) return 0;

  const sortedPaths = careerPaths.sort((a, b) => 
    new Date(a.startDate || "1970-01-01").getTime() - new Date(b.startDate || "1970-01-01").getTime()
  );

  const firstRole = sortedPaths[0];
  const lastRole = sortedPaths[sortedPaths.length - 1];

  const startDate = new Date(firstRole.startDate || Date.now());
  const endDate = new Date(lastRole.endDate || Date.now());

  return Math.max(0, endDate.getFullYear() - startDate.getFullYear());
}

function calculateAverageTenure(careerPaths: any[]): number {
  if (careerPaths.length === 0) return 0;

  const totalTenure = careerPaths.reduce((sum, path) => {
    const startDate = new Date(path.startDate || Date.now());
    const endDate = new Date(path.endDate || Date.now());
    const tenure = Math.max(0, endDate.getFullYear() - startDate.getFullYear());
    return sum + tenure;
  }, 0);

  return Math.round((totalTenure / careerPaths.length) * 10) / 10;
}

function calculateSalaryGrowth(careerPaths: any[]): number {
  const pathsWithSalary = careerPaths.filter(path => path.salary).sort((a, b) => 
    new Date(a.startDate || "1970-01-01").getTime() - new Date(b.startDate || "1970-01-01").getTime()
  );

  if (pathsWithSalary.length < 2) return 0;

  const firstSalary = pathsWithSalary[0].salary;
  const lastSalary = pathsWithSalary[pathsWithSalary.length - 1].salary;

  return Math.round(((lastSalary - firstSalary) / firstSalary) * 100);
}

function analyzeSkillEvolution(careerPaths: any[]): { skill: string; frequency: number }[] {
  const skillCounts: Record<string, number> = {};

  careerPaths.forEach(path => {
    (path.skills || []).forEach((skill: string) => {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });
  });

  return Object.entries(skillCounts)
    .map(([skill, frequency]) => ({ skill, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);
}