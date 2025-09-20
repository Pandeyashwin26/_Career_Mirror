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
