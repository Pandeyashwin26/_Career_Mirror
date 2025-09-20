import { Express } from "express";
import { registerAchievementRoutes } from "./achievements";
import { registerCareerMapRoutes } from "./career-map";
import { registerCourseRoutes } from "./courses";
import { registerLifestyleRoutes } from "./lifestyle";
import doppelgangerRouter from "./doppelganger";
import futureSelfRouter from "./future-self";

export async function registerRoutes(app: Express) {
  // Register all route modules
  registerAchievementRoutes(app);
  registerCareerMapRoutes(app);
  registerCourseRoutes(app);
  registerLifestyleRoutes(app);
  
  // Register router-based routes
  app.use("/api/doppelganger", doppelgangerRouter);
  app.use("/api/future-self", futureSelfRouter);
  
  return app;
}
