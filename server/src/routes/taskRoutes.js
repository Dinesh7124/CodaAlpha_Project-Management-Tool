import { Router } from "express";
import { createTask, updateTask, deleteTask } from "../controllers/taskController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);
router.post("/", createTask);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);
export default router;
