import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token = null;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token required. Please sign in."
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId = decoded.userId || decoded.id;

    const user = await User.findById(userId).select(
      "-password -verificationToken -verificationExpires"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User session invalid or user deleted."
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated."
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session token."
    });
  }
};

export const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    const userRole = (req.user.role || "").toLowerCase();
    const normalizedRoles = roles.map((r) => r.toLowerCase());

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of roles: ${roles.join(", ")}`
      });
    }

    next();
  };
};

export const authMiddleware = protect;
export const roleMiddleware = allowRoles;
