import { Router } from "express";
import { listViews, createView, deleteView } from "../controllers/viewController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);
router.get("/:projectId", listViews);
router.post("/", createView);
router.delete("/:id", deleteView);

export default router;
