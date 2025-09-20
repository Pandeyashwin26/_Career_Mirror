export interface ESCOOccupation {
  uri: string;
  title: string;
  alternativeLabel?: string[];
  description?: string;
  broaderType: string;
  broaderLabel: string;
  iscoGroup?: string;
  regulationNote?: string;
  definition?: string;
}

export interface ESCOSkill {
  uri: string;
  title: string;
  alternativeLabel?: string[];
  description?: string;
  skillType: string;
  reuseLevel: string;
  broaderSkills?: ESCOSkill[];
  narrowerSkills?: ESCOSkill[];
}

export interface ESCOCareerData {
  occupation: ESCOOccupation;
  skills: ESCOSkill[];
  relatedOccupations: ESCOOccupation[];
}

export class ESCOService {
  private baseUrl = 'https://ec.europa.eu/esco/api';
  private readonly defaultParams = {
    language: 'en',
    selectedVersion: 'v1.2.0',
    viewObsolete: 'false'
  };

  private buildUrl(endpoint: string, params: Record<string, string> = {}): string {
    const searchParams = new URLSearchParams({
      ...this.defaultParams,
      ...params
    });
    return `${this.baseUrl}${endpoint}?${searchParams.toString()}`;
  }

  async searchOccupations(query: string, limit: number = 20): Promise<ESCOOccupation[]> {
    try {
      const url = this.buildUrl('/search/occupation', {
        text: query,
        limit: limit.toString(),
        offset: '0'
      });

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CareerMirror/1.0'
        }
      });

      if (!response.ok) {
        console.error('ESCO API error:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      return (data._embedded?.results || []).map((item: any) => ({
        uri: item.uri,
        title: item.title,
        alternativeLabel: item.alternativeLabel,
        description: item.description,
        broaderType: item._links?.broaderType?.title || '',
        broaderLabel: item._links?.broaderType?.title || '',
        iscoGroup: item.iscoGroup,
        regulationNote: item.regulationNote,
        definition: item.definition
      }));
    } catch (error) {
      console.error('Error searching ESCO occupations:', error);
      return [];
    }
  }

  async searchSkills(query: string, limit: number = 20): Promise<ESCOSkill[]> {
    try {
      const url = this.buildUrl('/search/skill', {
        text: query,
        limit: limit.toString(),
        offset: '0'
      });

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CareerMirror/1.0'
        }
      });

      if (!response.ok) {
        console.error('ESCO Skills API error:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      return (data._embedded?.results || []).map((item: any) => ({
        uri: item.uri,
        title: item.title,
        alternativeLabel: item.alternativeLabel,
        description: item.description,
        skillType: item.skillType,
        reuseLevel: item.reuseLevel
      }));
    } catch (error) {
      console.error('Error searching ESCO skills:', error);
      return [];
    }
  }

  async getOccupationByUri(uri: string): Promise<ESCOOccupation | null> {
    try {
      const url = this.buildUrl('/resource/occupation', {
        uri: uri
      });

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CareerMirror/1.0'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const item = data._embedded?.results?.[0];
      
      if (!item) return null;

      return {
        uri: item.uri,
        title: item.title,
        alternativeLabel: item.alternativeLabel,
        description: item.description,
        broaderType: item._links?.broaderType?.title || '',
        broaderLabel: item._links?.broaderType?.title || '',
        iscoGroup: item.iscoGroup,
        regulationNote: item.regulationNote,
        definition: item.definition
      };
    } catch (error) {
      console.error('Error fetching ESCO occupation by URI:', error);
      return null;
    }
  }

  async getSkillsByOccupation(occupationUri: string): Promise<ESCOSkill[]> {
    try {
      // ESCO doesn't have a direct occupation-to-skills endpoint,
      // so we'll extract skills from occupation description or use related skills API
      const occupation = await this.getOccupationByUri(occupationUri);
      
      if (!occupation || !occupation.description) {
        return [];
      }

      // Extract potential skills from the description and search for them
      const skillKeywords = this.extractSkillsFromDescription(occupation.description);
      const allSkills: ESCOSkill[] = [];

      // Search for each potential skill
      for (const keyword of skillKeywords.slice(0, 5)) { // Limit to avoid too many requests
        const skills = await this.searchSkills(keyword, 3);
        allSkills.push(...skills);
      }

      // Remove duplicates
      const uniqueSkills = allSkills.filter((skill, index, self) => 
        self.findIndex(s => s.uri === skill.uri) === index
      );

      return uniqueSkills.slice(0, 10); // Limit to top 10 skills
    } catch (error) {
      console.error('Error getting skills by occupation:', error);
      return [];
    }
  }

  async getCareerData(occupationTitle: string): Promise<ESCOCareerData | null> {
    try {
      const occupations = await this.searchOccupations(occupationTitle, 1);
      
      if (occupations.length === 0) {
        return null;
      }

      const occupation = occupations[0];
      const [skills, relatedOccupations] = await Promise.all([
        this.getSkillsByOccupation(occupation.uri),
        this.searchOccupations(occupation.broaderType, 5) // Get related occupations in same category
      ]);

      return {
        occupation,
        skills,
        relatedOccupations: relatedOccupations.filter(occ => occ.uri !== occupation.uri)
      };
    } catch (error) {
      console.error('Error getting ESCO career data:', error);
      return null;
    }
  }

  private extractSkillsFromDescription(description: string): string[] {
    const skillPatterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+skills?\b/gi,
      /\bknowledge\s+of\s+([A-Za-z\s]+)/gi,
      /\bexperience\s+(?:with|in)\s+([A-Za-z\s]+)/gi,
      /\bproficient\s+(?:in|with)\s+([A-Za-z\s]+)/gi,
      /\b(?:using|utilize|apply)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
    ];

    const skills = new Set<string>();
    
    for (const pattern of skillPatterns) {
      let match;
      while ((match = pattern.exec(description)) !== null) {
        const skill = match[1].trim();
        if (skill.length > 2 && skill.length < 50) {
          skills.add(skill);
        }
      }
    }

    return Array.from(skills).slice(0, 10);
  }

  async getAllOccupations(limit: number = 100): Promise<ESCOOccupation[]> {
    try {
      const url = this.buildUrl('/resource/occupation', {
        limit: limit.toString(),
        offset: '0'
      });

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CareerMirror/1.0'
        }
      });

      if (!response.ok) {
        console.error('ESCO API error getting all occupations:', response.status);
        return [];
      }

      const data = await response.json();
      return (data._embedded?.results || []).map((item: any) => ({
        uri: item.uri,
        title: item.title,
        alternativeLabel: item.alternativeLabel,
        description: item.description,
        broaderType: item._links?.broaderType?.title || '',
        broaderLabel: item._links?.broaderType?.title || '',
        iscoGroup: item.iscoGroup,
        regulationNote: item.regulationNote,
        definition: item.definition
      }));
    } catch (error) {
      console.error('Error fetching all ESCO occupations:', error);
      return [];
    }
  }
}

export const escoService = new ESCOService();