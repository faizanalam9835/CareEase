import { registerHospital } from "../services/hospitalService.js";
import HospitalTenant from "../models/Hospital.js";


// controllers/hospitalController.js


export const registerHospitalTenant = async (req, res) => {
  try {
    const { name, address, city, state, phone, email, licenseNumber } = req.body;

    const { tenant, adminEmail, adminPassword } = await registerHospital({
      name,
      address,
      city,
      state,
      phone,
      email,
      licenseNumber,
      clientUrl: process.env.CLIENT_URL
    });

    res.status(201).json({
      success: true,
      message: "Hospital registered. Verification email sent.",
      tenantId: tenant.tenantId,
      adminEmail,
      adminPassword
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};



export const verify = async (req, res) => {
    try {
      const { email, code } = req.body;
  
      const tenant = await HospitalTenant.findOne({ email });
      if (!tenant) return res.status(400).json({ success:false, message:"Invalid email" });
  
      if (tenant.verificationCode !== code) return res.status(400).json({ success:false, message:"Invalid code" });
      if (tenant.verificationExpiry < Date.now()) return res.status(400).json({ success:false, message:"Code expired" });
  
      tenant.status = "VERIFIED";
      tenant.verificationCode = null;
      tenant.verificationExpiry = null;
  
      await tenant.save();
  
      res.json({ success:true, message:"Hospital verified successfully", tenantId: tenant.tenantId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success:false, message:"Server error" });
    }
  };
  