import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const hospitalTenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: String,
    state: String,
    country: { type: String, default: "India" },
    phone: String,
    email: { type: String, required: true },
    licenseNumber: { type: String, required: true, unique: true },

    tenantId: { type: String, default: () => uuidv4(), unique: true },

    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "ACTIVE", "SUSPENDED", "INACTIVE"],
      default: "PENDING",
    },

    adminEmail: { type: String }, // auto-generated
    adminPassword: { type: String }, // hashed password
    verificationCode: String,
    verificationExpiry: Date,
  },
  { timestamps: true }
);

export default mongoose.model("HospitalTenant", hospitalTenantSchema);
