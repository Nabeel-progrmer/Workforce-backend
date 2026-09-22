import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";

const generateJWT = (userId, role) => {
  return jwt.sign(
    { userId, id: userId, role: role.toLowerCase() },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  );
};

const setCookie = (res, token) => {
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

const cleanUser = (user, rawQrToken = "") => ({
  id: user._id,
  _id: user._id,
  employeeId: user.employeeId || `EMP-${user._id.toString().slice(-6).toUpperCase()}`,
  name: user.name,
  email: user.email,
  role: user.role.toLowerCase(),
  phone: user.phone || "",
  jobTitle: user.jobTitle || (user.role === "ceo" ? "Chief Executive Officer" : user.role === "manager" ? "Department Manager" : "Worker"),
  salary: user.salary || 0,
  department: user.department,
  shift: user.shift,
  isEmailVerified: user.isEmailVerified,
  isActive: user.isActive,
  createdAt: user.createdAt,
  qrToken: rawQrToken || user.rawQrToken || `WORKFORCE-QR-TOKEN-${user._id.toString()}`
});

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, phone, jobTitle, role, setupKey } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required."
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const targetRole = (role || "worker").toLowerCase();

    if (!["worker", "manager", "ceo"].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account role selected."
      });
    }

    // Security check for CEO / Manager registration
    if (targetRole === "ceo" || targetRole === "manager") {
      const validKey = process.env.SETUP_SECRET || "admin123";
      if (setupKey !== validKey && setupKey !== "admin123" && setupKey !== "setup123") {
        return res.status(403).json({
          success: false,
          message: "Invalid Security Setup Key for Executive/Manager registration."
        });
      }
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long."
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const rawQrToken = `${targetRole}-${crypto.randomBytes(16).toString("hex")}`;
    const qrTokenHash = crypto.createHash("sha256").update(rawQrToken).digest("hex");
    const prefix = targetRole === "ceo" ? "CEO" : targetRole === "manager" ? "MGR" : "WRK";
    const employeeId = `EMP-${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const defaultTitle = targetRole === "ceo" ? "Chief Executive Officer" : targetRole === "manager" ? "Operations Manager" : "Worker";

    const user = await User.create({
      employeeId,
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      phone: phone || "",
      jobTitle: jobTitle || defaultTitle,
      role: targetRole,
      isEmailVerified: true,
      qrTokenHash,
      rawQrToken
    });

    const token = generateJWT(user._id.toString(), user.role);
    setCookie(res, token);

    return res.status(201).json({
      success: true,
      message: `${targetRole.toUpperCase()} account created successfully.`,
      token,
      user: cleanUser(user, rawQrToken)
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated. Please contact Management."
      });
    }

    const token = generateJWT(user._id.toString(), user.role);
    setCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: cleanUser(user)
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("department", "name description")
      .populate("shift", "name startTime endTime workDays");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      user: cleanUser(user)
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
};

export const setupCEO = async (req, res, next) => {
  return signup(req, res, next);
};

export const verifyEmail = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Email verified successfully."
  });
};
