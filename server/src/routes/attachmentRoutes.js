import { Router } from "express";
import { uploadAttachment, listTaskAttachments, deleteAttachment } from "../controllers/attachmentController.js";
import { auth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const r = Router();
r.use(auth);
r.post("/", upload.single("file"), uploadAttachment);
r.get("/task/:taskId", listTaskAttachments);
r.delete("/:id", deleteAttachment);
export default r;
