import { Router } from "express";
import {
  listProjects, createProject, getProject,
  updateProject, deleteProject, inviteMember, removeMember,
  updateMemberRole,
} from "../controllers/projectController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);

router.get("/", listProjects);
router.post("/", createProject);
router.get("/:id", getProject);
router.patch("/:id", updateProject);
router.delete("/:id", deleteProject);
router.post("/:id/members", inviteMember);
router.delete("/:id/members/:userId", removeMember);
router.patch("/:id/members/:userId/role", updateMemberRole);

export default router;