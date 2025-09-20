import fetch from 'node-fetch';
import type { SalaryData } from './salary';

export interface BLSResponse {
  status: string;
  responseTime: number;
  message: string[];
  Results: {
    series: BLSSeries[];
  };
}

export interface BLSSeries {
  seriesID: string;
  data: BLSDataPoint[];
}

export interface BLSDataPoint {
  year: string;
  period: string;
  periodName: string;
  latest: string;
  value: string;
  footnotes: any[];
}

export interface BLSJobData {
  occupationCode: string;
  occupationTitle: string;
  employmentLevel: number;
  annualMeanWage: number;
  hourlyMeanWage: number;
  location: string;
  locationCode: string;
}

export class BLSAPIService {
  private readonly API_KEY: string;
  private readonly BASE_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
  private readonly OES_URL = 'https://api.bls.gov/publicAPI/v1/timeseries/data/';
  
  constructor() {
    this.API_KEY = process.env.BLS_API_KEY || '';
    if (!this.API_KEY) {
      console.warn('BLS API Key not found. Using fallback salary estimates.');
    }
  }

  /**
   * Get salary data for a specific occupation and location from BLS
   */
  async getSalaryData(occupationTitle: string, location: string): Promise<SalaryData | null> {
    try {
      if (!this.API_KEY) {
        return null; // Fall back to estimates
      }

      // Map occupation title to BLS SOC code
      const socCode = this.mapOccupationToSOC(occupationTitle);
      if (!socCode) {
        console.log(`No SOC code found for occupation: ${occupationTitle}`);
        return null;
      }

      // Map location to BLS area code
      const areaCode = this.mapLocationToAreaCode(location);
      
      // Build series ID for Occupational Employment Statistics (OES)
      const seriesId = `OEUS${areaCode}${socCode}03`; // 03 = annual mean wage

      const requestBody = {
        seriesid: [seriesId],
        startyear: new Date().getFullYear() - 1,
        endyear: new Date().getFullYear(),
        registrationkey: this.API_KEY
      };

      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`BLS API error: ${response.status}`);
      }

      const data: BLSResponse = await response.json() as BLSResponse;
      
      if (data.status !== 'REQUEST_SUCCEEDED' || !data.Results?.series?.length) {
        console.log('BLS API request failed or no data returned');
        return null;
      }

      const series = data.Results.series[0];
      if (!series.data?.length) {
        return null;
      }

      // Get the most recent data point
      const latestData = series.data[0];
      const meanWage = parseFloat(latestData.value);

      if (isNaN(meanWage) || meanWage <= 0) {
        return null;
      }

      // BLS provides annual mean wage, calculate percentiles based on industry standards
      const median = meanWage;
      const p25 = Math.round(median * 0.85); // 25th percentile typically ~15% below median
      const p75 = Math.round(median * 1.25); // 75th percentile typically ~25% above median

      return {
        role: occupationTitle,
        location: location,
        p25,
        median: Math.round(median),
        p75,
        currency: 'USD',
        source: 'bls',
        dataYear: parseInt(latestData.year)
      };

    } catch (error) {
      console.error('Error fetching BLS salary data:', error);
      return null;
    }
  }

  /**
   * Get detailed occupation employment statistics
   */
  async getOccupationStats(occupationTitle: string, location: string): Promise<BLSJobData | null> {
    try {
      if (!this.API_KEY) {
        return null;
      }

      const socCode = this.mapOccupationToSOC(occupationTitle);
      const areaCode = this.mapLocationToAreaCode(location);

      if (!socCode) {
        return null;
      }

      // Get multiple data series for comprehensive stats
      const seriesIds = [
        `OEUS${areaCode}${socCode}01`, // Employment level
        `OEUS${areaCode}${socCode}03`, // Annual mean wage
        `OEUS${areaCode}${socCode}04`  // Hourly mean wage
      ];

      const requestBody = {
        seriesid: seriesIds,
        startyear: new Date().getFullYear() - 1,
        endyear: new Date().getFullYear(),
        registrationkey: this.API_KEY
      };

      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        return null;
      }

      const data: BLSResponse = await response.json() as BLSResponse;

      if (data.status !== 'REQUEST_SUCCEEDED' || !data.Results?.series?.length) {
        return null;
      }

      const employmentData = data.Results.series.find(s => s.seriesID.endsWith('01'))?.data?.[0];
      const annualWageData = data.Results.series.find(s => s.seriesID.endsWith('03'))?.data?.[0];
      const hourlyWageData = data.Results.series.find(s => s.seriesID.endsWith('04'))?.data?.[0];

      return {
        occupationCode: socCode,
        occupationTitle,
        employmentLevel: employmentData ? parseInt(employmentData.value) : 0,
        annualMeanWage: annualWageData ? parseFloat(annualWageData.value) : 0,
        hourlyMeanWage: hourlyWageData ? parseFloat(hourlyWageData.value) : 0,
        location,
        locationCode: areaCode
      };

    } catch (error) {
      console.error('Error fetching BLS occupation stats:', error);
      return null;
    }
  }

  /**
   * Map occupation title to Standard Occupational Classification (SOC) code
   */
  private mapOccupationToSOC(occupationTitle: string): string | null {
    const title = occupationTitle.toLowerCase();
    
    // Common tech occupations
    const socMappings: Record<string, string> = {
      // Software Development
      'software developer': '151252',
      'software engineer': '151252',
      'web developer': '151254',
      'full stack developer': '151252',
      'frontend developer': '151254',
      'backend developer': '151252',
      'mobile developer': '151252',
      
      // Data & Analytics
      'data scientist': '152098',
      'data analyst': '152041',
      'data engineer': '152098',
      'machine learning engineer': '152098',
      'ai engineer': '152098',
      
      // Management
      'product manager': '113021',
      'project manager': '113021',
      'engineering manager': '113021',
      'technical lead': '113021',
      
      // Design
      'ux designer': '271014',
      'ui designer': '271014',
      'graphic designer': '271024',
      'web designer': '271014',
      
      // Infrastructure
      'devops engineer': '151142',
      'system administrator': '151142',
      'network administrator': '151143',
      'database administrator': '151141',
      'cloud engineer': '151142',
      
      // Security
      'security analyst': '151212',
      'cybersecurity': '151212',
      
      // Business
      'business analyst': '131199',
      'consultant': '131111',
      'sales manager': '112022',
      'marketing manager': '112020',
      
      // Other common roles
      'teacher': '252031',
      'nurse': '291141',
      'accountant': '132011',
      'lawyer': '231011',
      'doctor': '291060'
    };

    // Find the best match
    for (const [key, soc] of Object.entries(socMappings)) {
      if (title.includes(key) || key.includes(title.split(' ')[0])) {
        return soc;
      }
    }

    return null;
  }

  /**
   * Map location to BLS area code
   */
  private mapLocationToAreaCode(location: string): string {
    const loc = location.toLowerCase();
    
    // Major metropolitan area codes
    const areaCodes: Record<string, string> = {
      // Major cities
      'new york': '35620',
      'los angeles': '31080',
      'chicago': '16980',
      'houston': '26420',
      'philadelphia': '37980',
      'phoenix': '38060',
      'san antonio': '41700',
      'san diego': '41740',
      'dallas': '19100',
      'san francisco': '41860',
      'seattle': '42660',
      'boston': '14460',
      'atlanta': '12060',
      'denver': '19740',
      'miami': '33100',
      'washington': '47900',
      'austin': '12420',
      'portland': '38900',
      
      // States (use statewide data)
      'california': 'S06',
      'texas': 'S48',
      'florida': 'S12',
      'new york state': 'S36',
      'illinois': 'S17',
      'pennsylvania': 'S42',
      'ohio': 'S39',
      'georgia': 'S13',
      'north carolina': 'S37',
      'michigan': 'S26',
      'virginia': 'S51',
      'washington state': 'S53',
      'arizona': 'S04',
      'massachusetts': 'S25',
      'tennessee': 'S47',
      'indiana': 'S18',
      'missouri': 'S29',
      'maryland': 'S24',
      'wisconsin': 'S55',
      'colorado': 'S08',
      'minnesota': 'S27'
    };

    // Find the best match
    for (const [key, code] of Object.entries(areaCodes)) {
      if (loc.includes(key)) {
        return code;
      }
    }

    // Default to national average
    return '00000';
  }

  /**
   * Get unemployment rate for a specific area
   */
  async getUnemploymentRate(location: string): Promise<number | null> {
    try {
      if (!this.API_KEY) {
        return null;
      }

      const areaCode = this.mapLocationToAreaCode(location);
      const seriesId = `LAUMT${areaCode}03`; // Unemployment rate series

      const requestBody = {
        seriesid: [seriesId],
        startyear: new Date().getFullYear() - 1,
        endyear: new Date().getFullYear(),
        registrationkey: this.API_KEY
      };

      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        return null;
      }

      const data: BLSResponse = await response.json() as BLSResponse;

      if (data.status !== 'REQUEST_SUCCEEDED' || !data.Results?.series?.length) {
        return null;
      }

      const latestData = data.Results.series[0]?.data?.[0];
      return latestData ? parseFloat(latestData.value) : null;

    } catch (error) {
      console.error('Error fetching unemployment rate:', error);
      return null;
    }
  }
}

export const blsAPIService = new BLSAPIService();