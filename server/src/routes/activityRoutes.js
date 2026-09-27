import { Router } from "express";
import { listActivity } from "../controllers/activityController.js";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);
r.get("/:projectId", listActivity);
export default r;
