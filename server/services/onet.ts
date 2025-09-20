export interface ONetOccupation {
  code: string;
  title: string;
  description: string;
  onetsocCode: string;
  tags: {
    category: string;
    title: string;
  }[];
}

export interface ONetSkill {
  element_id: string;
  element_name: string;
  description: string;
  scale_id: string;
  data_value: string;
  n: number;
  standard_error: number;
  lower_ci_bound: string;
  upper_ci_bound: string;
  recommend_suppress: string;
  not_relevant: string;
  date: string;
  domain_source: string;
}

export interface ONetCareerData {
  occupation: ONetOccupation;
  skills: ONetSkill[];
  workActivities: any[];
  education: any[];
  salary: {
    median: number;
    percentile10: number;
    percentile25: number;
    percentile75: number;
    percentile90: number;
  } | null;
}

export class ONetService {
  private baseUrl = 'https://services.onetcenter.org/ws';
  private readonly defaultParams = {
    start: '1',
    end: '50'
  };

  async searchOccupations(query: string): Promise<ONetOccupation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/online/occupations`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CareerMirror/1.0'
        }
      });

      if (!response.ok) {
        console.error('O*NET API error:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      
      // Filter occupations based on query
      const filtered = (data.occupation || []).filter((occ: any) => 
        occ.title?.toLowerCase().includes(query.toLowerCase()) ||
        occ.tags?.some((tag: any) => 
          tag.title?.toLowerCase().includes(query.toLowerCase())
        )
      );

      return filtered.map((occ: any) => ({
        code: occ.code,
        title: occ.title,
        description: occ.description || '',
        onetsocCode: occ.onetsoc_code || occ.code,
        tags: occ.tags || []
      }));
    } catch (error) {
      console.error('Error fetching O*NET occupations:', error);
      return [];
    }
  }

  async getOccupationDetails(occupationCode: string): Promise<ONetCareerData | null> {
    try {
      const [occupationResp, skillsResp] = await Promise.all([
        fetch(`${this.baseUrl}/online/occupations/${occupationCode}`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CareerMirror/1.0'
          }
        }),
        fetch(`${this.baseUrl}/online/occupations/${occupationCode}/summary/skills`, {
          headers: {
            'Accept': 'application/json', 
            'User-Agent': 'CareerMirror/1.0'
          }
        })
      ]);

      if (!occupationResp.ok || !skillsResp.ok) {
        console.error('O*NET API error getting details');
        return null;
      }

      const [occupationData, skillsData] = await Promise.all([
        occupationResp.json(),
        skillsResp.json()
      ]);

      return {
        occupation: {
          code: occupationData.code,
          title: occupationData.title,
          description: occupationData.description || '',
          onetsocCode: occupationData.onetsoc_code || occupationData.code,
          tags: occupationData.tags || []
        },
        skills: skillsData.skill || [],
        workActivities: [],
        education: [],
        salary: null // Would need to integrate with BLS API for salary data
      };
    } catch (error) {
      console.error('Error fetching O*NET occupation details:', error);
      return null;
    }
  }

  async getSkillsForOccupation(occupationCode: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/online/occupations/${occupationCode}/summary/skills`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CareerMirror/1.0'
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return (data.skill || []).map((skill: any) => skill.element_name).filter(Boolean);
    } catch (error) {
      console.error('Error fetching O*NET skills:', error);
      return [];
    }
  }

  async getRelatedOccupations(occupationCode: string): Promise<ONetOccupation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/online/occupations/${occupationCode}/related`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CareerMirror/1.0'
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return (data.occupation || []).map((occ: any) => ({
        code: occ.code,
        title: occ.title,
        description: occ.description || '',
        onetsocCode: occ.onetsoc_code || occ.code,
        tags: occ.tags || []
      }));
    } catch (error) {
      console.error('Error fetching related occupations:', error);
      return [];
    }
  }
}

export const onetService = new ONetService();