const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const {
  checkIn,
  checkOut,
  getMyTodayAttendance,
  getMyAttendance,
  getAllAttendance,
  getWorkerAttendance,
} = require("../controllers/attendanceController");

const router = express.Router();

// =========================
// WORKER CHECK IN
// =========================

router.post(
  "/check-in",
  authMiddleware,
  allowRoles("Worker"),
  checkIn
);

// =========================
// WORKER CHECK OUT
// =========================

router.post(
  "/check-out",
  authMiddleware,
  allowRoles("Worker"),
  checkOut
);

// =========================
// MY TODAY ATTENDANCE
// =========================

router.get(
  "/today",
  authMiddleware,
  allowRoles("Worker"),
  getMyTodayAttendance
);

// =========================
// MY ATTENDANCE HISTORY
// =========================

router.get(
  "/my",
  authMiddleware,
  allowRoles("Worker"),
  getMyAttendance
);

// =========================
// ALL ATTENDANCE
// CEO + MANAGER
// =========================

router.get(
  "/",
  authMiddleware,
  allowRoles("CEO", "Manager"),
  getAllAttendance
);

// =========================
// SPECIFIC WORKER ATTENDANCE
// CEO + MANAGER
// =========================

router.get(
  "/worker/:workerId",
  authMiddleware,
  allowRoles("CEO", "Manager"),
  getWorkerAttendance
);

module.exports = router;