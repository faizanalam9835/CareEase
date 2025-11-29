import express from "express";
import { register, login, verify } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema, verifySchema } from "../validation/authSchema.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/verify", validate(verifySchema), verify);
router.post("/login", validate(loginSchema), login);

export default router;

