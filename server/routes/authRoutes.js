import express from "express";
import {
  signup,
  login,
  getMe,
  logout,
  setupCEO,
  verifyEmail
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/setup-ceo", setupCEO);
router.post("/verify-email", verifyEmail);
router.get("/me", protect, getMe);
router.post("/logout", logout);

export default router;