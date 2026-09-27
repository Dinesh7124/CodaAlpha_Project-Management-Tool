import { Router } from "express";
import { projectAnalytics, globalAnalytics } from "../controllers/analyticsController.js";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);
r.get("/global", globalAnalytics);
r.get("/project/:projectId", projectAnalytics);
export default r;
