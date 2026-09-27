import { Router } from "express";
import { updateProfile, changePassword, searchUsers } from "../controllers/userController.js";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);
r.patch("/me", updateProfile);
r.patch("/me/password", changePassword);
r.get("/search", searchUsers);
export default r;
