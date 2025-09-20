import { Router } from "express";
import { openAIService } from "../services/openai";

const router = Router();

/**
 * Future-Self AI Narrative API
 * Input: { career: string, skills: string[] }
 * Output: GPT-generated narrative
 */
router.post("/", async (req, res, next) => {
  try {
    const { career, skills } = req.body;
    if (!career) {
      return res.status(400).json({ error: "career is required" });
    }

    const narrative = await openAIService.generateFutureSelf(career, skills || []);
    res.json({ futureSelf: narrative });
  } catch (err) {
    next(err);
  }
});

export default router;
