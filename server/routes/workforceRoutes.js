import express from "express";
import {
  getWorkers,
  createWorker,
  updateWorker,
  deactivateWorker,
  activateWorker,
  getDepartments,
  createDepartment,
  updateDepartment,
  assignDepartmentWorkers,
  getShifts,
  createShift,
  updateShift,
  checkIn,
  checkOut,
  getMyAttendance,
  getAllAttendance,
  createLeave,
  getMyLeaves,
  getLeaves,
  reviewLeave,
  createTask,
  getTasks,
  getMyTasks,
  updateTaskStatus,
  updateTask,
  createPayroll,
  getPayroll,
  getMyPayroll,
  updatePayroll,
  getNotifications,
  markNotificationRead,
  dashboard
} from "../controllers/workforceController.js";
import { getMe, updateProfileAvatar } from "../controllers/authController.js";
import { protect, allowRoles } from "../middleware/auth.js";

const router = express.Router();

/* All routes require authentication */
router.use(protect);

/* PROFILE */
router.get("/profile", getMe);
router.patch("/profile/avatar", updateProfileAvatar);

/* METRICS / DASHBOARD */
router.get("/dashboard", allowRoles("ceo", "manager"), dashboard);

/* WORKERS */
router.get("/workers", allowRoles("ceo", "manager"), getWorkers);
router.post("/workers", allowRoles("ceo", "manager"), createWorker);
router.put("/workers/:id", allowRoles("ceo", "manager"), updateWorker);
router.patch("/workers/:id/deactivate", allowRoles("ceo", "manager"), deactivateWorker);
router.patch("/workers/:id/activate", allowRoles("ceo", "manager"), activateWorker);

/* DEPARTMENTS */
router.get("/departments", getDepartments);
router.post("/departments", allowRoles("ceo", "manager"), createDepartment);
router.put("/departments/:id", allowRoles("ceo", "manager"), updateDepartment);
router.put("/departments/:id/workers", allowRoles("ceo", "manager"), assignDepartmentWorkers);

/* SHIFTS */
router.get("/shifts", getShifts);
router.post("/shifts", allowRoles("ceo", "manager"), createShift);
router.put("/shifts/:id", allowRoles("ceo", "manager"), updateShift);

/* ATTENDANCE */
router.post("/attendance/check-in", checkIn);
router.post("/attendance/check-out", checkOut);
router.get("/attendance/my", getMyAttendance);
router.get("/attendance", allowRoles("ceo", "manager"), getAllAttendance);

/* LEAVES */
router.post("/leaves", createLeave);
router.get("/leaves/my", getMyLeaves);
router.get("/leaves", allowRoles("ceo", "manager"), getLeaves);
router.patch("/leaves/:id/review", allowRoles("ceo", "manager"), reviewLeave);

/* TASKS */
router.post("/tasks", allowRoles("ceo", "manager"), createTask);
router.get("/tasks", allowRoles("ceo", "manager"), getTasks);
router.get("/tasks/my", getMyTasks);
router.patch("/tasks/:id/status", updateTaskStatus);
router.put("/tasks/:id", allowRoles("ceo", "manager"), updateTask);

/* PAYROLL */
router.post("/payroll", allowRoles("ceo", "manager"), createPayroll);
router.get("/payroll", allowRoles("ceo", "manager"), getPayroll);
router.get("/payroll/my", getMyPayroll);
router.put("/payroll/:id", allowRoles("ceo", "manager"), updatePayroll);

/* NOTIFICATIONS */
router.get("/notifications", getNotifications);
router.patch("/notifications/:id/read", markNotificationRead);

export default router;
