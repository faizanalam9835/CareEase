import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      hospital: user.hospital
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

