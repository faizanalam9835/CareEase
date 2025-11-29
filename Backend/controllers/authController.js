import * as AuthService from "../services/authService.js";

export const register = async (req, res) => {
  try {
    const user = await AuthService.registerUser(req.body);
    res.json({ message: "User registered. Please verify email.", userId: user._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const verify = async (req, res) => {
  try {
    const user = await AuthService.verifyUser(req.body.email, req.body.code);
    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const data = await AuthService.loginUser(req.body.email, req.body.password);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
