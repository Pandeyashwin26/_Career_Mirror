import dotenv from 'dotenv';
import express, { type Request, Response } from "express";
import session from "express-session";
import { log, setupVite, serveStatic } from "./vite";
import { registerRoutes } from "./routes";
import { initDb } from "./db";

// Load environment variables
dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '5000');

// Initialize database connection
initDb();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'career-mirror-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Lightweight suggestions (inline data to avoid bundling/path issues)
const SUGGEST_ROLES: string[] = [
  "AI Engineer","Software Engineer","Senior Software Engineer","Machine Learning Engineer","Data Scientist","Data Engineer","MLOps Engineer","DevOps Engineer","Cloud Engineer","Site Reliability Engineer","Backend Developer","Frontend Developer","Full Stack Developer","Mobile Developer","iOS Developer","Android Developer","Product Manager","Technical Product Manager","Project Manager","Program Manager","UX Designer","UI Designer","UX Researcher","Product Designer","Graphic Designer","QA Engineer","Test Automation Engineer","Security Engineer","Cybersecurity Analyst","Network Engineer","Solutions Architect","Software Architect","Systems Engineer","Business Analyst","Data Analyst","BI Analyst","Data Architect","Platform Engineer","AI Researcher","NLP Engineer","Computer Vision Engineer","Deep Learning Engineer","Research Scientist","Applied Scientist","Economist","Statistician","Marketing Manager","Growth Manager","Sales Engineer","Technical Writer","IT Support Specialist","Help Desk Technician","Database Administrator","ERP Consultant","Scrum Master","Agile Coach","Game Developer","AR/VR Developer","Blockchain Developer","Embedded Systems Engineer","Firmware Engineer","Electrical Engineer","Electronics Engineer","Mechanical Engineer","Civil Engineer","Industrial Engineer","Operations Manager","Customer Success Manager","Account Manager","HR Manager","Recruiter","Financial Analyst","Investment Analyst","Risk Analyst"
];

const SUGGEST_LOCATIONS: string[] = [
  "Remote","San Francisco, CA, USA","New York, NY, USA","Los Angeles, CA, USA","Chicago, IL, USA","Seattle, WA, USA","Austin, TX, USA","Boston, MA, USA","Toronto, ON, Canada","Vancouver, BC, Canada","London, UK","Manchester, UK","Birmingham, UK","Dublin, Ireland","Paris, France","Berlin, Germany","Munich, Germany","Amsterdam, Netherlands","Rotterdam, Netherlands","Copenhagen, Denmark","Stockholm, Sweden","Helsinki, Finland","Oslo, Norway","Zurich, Switzerland","Geneva, Switzerland","Madrid, Spain","Barcelona, Spain","Rome, Italy","Milan, Italy","Lisbon, Portugal","Prague, Czech Republic","Warsaw, Poland","Budapest, Hungary","Vienna, Austria","Bucharest, Romania","Athens, Greece","Istanbul, Turkey","Dubai, UAE","Abu Dhabi, UAE","Bengaluru, India","Hyderabad, India","Pune, India","Chennai, India","Mumbai, India","Delhi, India","Kolkata, India","Singapore","Hong Kong","Tokyo, Japan","Osaka, Japan","Seoul, South Korea","Sydney, Australia","Melbourne, Australia","Auckland, New Zealand"
];

app.get('/api/suggest/roles', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase();
  const limit = Math.min(parseInt(String(req.query.limit || '20')), 50);
  const results = (q ? SUGGEST_ROLES.filter(r => r.toLowerCase().includes(q)) : SUGGEST_ROLES).slice(0, limit);
  res.json(results);
});

app.get('/api/suggest/locations', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase();
  const limit = Math.min(parseInt(String(req.query.limit || '20')), 50);
  const results = (q ? SUGGEST_LOCATIONS.filter(r => r.toLowerCase().includes(q)) : SUGGEST_LOCATIONS).slice(0, limit);
  res.json(results);
});

app.get('/api/suggest/experience', (_req: Request, res: Response) => {
  const years = Array.from({ length: 41 }, (_, i) => i);
  res.json(years);
});

async function startServer() {
  try {
    // Register API routes
    const server = await registerRoutes(app);
    
    // Setup Vite dev server or static files based on environment
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      await setupVite(app, server);
    }
    
    // Start the server
    server.listen(port, "0.0.0.0", () => {
      const colorText = (text: string) => `\x1b[36m${text}\x1b[0m`;
      
      log(`Server running on ${colorText(`http://localhost:${port}`)}`);
      
      if (process.env.NODE_ENV !== "production") {
        log(`Development mode: ${colorText("Vite dev server active")}`);
      }
    });
    
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
