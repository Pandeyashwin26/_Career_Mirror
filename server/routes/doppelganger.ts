import { Router } from "express";
import { vectorSearchService } from "../services/vectorSearch";

const router = Router();

/**
 * Career Doppelgänger API
 * Input: { profileText: string }
 * Output: top similar profiles (careers)
 */
router.post("/", async (req, res, next) => {
  try {
    const { profileText } = req.body;
    if (!profileText) {
      return res.status(400).json({ error: "profileText is required" });
    }

    const results = await vectorSearchService.findCareerDoppelgangers(profileText);
    res.json({ doppelgangers: results });
  } catch (err) {
    next(err);
  }
});

export default router;
