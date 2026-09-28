import { Router } from "express";
import {
  updateProfile,
  uploadAvatar,
  changePassword,
  requestEmailChange,
  verifyEmailChange,
  requestAccountDeletion,
  confirmAccountDeletion,
  getSecurityLog,
  getSessions,
  logoutAllSessions,
  searchUsers,
} from "../controllers/userController.js";
import { auth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();
router.use(auth);

// Profile
router.patch("/me", updateProfile);
router.post("/me/avatar", upload.single("avatar"), uploadAvatar);

// Password
router.patch("/me/password", changePassword);

// Email change (2-step with OTP)
router.post("/me/email/request", requestEmailChange);
router.post("/me/email/verify", verifyEmailChange);

// Account deletion (2-step with OTP)
router.post("/me/delete/request", requestAccountDeletion);
router.post("/me/delete/confirm", confirmAccountDeletion);

// Security
router.get("/me/security-log", getSecurityLog);
router.get("/me/sessions", getSessions);
router.post("/me/sessions/logout-all", logoutAllSessions);

// Search
router.get("/search", searchUsers);

export default router;