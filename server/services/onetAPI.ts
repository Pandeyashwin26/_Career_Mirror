import fetch from 'node-fetch';

export interface ONetOccupation {
  code: string;
  title: string;
  description?: string;
  tags?: {
    bright_outlook?: boolean;
    green?: boolean;
  };
}

export interface ONetSkill {
  element_id: string;
  element_name: string;
  scale_id: string;
  data_value: string;
  n: string;
  standard_error: string;
  lower_ci_bound: string;
  upper_ci_bound: string;
  recommend_suppress: string;
  not_relevant: string;
  date: string;
  domain_source: string;
}

export interface ONetKnowledge {
  element_id: string;
  element_name: string;
  scale_id: string;
  data_value: string;
  description?: string;
}

export interface ONetAbility {
  element_id: string;
  element_name: string;
  scale_id: string;
  data_value: string;
  description?: string;
}

export interface ONetEducation {
  element_id: string;
  element_name: string;
  scale_id: string;
  data_value: string;
  description?: string;
}

export interface ONetCareerPath {
  occupation_code: string;
  occupation_title: string;
  relationship: string;
  related_occupation_code: string;
  related_occupation_title: string;
}

export interface ONetJobDetails {
  occupation: ONetOccupation;
  skills: ONetSkill[];
  knowledge: ONetKnowledge[];
  abilities: ONetAbility[];
  education: ONetEducation[];
  tasks: string[];
  workActivities: any[];
  relatedOccupations: ONetCareerPath[];
}

export class ONetAPIService {
  private readonly BASE_URL = 'https://services.onetcenter.org/ws';
  private readonly API_VERSION = 'v1';
  private readonly USERNAME: string;
  private readonly PASSWORD: string;

  constructor() {
    this.USERNAME = process.env.ONET_USERNAME || '';
    this.PASSWORD = process.env.ONET_PASSWORD || '';
    
    if (!this.USERNAME || !this.PASSWORD) {
      console.warn('O*NET credentials not found. Some features may be limited.');
    }
  }

  /**
   * Search for occupations by title or keyword
   */
  async searchOccupations(query: string): Promise<ONetOccupation[]> {
    try {
      if (!this.USERNAME || !this.PASSWORD) {
        return this.getFallbackOccupations(query);
      }

      const url = `${this.BASE_URL}/${this.API_VERSION}/online/search?keyword=${encodeURIComponent(query)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CareerMirror/1.0',
          'Authorization': `Basic ${Buffer.from(`${this.USERNAME}:${this.PASSWORD}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        console.error(`O*NET API error: ${response.status}`);
        return this.getFallbackOccupations(query);
      }

      const data = await response.json();
      return data.occupation || [];

    } catch (error) {
      console.error('Error searching O*NET occupations:', error);
      return this.getFallbackOccupations(query);
    }
  }

  /**
   * Get detailed job information by O*NET-SOC code
   */
  async getOccupationDetails(onetCode: string): Promise<ONetJobDetails | null> {
    try {
      if (!this.USERNAME || !this.PASSWORD) {
        return this.getFallbackJobDetails(onetCode);
      }

      // Fetch occupation details
      const occupation = await this.fetchOccupation(onetCode);
      if (!occupation) return null;

      // Fetch related data concurrently
      const [skills, knowledge, abilities, education, tasks, workActivities, relatedOccupations] = 
        await Promise.allSettled([
          this.fetchSkills(onetCode),
          this.fetchKnowledge(onetCode),
          this.fetchAbilities(onetCode),
          this.fetchEducation(onetCode),
          this.fetchTasks(onetCode),
          this.fetchWorkActivities(onetCode),
          this.fetchRelatedOccupations(onetCode)
        ]);

      return {
        occupation,
        skills: skills.status === 'fulfilled' ? skills.value : [],
        knowledge: knowledge.status === 'fulfilled' ? knowledge.value : [],
        abilities: abilities.status === 'fulfilled' ? abilities.value : [],
        education: education.status === 'fulfilled' ? education.value : [],
        tasks: tasks.status === 'fulfilled' ? tasks.value : [],
        workActivities: workActivities.status === 'fulfilled' ? workActivities.value : [],
        relatedOccupations: relatedOccupations.status === 'fulfilled' ? relatedOccupations.value : []
      };

    } catch (error) {
      console.error('Error fetching O*NET occupation details:', error);
      return this.getFallbackJobDetails(onetCode);
    }
  }

  /**
   * Get skill requirements for a specific occupation
   */
  async getSkillRequirements(occupationTitle: string): Promise<ONetSkill[]> {
    try {
      // First, search for the occupation to get the O*NET code
      const occupations = await this.searchOccupations(occupationTitle);
      if (!occupations.length) {
        return this.getFallbackSkills(occupationTitle);
      }

      const onetCode = occupations[0].code;
      return await this.fetchSkills(onetCode);

    } catch (error) {
      console.error('Error fetching skill requirements:', error);
      return this.getFallbackSkills(occupationTitle);
    }
  }

  /**
   * Get career progression paths for an occupation
   */
  async getCareerPaths(occupationTitle: string): Promise<ONetCareerPath[]> {
    try {
      const occupations = await this.searchOccupations(occupationTitle);
      if (!occupations.length) {
        return [];
      }

      const onetCode = occupations[0].code;
      return await this.fetchRelatedOccupations(onetCode);

    } catch (error) {
      console.error('Error fetching career paths:', error);
      return [];
    }
  }

  /**
   * Analyze skill gap based on O*NET data
   */
  async analyzeSkillGap(userSkills: string[], targetRole: string): Promise<{
    requiredSkills: ONetSkill[];
    missingSkills: string[];
    matchingSkills: string[];
    skillMatch: number;
  }> {
    try {
      const requiredSkills = await this.getSkillRequirements(targetRole);
      const requiredSkillNames = requiredSkills.map(s => s.element_name.toLowerCase());
      const userSkillsLower = userSkills.map(s => s.toLowerCase());

      const matchingSkills: string[] = [];
      const missingSkills: string[] = [];

      requiredSkillNames.forEach(reqSkill => {
        const isMatch = userSkillsLower.some(userSkill => 
          userSkill.includes(reqSkill) || reqSkill.includes(userSkill)
        );

        if (isMatch) {
          matchingSkills.push(reqSkill);
        } else {
          missingSkills.push(reqSkill);
        }
      });

      const skillMatch = requiredSkillNames.length > 0 
        ? (matchingSkills.length / requiredSkillNames.length) * 100 
        : 0;

      return {
        requiredSkills,
        missingSkills,
        matchingSkills,
        skillMatch: Math.round(skillMatch)
      };

    } catch (error) {
      console.error('Error analyzing skill gap:', error);
      return {
        requiredSkills: [],
        missingSkills: [],
        matchingSkills: [],
        skillMatch: 0
      };
    }
  }

  // Private helper methods
  private async fetchOccupation(onetCode: string): Promise<ONetOccupation | null> {
    try {
      const url = `${this.BASE_URL}/${this.API_VERSION}/online/occupations/${onetCode}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.USERNAME}:${this.PASSWORD}`).toString('base64')}`
        }
      });

      if (!response.ok) return null;
      
      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Error fetching occupation:', error);
      return null;
    }
  }

  private async fetchSkills(onetCode: string): Promise<ONetSkill[]> {
    try {
      const url = `${this.BASE_URL}/${this.API_VERSION}/online/occupations/${onetCode}/skills`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.USERNAME}:${this.PASSWORD}`).toString('base64')}`
        }
      });

      if (!response.ok) return [];
      
      const data = await response.json();
      return data.skill || [];

    } catch (error) {
      console.error('Error fetching skills:', error);
      return [];
    }
  }

  private async fetchKnowledge(onetCode: string): Promise<ONetKnowledge[]> {
    try {
      const url = `${this.BASE_URL}/${this.API_VERSION}/online/occupations/${onetCode}/knowledge`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.USERNAME}:${this.PASSWORD}`).toString('base64')}`
        }
      });

      if (!response.ok) return [];
      
      const data = await response.json();
      return data.knowledge || [];

    } catch (error) {
      console.error('Error fetching knowledge:', error);
      return [];
    }
  }

  private async fetchAbilities(onetCode: string): Promise<ONetAbility[]> {
    try {
      const url = `${this.BASE_URL}/${this.API_VERSION}/online/occupations/${onetCode}/abilities`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.USERNAME}:${this.PASSWORD}`).toString('base64')}`
        }
      });

      if (!response.ok) return [];
      
      const data = await response.json();
      return data.ability || [];

    } catch (error) {
      console.error('Error fetching abilities:', error);
      return [];
    }
  }

  private async fetchEducation(onetCode: string): Promise<ONetEducation[]> {
    try {
      const url = `${this.BASE_URL}/${this.API_VERSION}/online/occupations/${onetCode}/education_training`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.USERNAME}:${this.PASSWORD}`).toString('base64')}`
        }
      });

      if (!response.ok) return [];
      
      const data = await response.json();
      return data.education_training || [];

    } catch (error) {
      console.error('Error fetching education:', error);
      return [];
    }
  }

  private async fetchTasks(onetCode: string): Promise<string[]> {
    try {
      const url = `${this.BASE_URL}/${this.API_VERSION}/online/occupations/${onetCode}/tasks`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.USERNAME}:${this.PASSWORD}`).toString('base64')}`
        }
      });

      if (!response.ok) return [];
      
      const data = await response.json();
      return (data.task || []).map((task: any) => task.statement || '');

    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }

  private async fetchWorkActivities(onetCode: string): Promise<any[]> {
    try {
      const url = `${this.BASE_URL}/${this.API_VERSION}/online/occupations/${onetCode}/work_activities`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.USERNAME}:${this.PASSWORD}`).toString('base64')}`
        }
      });

      if (!response.ok) return [];
      
      const data = await response.json();
      return data.work_activity || [];

    } catch (error) {
      console.error('Error fetching work activities:', error);
      return [];
    }
  }

  private async fetchRelatedOccupations(onetCode: string): Promise<ONetCareerPath[]> {
    try {
      const url = `${this.BASE_URL}/${this.API_VERSION}/online/occupations/${onetCode}/related_occupations`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.USERNAME}:${this.PASSWORD}`).toString('base64')}`
        }
      });

      if (!response.ok) return [];
      
      const data = await response.json();
      return data.related_occupation || [];

    } catch (error) {
      console.error('Error fetching related occupations:', error);
      return [];
    }
  }

  // Fallback methods when API is not available
  private getFallbackOccupations(query: string): ONetOccupation[] {
    const commonOccupations: ONetOccupation[] = [
      { code: '15-1252.00', title: 'Software Developers, Applications' },
      { code: '15-1254.00', title: 'Web Developers' },
      { code: '15-2098.00', title: 'Data Scientists' },
      { code: '11-3021.00', title: 'Computer and Information Systems Managers' },
      { code: '27-1014.00', title: 'Multimedia Artists and Animators' },
      { code: '15-1142.00', title: 'Network and Computer Systems Administrators' }
    ];

    const queryLower = query.toLowerCase();
    return commonOccupations.filter(occ => 
      occ.title.toLowerCase().includes(queryLower) ||
      queryLower.split(' ').some(word => occ.title.toLowerCase().includes(word))
    );
  }

  private getFallbackSkills(occupationTitle: string): ONetSkill[] {
    const skillMappings: Record<string, string[]> = {
      'software': ['Programming', 'Problem Solving', 'Mathematics', 'Critical Thinking', 'Systems Analysis'],
      'data': ['Mathematics', 'Programming', 'Critical Thinking', 'Systems Analysis', 'Complex Problem Solving'],
      'web': ['Programming', 'Web Development', 'User Interface Design', 'Systems Design', 'Problem Solving'],
      'manager': ['Management', 'Leadership', 'Decision Making', 'Communication', 'Strategic Planning']
    };

    const occupation = occupationTitle.toLowerCase();
    let skills: string[] = [];

    for (const [key, skillList] of Object.entries(skillMappings)) {
      if (occupation.includes(key)) {
        skills = skillList;
        break;
      }
    }

    if (!skills.length) {
      skills = ['Problem Solving', 'Communication', 'Critical Thinking', 'Teamwork'];
    }

    return skills.map((skill, index) => ({
      element_id: `2.B.1.${index + 1}`,
      element_name: skill,
      scale_id: 'IM',
      data_value: '3.5',
      n: '100',
      standard_error: '0.1',
      lower_ci_bound: '3.3',
      upper_ci_bound: '3.7',
      recommend_suppress: 'N',
      not_relevant: 'n/a',
      date: new Date().toISOString().split('T')[0],
      domain_source: 'Analyst'
    }));
  }

  private getFallbackJobDetails(onetCode: string): ONetJobDetails | null {
    return {
      occupation: { code: onetCode, title: 'Professional' },
      skills: this.getFallbackSkills('professional'),
      knowledge: [],
      abilities: [],
      education: [],
      tasks: [],
      workActivities: [],
      relatedOccupations: []
    };
  }
}

export const onetAPIService = new ONetAPIService();