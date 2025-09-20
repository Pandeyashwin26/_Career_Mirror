import { onetService } from './onet.js';
import { escoService } from './esco.js';
import { db } from '../db.js';
import { eq } from 'drizzle-orm';

export interface JobMarketData {
  id: string;
  title: string;
  description: string;
  skills: string[];
  source: 'onet' | 'esco';
  sourceId: string;
  salaryRange?: {
    min: number;
    max: number;
    median: number;
  };
  educationRequirements?: string[];
  workActivities?: string[];
  growthProjection?: number;
  location?: string;
  lastUpdated: Date;
}

export interface SkillDemandData {
  skill: string;
  demandScore: number;
  growthRate: number;
  relatedJobs: string[];
  avgSalary: number;
  source: string;
  lastUpdated: Date;
}

export class DataIngestionService {
  private batchSize = 100;
  private readonly delayBetweenRequests = 1000; // 1 second delay to be respectful to APIs

  async ingestONetData(): Promise<{ success: number; errors: number }> {
    console.log('Starting O*NET data ingestion...');
    let success = 0;
    let errors = 0;

    try {
      // Get a sample of occupations from different categories
      const searchQueries = [
        'software', 'engineer', 'manager', 'analyst', 'developer',
        'scientist', 'designer', 'consultant', 'specialist', 'technician',
        'coordinator', 'director', 'administrator', 'supervisor', 'officer'
      ];

      for (const query of searchQueries) {
        try {
          console.log(`Searching O*NET for: ${query}`);
          const occupations = await onetService.searchOccupations(query);
          
          for (const occupation of occupations.slice(0, 20)) { // Limit to avoid overwhelming the API
            try {
              const details = await onetService.getOccupationDetails(occupation.code);
              
              if (details) {
                const jobData: JobMarketData = {
                  id: `onet-${occupation.code}`,
                  title: occupation.title,
                  description: occupation.description,
                  skills: details.skills.map(s => s.element_name).filter(Boolean).slice(0, 15),
                  source: 'onet',
                  sourceId: occupation.code,
                  salaryRange: details.salary ? {
                    min: parseInt(details.salary.percentile10.toString()),
                    max: parseInt(details.salary.percentile90.toString()),
                    median: parseInt(details.salary.median.toString())
                  } : undefined,
                  educationRequirements: [],
                  workActivities: [],
                  lastUpdated: new Date()
                };

                await this.saveJobMarketData(jobData);
                success++;
                console.log(`Saved: ${occupation.title}`);
                
                // Create skill demand data
                for (const skill of details.skills.slice(0, 5)) {
                  await this.updateSkillDemandData(
                    skill.element_name,
                    'onet',
                    occupation.title
                  );
                }
                
                // Add delay to be respectful to the API
                await this.delay(this.delayBetweenRequests);
              }
            } catch (detailError) {
              console.error(`Error processing occupation ${occupation.title}:`, detailError);
              errors++;
            }
          }
          
          // Delay between different search queries
          await this.delay(this.delayBetweenRequests * 2);
        } catch (queryError) {
          console.error(`Error searching for ${query}:`, queryError);
          errors++;
        }
      }
    } catch (error) {
      console.error('Error during O*NET data ingestion:', error);
      errors++;
    }

    console.log(`O*NET ingestion completed. Success: ${success}, Errors: ${errors}`);
    return { success, errors };
  }

  async ingestESCOData(): Promise<{ success: number; errors: number }> {
    console.log('Starting ESCO data ingestion...');
    let success = 0;
    let errors = 0;

    try {
      // Get occupations from different categories
      const searchQueries = [
        'software engineer', 'data analyst', 'project manager', 'designer', 'developer',
        'scientist', 'consultant', 'specialist', 'coordinator', 'administrator',
        'marketing', 'sales', 'finance', 'operations', 'human resources'
      ];

      for (const query of searchQueries) {
        try {
          console.log(`Searching ESCO for: ${query}`);
          const occupations = await escoService.searchOccupations(query, 15);
          
          for (const occupation of occupations) {
            try {
              const careerData = await escoService.getCareerData(occupation.title);
              
              if (careerData) {
                const jobData: JobMarketData = {
                  id: `esco-${Buffer.from(occupation.uri).toString('base64')}`,
                  title: occupation.title,
                  description: occupation.description || occupation.definition || '',
                  skills: careerData.skills.map(s => s.title).filter(Boolean).slice(0, 15),
                  source: 'esco',
                  sourceId: occupation.uri,
                  educationRequirements: occupation.regulationNote ? [occupation.regulationNote] : [],
                  lastUpdated: new Date()
                };

                await this.saveJobMarketData(jobData);
                success++;
                console.log(`Saved: ${occupation.title}`);
                
                // Create skill demand data
                for (const skill of careerData.skills.slice(0, 5)) {
                  await this.updateSkillDemandData(
                    skill.title,
                    'esco',
                    occupation.title
                  );
                }
                
                // Add delay to be respectful to the API
                await this.delay(this.delayBetweenRequests);
              }
            } catch (detailError) {
              console.error(`Error processing occupation ${occupation.title}:`, detailError);
              errors++;
            }
          }
          
          // Delay between different search queries
          await this.delay(this.delayBetweenRequests * 2);
        } catch (queryError) {
          console.error(`Error searching for ${query}:`, queryError);
          errors++;
        }
      }
    } catch (error) {
      console.error('Error during ESCO data ingestion:', error);
      errors++;
    }

    console.log(`ESCO ingestion completed. Success: ${success}, Errors: ${errors}`);
    return { success, errors };
  }

  async runFullDataIngestion(): Promise<{ onet: any; esco: any }> {
    console.log('Starting full data ingestion pipeline...');
    
    const onetResults = await this.ingestONetData();
    console.log('O*NET ingestion completed, starting ESCO...');
    
    const escoResults = await this.ingestESCOData();
    console.log('Full data ingestion completed');

    return {
      onet: onetResults,
      esco: escoResults
    };
  }

  private async saveJobMarketData(jobData: JobMarketData): Promise<void> {
    try {
      // For now, we'll store this in memory or could extend the schema to add job market data tables
      // In a real implementation, you would have dedicated tables for job market data
      console.log(`Would save job market data: ${jobData.title} from ${jobData.source}`);
      
      // Example of what could be implemented:
      // await db.insert(jobMarketData).values(jobData).onConflictDoUpdate({
      //   target: jobMarketData.id,
      //   set: {
      //     ...jobData,
      //     lastUpdated: new Date()
      //   }
      // });
    } catch (error) {
      console.error('Error saving job market data:', error);
      throw error;
    }
  }

  private async updateSkillDemandData(
    skillName: string, 
    source: string, 
    jobTitle: string
  ): Promise<void> {
    try {
      // This would update skill demand metrics based on job market data
      console.log(`Would update skill demand for: ${skillName} (${source}) related to ${jobTitle}`);
      
      // Example implementation:
      // const existingSkill = await db.select().from(skillDemand).where(eq(skillDemand.skill, skillName)).limit(1);
      // 
      // if (existingSkill.length > 0) {
      //   // Update existing skill demand data
      //   await db.update(skillDemand)
      //     .set({
      //       demandScore: existingSkill[0].demandScore + 1,
      //       relatedJobs: [...existingSkill[0].relatedJobs, jobTitle],
      //       lastUpdated: new Date()
      //     })
      //     .where(eq(skillDemand.skill, skillName));
      // } else {
      //   // Create new skill demand entry
      //   await db.insert(skillDemand).values({
      //     skill: skillName,
      //     demandScore: 1,
      //     growthRate: 0,
      //     relatedJobs: [jobTitle],
      //     avgSalary: 0,
      //     source,
      //     lastUpdated: new Date()
      //   });
      // }
    } catch (error) {
      console.error('Error updating skill demand data:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to get aggregated career data for a specific role
  async getCareerInsights(roleTitle: string): Promise<{
    onetData: any;
    escoData: any;
    skillDemand: string[];
    relatedRoles: string[];
  }> {
    try {
      const [onetOccupations, escoCareerData] = await Promise.all([
        onetService.searchOccupations(roleTitle),
        escoService.getCareerData(roleTitle)
      ]);

      const skillDemand: string[] = [];
      const relatedRoles: string[] = [];

      // Aggregate skills from both sources
      if (onetOccupations.length > 0) {
        const skills = await onetService.getSkillsForOccupation(onetOccupations[0].code);
        skillDemand.push(...skills);
      }

      if (escoCareerData) {
        const skills = escoCareerData.skills.map(s => s.title);
        skillDemand.push(...skills);
        relatedRoles.push(...escoCareerData.relatedOccupations.map(o => o.title));
      }

      return {
        onetData: onetOccupations[0] || null,
        escoData: escoCareerData || null,
        skillDemand: Array.from(new Set(skillDemand)), // Remove duplicates
        relatedRoles: Array.from(new Set(relatedRoles)) // Remove duplicates
      };
    } catch (error) {
      console.error('Error getting career insights:', error);
      return {
        onetData: null,
        escoData: null,
        skillDemand: [],
        relatedRoles: []
      };
    }
  }
}

export const dataIngestionService = new DataIngestionService();