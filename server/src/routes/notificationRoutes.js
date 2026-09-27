import { Router } from "express";
import { listNotifications, markRead, markAllRead } from "../controllers/notificationController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);
router.get("/", listNotifications);
router.patch("/:id/read", markRead);
router.patch("/read-all", markAllRead);
export default router;
