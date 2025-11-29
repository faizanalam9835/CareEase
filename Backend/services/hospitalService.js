import bcrypt from "bcryptjs";
import HospitalTenant from "../models/Hospital.js";
import { sendEmail } from "../utils/sendEmail.js";
import { v4 as uuidv4 } from "uuid";


export const registerHospital = async ({
    name,
    address,
    city,
    state,
    phone,
    email,
    licenseNumber,
    clientUrl
  }) => {
    if (!email) throw new Error("Hospital email is required");
  
    // Check unique license
    const exists = await HospitalTenant.findOne({ licenseNumber });
    if (exists) throw new Error("License already registered");
  
    // Generate tenantId
    const tenantId = uuidv4();
  
    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
    // Auto-generate admin credentials
    const domain = email.split("@")[1];
    const adminEmail = `admin@${domain}`;
    const adminPasswordPlain = Math.random().toString(36).slice(-8);
    const adminPasswordHashed = await bcrypt.hash(adminPasswordPlain, 10);
  
    // Create tenant
    const tenant = await HospitalTenant.create({
      tenantId,
      name,
      address,
      city,
      state,
      phone,
      email,
      licenseNumber,
      adminEmail,
      adminPassword: adminPasswordHashed,
      verificationCode,
      verificationExpiry: Date.now() + 10 * 60 * 1000, // 10 minutes
      status: "PENDING"
    });
  
    // Send verification email
    const activationLink = `${clientUrl}/activate?email=${tenant.email}&code=${verificationCode}`;
  
    await sendEmail({
      to: tenant.email,
      subject: "Verify Your Hospital Account",
      html: `<p>Hi ${name},</p>
             <p>Your verification code is <strong>${verificationCode}</strong></p>
             <p>Or click <a href="${activationLink}">here</a> to verify your hospital</p>
             <p>Admin credentials (one-time password):</p>
             <p>Email: <strong>${adminEmail}</strong></p>
             <p>Password: <strong>${adminPasswordPlain}</strong></p>`
    });
  
    return {
      tenant,
      adminEmail,
      adminPassword: adminPasswordPlain
    };
  };
  
