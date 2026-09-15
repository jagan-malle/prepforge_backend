import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  start,
  getSession,
  question,
  evaluate,
  next,
  complete,
} from "../controllers/interviewController.js";
const router = Router();
router.use(protect);
router.post("/start", start);
router.post("/question", question);
router.post("/evaluate", evaluate);
router.post("/next", next);
router.post("/complete", complete);
router.get("/:id", getSession);
export default router;
