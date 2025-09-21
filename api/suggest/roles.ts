import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUGGEST_ROLES: string[] = [
  "AI Engineer","Software Engineer","Senior Software Engineer","Machine Learning Engineer","Data Scientist","Data Engineer","MLOps Engineer","DevOps Engineer","Cloud Engineer","Site Reliability Engineer","Backend Developer","Frontend Developer","Full Stack Developer","Mobile Developer","iOS Developer","Android Developer","Product Manager","Technical Product Manager","Project Manager","Program Manager","UX Designer","UI Designer","UX Researcher","Product Designer","Graphic Designer","QA Engineer","Test Automation Engineer","Security Engineer","Cybersecurity Analyst","Network Engineer","Solutions Architect","Software Architect","Systems Engineer","Business Analyst","Data Analyst","BI Analyst","Data Architect","Platform Engineer","AI Researcher","NLP Engineer","Computer Vision Engineer","Deep Learning Engineer","Research Scientist","Applied Scientist","Economist","Statistician","Marketing Manager","Growth Manager","Sales Engineer","Technical Writer","IT Support Specialist","Help Desk Technician","Database Administrator","ERP Consultant","Scrum Master","Agile Coach","Game Developer","AR/VR Developer","Blockchain Developer","Embedded Systems Engineer","Firmware Engineer","Electrical Engineer","Electronics Engineer","Mechanical Engineer","Civil Engineer","Industrial Engineer","Operations Manager","Customer Success Manager","Account Manager","HR Manager","Recruiter","Financial Analyst","Investment Analyst","Risk Analyst"
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const q = String(req.query.q || '').toLowerCase();
  const limit = Math.min(parseInt(String(req.query.limit || '20')), 50);
  const results = (q ? SUGGEST_ROLES.filter(r => r.toLowerCase().includes(q)) : SUGGEST_ROLES).slice(0, limit);
  
  res.status(200).json(results);
}