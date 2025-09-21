import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUGGEST_LOCATIONS: string[] = [
  "Remote","San Francisco, CA, USA","New York, NY, USA","Los Angeles, CA, USA","Chicago, IL, USA","Seattle, WA, USA","Austin, TX, USA","Boston, MA, USA","Toronto, ON, Canada","Vancouver, BC, Canada","London, UK","Manchester, UK","Birmingham, UK","Dublin, Ireland","Paris, France","Berlin, Germany","Munich, Germany","Amsterdam, Netherlands","Rotterdam, Netherlands","Copenhagen, Denmark","Stockholm, Sweden","Helsinki, Finland","Oslo, Norway","Zurich, Switzerland","Geneva, Switzerland","Madrid, Spain","Barcelona, Spain","Rome, Italy","Milan, Italy","Lisbon, Portugal","Prague, Czech Republic","Warsaw, Poland","Budapest, Hungary","Vienna, Austria","Bucharest, Romania","Athens, Greece","Istanbul, Turkey","Dubai, UAE","Abu Dhabi, UAE","Bengaluru, India","Hyderabad, India","Pune, India","Chennai, India","Mumbai, India","Delhi, India","Kolkata, India","Singapore","Hong Kong","Tokyo, Japan","Osaka, Japan","Seoul, South Korea","Sydney, Australia","Melbourne, Australia","Auckland, New Zealand"
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const q = String(req.query.q || '').toLowerCase();
  const limit = Math.min(parseInt(String(req.query.limit || '20')), 50);
  const results = (q ? SUGGEST_LOCATIONS.filter(r => r.toLowerCase().includes(q)) : SUGGEST_LOCATIONS).slice(0, limit);
  
  res.status(200).json(results);
}