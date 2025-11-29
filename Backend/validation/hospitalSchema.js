// validation/hospitalSchema.js
import { z } from "zod";

export const hospitalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email"),  // required
  licenseNumber: z.string().min(1, "License number is required")
});

export const hospitalVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6)
});
