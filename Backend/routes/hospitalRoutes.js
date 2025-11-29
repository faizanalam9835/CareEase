// routes/hospitalRoutes.js
import express from "express";
import { registerHospitalTenant , verify } from "../controllers/hospitalController.js";
import { validate } from "../middleware/validate.js";
import { hospitalSchema, hospitalVerifySchema } from "../validation/hospitalSchema.js";

const router = express.Router();

// Register hospital
router.post("/register", validate(hospitalSchema), registerHospitalTenant);

// Verify hospital code (optional)
router.post("/verify", validate(hospitalVerifySchema), verify);

export default router;
