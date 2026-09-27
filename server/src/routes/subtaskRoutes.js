import { Router } from "express";
import { createSubtask, toggleSubtask, deleteSubtask } from "../controllers/subtaskController.js";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);
r.post("/", createSubtask);
r.patch("/:id/toggle", toggleSubtask);
r.delete("/:id", deleteSubtask);
export default r;
