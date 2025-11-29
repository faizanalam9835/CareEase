import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import { generateToken } from "../utils/generateToken.js";

export const registerUser = async ({ name, email, password, role, hospital }) => {

  const exists = await User.findOne({ email });
  if (exists) throw new Error("Email already exists");

  const hashedPassword = await bcrypt.hash(password, 10);

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    hospital,
    verificationCode: code,
    verificationExpiry: Date.now() + 10 * 60 * 1000 
  });

  await sendEmail(
    user.email,
    "Verify Your HMS Account",
    `<p>Your verification code is: <strong>${code}</strong></p>`
  );

  return user;
};

export const verifyUser = async (email, code) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid email");

  if (user.verificationCode !== code)
    throw new Error("Invalid verification code");

  if (user.verificationExpiry < Date.now())
    throw new Error("Code expired");

  user.isVerified = true;
  user.verificationCode = null;
  user.verificationExpiry = null;

  await user.save();

  return user;
};

export const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid email or password");

  if (!user.isVerified) throw new Error("Email not verified");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Invalid email or password");

  const token = generateToken(user);

  return { user, token };
};
