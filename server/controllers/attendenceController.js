const Attendance = require("../models/Attendance");
const User = require("../models/User");

// =========================
// HELPER
// =========================

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

// =========================
// CHECK IN
// WORKER ONLY
// =========================

const checkIn = async (req, res) => {
  try {
    const worker = await User.findById(req.user.id);

    if (!worker) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (worker.role !== "Worker") {
      return res.status(403).json({
        message: "Only workers can check in",
      });
    }

    if (!worker.isActive) {
      return res.status(403).json({
        message: "Your account is inactive",
      });
    }

    const today = getToday();

    const existingAttendance = await Attendance.findOne({
      worker: worker._id,
      date: today,
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: "You have already checked in today",
      });
    }

    const attendance = await Attendance.create({
      worker: worker._id,
      date: today,
      checkIn: new Date(),
      status: "Present",
    });

    res.status(201).json({
      message: "Check-in successful",
      attendance,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// CHECK OUT
// WORKER ONLY
// =========================

const checkOut = async (req, res) => {
  try {
    const worker = await User.findById(req.user.id);

    if (!worker) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (worker.role !== "Worker") {
      return res.status(403).json({
        message: "Only workers can check out",
      });
    }

    const today = getToday();

    const attendance = await Attendance.findOne({
      worker: worker._id,
      date: today,
    });

    if (!attendance) {
      return res.status(400).json({
        message: "You have not checked in today",
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        message: "You have already checked out today",
      });
    }

    attendance.checkOut = new Date();
    attendance.status = "Completed";

    await attendance.save();

    res.json({
      message: "Check-out successful",
      attendance,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// MY TODAY ATTENDANCE
// WORKER
// =========================

const getMyTodayAttendance = async (req, res) => {
  try {
    const today = getToday();

    const attendance = await Attendance.findOne({
      worker: req.user.id,
      date: today,
    });

    if (!attendance) {
      return res.json({
        message: "No attendance found for today",
        attendance: null,
      });
    }

    res.json({
      message: "Today's attendance fetched",
      attendance,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// MY ATTENDANCE HISTORY
// WORKER
// =========================

const getMyAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({
      worker: req.user.id,
    }).sort({
      date: -1,
    });

    res.json({
      message: "Attendance history fetched",
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// ALL ATTENDANCE
// CEO + MANAGER
// =========================

const getAllAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate("worker", "name email role")
      .sort({
        date: -1,
        checkIn: -1,
      });

    res.json({
      message: "All attendance fetched",
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// WORKER ATTENDANCE
// CEO + MANAGER
// =========================

const getWorkerAttendance = async (req, res) => {
  try {
    const { workerId } = req.params;

    const worker = await User.findOne({
      _id: workerId,
      role: "Worker",
    });

    if (!worker) {
      return res.status(404).json({
        message: "Worker not found",
      });
    }

    const attendance = await Attendance.find({
      worker: workerId,
    }).sort({
      date: -1,
    });

    res.json({
      message: "Worker attendance fetched",
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
      },
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getMyTodayAttendance,
  getMyAttendance,
  getAllAttendance,
  getWorkerAttendance,
};