import { Router } from "express";
import { forgotPassword, verifyOtp, resetPassword } from "../controllers/passwordController.js";

const router = Router();
router.post("/forgot", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset", resetPassword);

export default router;