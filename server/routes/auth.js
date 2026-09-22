import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";

import User from "../models/User.js";
import { protect } from "../middleweare/auth.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const emailConfigured = Boolean(
  process.env.EMAIL_HOST &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS &&
  !process.env.EMAIL_PASS.includes("your-")
);

const sendEmail = async (message) => {
  if (!emailConfigured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email service is not configured.");
    }

    console.log(`Development verification URL: ${message.html.match(/href="([^"]+)/)?.[1] || "unavailable"}`);
    return;
  }

  await transporter.sendMail(message);
};

const generateEmployeeId = () => {
  return `EMP-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
};

const generateJWT = (userId) => {
  return jwt.sign(
    {
      userId
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d"
    }
  );
};

const setCookie = (res, token) => {
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax",
    maxAge: 24 * 60 * 60 * 1000
  });
};

const cleanUser = (user) => ({
  id: user._id,
  employeeId: user.employeeId,
  name: user.name,
  email: user.email,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  isActive: user.isActive,
  createdAt: user.createdAt
});

/*
  SIGNUP
  Public signup ALWAYS creates a worker.
  User cannot choose CEO or Manager from frontend.
*/
router.post("/signup", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required."
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must contain at least 2 characters."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters."
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    const rawToken = crypto
      .randomBytes(32)
      .toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const user = await User.create({
      employeeId: generateEmployeeId(),
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,

      // NEVER accept role from public signup.
      role: "worker",

      isEmailVerified: false,

      verificationToken: hashedToken,

      verificationExpires: new Date(
        Date.now() + 15 * 60 * 1000
      )
    });

    const verificationUrl =
      `${process.env.CLIENT_URL}/verify-email` +
      `?token=${rawToken}` +
      `&email=${encodeURIComponent(user.email)}`;

    try {
      await sendEmail({
        from: `"Workforce Management" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Verify your Workforce account",
        html: `
          <!DOCTYPE html>
          <html>
          <body style="
            margin:0;
            padding:0;
            background:#f5f7fa;
            font-family:Arial,sans-serif;
          ">
            <div style="
              max-width:600px;
              margin:40px auto;
              background:#ffffff;
              padding:40px;
              border-radius:16px;
            ">
              <h1 style="color:#111827;">
                Welcome to Workforce
              </h1>

              <p style="
                color:#6b7280;
                line-height:1.7;
              ">
                Hi ${user.name}, please verify your
                email address to activate your account.
              </p>

              <a
                href="${verificationUrl}"
                style="
                  display:inline-block;
                  background:#111827;
                  color:white;
                  text-decoration:none;
                  padding:14px 22px;
                  border-radius:10px;
                  font-weight:bold;
                  margin:20px 0;
                "
              >
                Verify Email
              </a>

              <p style="
                color:#9ca3af;
                font-size:13px;
              ">
                This verification link expires in 15 minutes.
              </p>
            </div>
          </body>
          </html>
        `
      });
    } catch (emailError) {
      await User.findByIdAndDelete(user._id);

      console.error(emailError);

      return res.status(500).json({
        success: false,
        message:
          "Unable to send verification email."
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Account created. Check your email to verify your account."
    });
  } catch (error) {
    console.error("Signup error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account."
    });
  }
});

/*
  VERIFY EMAIL
*/
router.post("/verify-email", async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification request."
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      email: email.trim().toLowerCase(),

      verificationToken: hashedToken,

      verificationExpires: {
        $gt: new Date()
      }
    }).select(
      "+verificationToken +verificationExpires"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Verification link is invalid or expired."
      });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully. You can now login."
    });
  } catch (error) {
    console.error("Verify error:", error);

    return res.status(500).json({
      success: false,
      message: "Email verification failed."
    });
  }
});

/*
  RESEND VERIFICATION
*/
router.post(
  "/resend-verification",
  authLimiter,
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required."
        });
      }

      const user = await User.findOne({
        email: email.trim().toLowerCase()
      }).select(
        "+verificationToken +verificationExpires"
      );

      if (!user || user.isEmailVerified) {
        return res.status(200).json({
          success: true,
          message:
            "If the account exists and needs verification, an email has been sent."
        });
      }

      const rawToken = crypto
        .randomBytes(32)
        .toString("hex");

      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      user.verificationToken = hashedToken;

      user.verificationExpires = new Date(
        Date.now() + 15 * 60 * 1000
      );

      await user.save();

      const verificationUrl =
        `${process.env.CLIENT_URL}/verify-email` +
        `?token=${rawToken}` +
        `&email=${encodeURIComponent(user.email)}`;

      await sendEmail({
        from: `"Workforce Management" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Verify your Workforce account",
        html: `
          <h2>Verify your Workforce account</h2>
          <p>Hello ${user.name},</p>

          <p>
            Click the button below to verify your email.
          </p>

          <a href="${verificationUrl}">
            Verify Email
          </a>

          <p>
            This link expires in 15 minutes.
          </p>
        `
      });

      return res.status(200).json({
        success: true,
        message: "Verification email sent."
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Unable to resend verification email."
      });
    }
  }
);

/*
  LOGIN
*/
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required."
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

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Please verify your email before logging in."
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive."
      });
    }

    const token = generateJWT(
      user._id.toString()
    );

    setCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: cleanUser(user)
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login."
    });
  }
});

/*
  CURRENT USER
*/
router.get("/me", protect, async (req, res) => {
  return res.status(200).json({
    success: true,
    user: cleanUser(req.user)
  });
});

/*
  LOGOUT
*/
router.post("/logout", (req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax"
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
});

export default router;