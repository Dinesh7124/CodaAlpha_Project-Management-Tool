import { Router } from "express";
import { createComment, listTaskComments, deleteComment } from "../controllers/commentController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);
router.post("/", createComment);
router.get("/task/:taskId", listTaskComments);
router.delete("/:id", deleteComment);
export default router;
