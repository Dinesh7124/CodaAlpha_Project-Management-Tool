import { Router } from "express";
import { listLabels, createLabel, deleteLabel, addLabelToTask, removeLabelFromTask } from "../controllers/labelController.js";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);
r.get("/:projectId", listLabels);
r.post("/", createLabel);
r.delete("/:id", deleteLabel);
r.post("/task/add", addLabelToTask);
r.delete("/task/:taskId/:labelId", removeLabelFromTask);
export default r;
