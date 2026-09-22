const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const {
  getProfile,
  getManagementData,
  getCEOData,
} = require("../controllers/userController");

const router = express.Router();

// =========================
// ALL LOGGED-IN USERS
// =========================

router.get(
  "/profile",
  authMiddleware,
  getProfile
);

// =========================
// CEO + MANAGER
// =========================

router.get(
  "/management",
  authMiddleware,
  allowRoles("CEO", "Manager"),
  getManagementData
);

// =========================
// CEO ONLY
// =========================

router.get(
  "/ceo",
  authMiddleware,
  allowRoles("CEO"),
  getCEOData
);

module.exports = router;