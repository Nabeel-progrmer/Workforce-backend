const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const {
  createWorker,
  getWorkers,
  getWorker,
  updateWorker,
  deactivateWorker,
  activateWorker,
} = require("../controllers/workerController");

const router = express.Router();

// =========================
// CREATE WORKER
// =========================

router.post(
  "/",
  authMiddleware,
  allowRoles("CEO", "Manager"),
  createWorker
);

// =========================
// GET ALL WORKERS
// =========================

router.get(
  "/",
  authMiddleware,
  allowRoles("CEO", "Manager"),
  getWorkers
);

// =========================
// GET SINGLE WORKER
// =========================

router.get(
  "/:id",
  authMiddleware,
  allowRoles("CEO", "Manager"),
  getWorker
);

// =========================
// UPDATE WORKER
// =========================

router.put(
  "/:id",
  authMiddleware,
  allowRoles("CEO", "Manager"),
  updateWorker
);

// =========================
// DEACTIVATE WORKER
// =========================

router.patch(
  "/:id/deactivate",
  authMiddleware,
  allowRoles("CEO", "Manager"),
  deactivateWorker
);

// =========================
// ACTIVATE WORKER
// =========================

router.patch(
  "/:id/activate",
  authMiddleware,
  allowRoles("CEO", "Manager"),
  activateWorker
);

module.exports = router;