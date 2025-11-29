import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },

    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: [
        "administrator",
        "doctor",
        "nurse",
        "pharmacist",
        "receptionist"
      ],
      required: true,
    },

    isVerified: { type: Boolean, default: false },

    verificationCode: String,
    verificationExpiry: Date,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
