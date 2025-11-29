import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum([
    "administrator",
    "doctor", 
    "nurse",
    "pharmacist",
    "receptionist", 
  ]),
  hospital: z.string().min(1, "Hospital ID is required")
});

export const verifySchema = z.object({
  email: z.string().email("Invalid email"),
  code: z.string().length(6, "Verification code must be 6 digits")
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});
