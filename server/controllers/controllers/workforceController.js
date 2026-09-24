const crypto = require("crypto");
const mongoose = require("mongoose");

const User = require("../models/User");
const Department = require("../models/Department");
const Shift = require("../models/Shift");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Task = require("../models/Task");
const Payroll = require("../models/Payroll");
const Notification = require("../models/Notification");

const today = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.TIMEZONE || "Asia/Karachi"
  }).format(new Date());
};

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

const notify = async (
  recipient,
  title,
  message,
  type = "General"
) => {
  try {
    await Notification.create({
      recipient,
      title,
      message,
      type
    });
  } catch (error) {
    console.error("Notification error:", error.message);
  }
};

/* =========================
   PROFILE
========================= */

exports.profile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -qrTokenHash")
      .populate("department", "name")
      .populate("shift", "name startTime endTime");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   USERS / WORKERS
========================= */

exports.getWorkers = async (req, res, next) => {
  try {
    const workers = await User.find({
      role: "Worker"
    })
      .select("-password -qrTokenHash")
      .populate("department", "name")
      .populate("shift", "name startTime endTime")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: workers.length,
      workers
    });
  } catch (error) {
    next(error);
  }
};

exports.createWorker = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      jobTitle,
      department,
      shift,
      salary
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required"
      });
    }

    const exists = await User.findOne({
      email: email.toLowerCase()
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }

    const bcrypt = require("bcryptjs");

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    const qrToken = crypto.randomBytes(32).toString("hex");

    const qrTokenHash = crypto
      .createHash("sha256")
      .update(qrToken)
      .digest("hex");

    const worker = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      jobTitle,
      department: department || null,
      shift: shift || null,
      salary: Number(salary) || 0,
      role: "Worker",
      qrTokenHash
    });

    res.status(201).json({
      success: true,
      message: "Worker created",
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        role: worker.role,
        qrToken
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateWorker = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID"
      });
    }

    const worker = await User.findOne({
      _id: id,
      role: "Worker"
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found"
      });
    }

    const allowed = [
      "name",
      "phone",
      "jobTitle",
      "department",
      "shift",
      "salary"
    ];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        worker[field] = req.body[field];
      }
    });

    await worker.save();

    res.json({
      success: true,
      message: "Worker updated",
      worker: await User.findById(id)
        .select("-password -qrTokenHash")
        .populate("department", "name")
        .populate("shift", "name startTime endTime")
    });
  } catch (error) {
    next(error);
  }
};

exports.deactivateWorker = async (req, res, next) => {
  try {
    const worker = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "Worker"
      },
      {
        isActive: false
      },
      {
        new: true
      }
    ).select("-password -qrTokenHash");

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found"
      });
    }

    res.json({
      success: true,
      message: "Worker deactivated",
      worker
    });
  } catch (error) {
    next(error);
  }
};

exports.activateWorker = async (req, res, next) => {
  try {
    const worker = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "Worker"
      },
      {
        isActive: true
      },
      {
        new: true
      }
    ).select("-password -qrTokenHash");

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found"
      });
    }

    res.json({
      success: true,
      message: "Worker activated",
      worker
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   DEPARTMENTS
========================= */

exports.createDepartment = async (req, res, next) => {
  try {
    const { name, description, manager } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Department name is required"
      });
    }

    if (manager) {
      const managerUser = await User.findOne({
        _id: manager,
        role: "Manager",
        isActive: true
      });

      if (!managerUser) {
        return res.status(400).json({
          success: false,
          message: "Invalid manager"
        });
      }
    }

    const department = await Department.create({
      name,
      description,
      manager: manager || null
    });

    res.status(201).json({
      success: true,
      department
    });
  } catch (error) {
    next(error);
  }
};

exports.getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find()
      .populate("manager", "name email")
      .sort({ name: 1 });

    res.json({
      success: true,
      departments
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(
      req.params.id
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    const { name, description, manager, isActive } =
      req.body;

    if (name !== undefined) department.name = name;
    if (description !== undefined)
      department.description = description;
    if (isActive !== undefined)
      department.isActive = isActive;

    if (manager !== undefined) {
      if (manager) {
        const managerUser = await User.findOne({
          _id: manager,
          role: "Manager",
          isActive: true
        });

        if (!managerUser) {
          return res.status(400).json({
            success: false,
            message: "Invalid manager"
          });
        }
      }

      department.manager = manager || null;
    }

    await department.save();

    res.json({
      success: true,
      department
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   SHIFTS
========================= */

exports.createShift = async (req, res, next) => {
  try {
    const {
      name,
      startTime,
      endTime,
      workDays
    } = req.body;

    if (!name || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Name, start time and end time are required"
      });
    }

    const shift = await Shift.create({
      name,
      startTime,
      endTime,
      workDays
    });

    res.status(201).json({
      success: true,
      shift
    });
  } catch (error) {
    next(error);
  }
};

exports.getShifts = async (req, res, next) => {
  try {
    const shifts = await Shift.find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      shifts
    });
  } catch (error) {
    next(error);
  }
};

exports.updateShift = async (req, res, next) => {
  try {
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found"
      });
    }

    res.json({
      success: true,
      shift
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   ATTENDANCE
========================= */

// Worker QR check-in
exports.checkIn = async (req, res, next) => {
  try {
    const { qrToken } = req.body;

    if (!qrToken) {
      return res.status(400).json({
        success: false,
        message: "QR token is required"
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(qrToken)
      .digest("hex");

    const worker = await User.findOne({
      qrTokenHash: tokenHash,
      role: "Worker",
      isActive: true
    }).select("+qrTokenHash");

    if (!worker) {
      return res.status(401).json({
        success: false,
        message: "Invalid QR code"
      });
    }

    const date = today();

    const existing = await Attendance.findOne({
      worker: worker._id,
      date
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Attendance already checked in today",
        attendance: existing
      });
    }

    const attendance = await Attendance.create({
      worker: worker._id,
      date,
      checkIn: new Date(),
      status: "Present",
      checkInMethod: "QR"
    });

    res.status(201).json({
      success: true,
      message: "Check-in successful",
      attendance
    });
  } catch (error) {
    next(error);
  }
};

exports.checkOut = async (req, res, next) => {
  try {
    const worker = await User.findById(req.user.id);

    if (!worker || worker.role !== "Worker") {
      return res.status(403).json({
        success: false,
        message: "Worker access required"
      });
    }

    const attendance = await Attendance.findOne({
      worker: worker._id,
      date: today()
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Check-in not found"
      });
    }

    if (attendance.checkOut) {
      return res.status(409).json({
        success: false,
        message: "Already checked out"
      });
    }

    attendance.checkOut = new Date();
    attendance.status = "Completed";

    await attendance.save();

    res.json({
      success: true,
      message: "Check-out successful",
      attendance
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyAttendance = async (req, res, next) => {
  try {
    const records = await Attendance.find({
      worker: req.user.id
    }).sort({ date: -1 });

    res.json({
      success: true,
      attendance: records
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllAttendance = async (req, res, next) => {
  try {
    const records = await Attendance.find()
      .populate(
        "worker",
        "name email department"
      )
      .sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      attendance: records
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   LEAVE
========================= */

exports.createLeave = async (req, res, next) => {
  try {
    const {
      type,
      startDate,
      endDate,
      reason
    } = req.body;

    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "All leave fields are required"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave dates"
      });
    }

    const overlap = await Leave.findOne({
      worker: req.user.id,
      status: {
        $in: ["Pending", "Approved"]
      },
      startDate: {
        $lte: end
      },
      endDate: {
        $gte: start
      }
    });

    if (overlap) {
      return res.status(409).json({
        success: false,
        message: "Leave dates overlap with an existing request"
      });
    }

    const leave = await Leave.create({
      worker: req.user.id,
      type,
      startDate: start,
      endDate: end,
      reason
    });

    res.status(201).json({
      success: true,
      message: "Leave request submitted",
      leave
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyLeaves = async (req, res, next) => {
  try {
    const leaves = await Leave.find({
      worker: req.user.id
    })
      .populate("reviewedBy", "name role")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      leaves
    });
  } catch (error) {
    next(error);
  }
};

exports.getLeaves = async (req, res, next) => {
  try {
    const leaves = await Leave.find()
      .populate("worker", "name email department")
      .populate("reviewedBy", "name role")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      leaves
    });
  } catch (error) {
    next(error);
  }
};

exports.reviewLeave = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Approved or Rejected"
      });
    }

    const leave = await Leave.findById(
      req.params.id
    );

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found"
      });
    }

    if (leave.status !== "Pending") {
      return res.status(409).json({
        success: false,
        message: "Leave has already been reviewed"
      });
    }

    leave.status = status;
    leave.reviewedBy = req.user.id;
    leave.reviewNote = reviewNote || "";

    await leave.save();

    await notify(
      leave.worker,
      `Leave ${status}`,
      `Your leave request has been ${status.toLowerCase()}.`,
      "Leave"
    );

    res.json({
      success: true,
      message: `Leave ${status.toLowerCase()}`,
      leave
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   TASKS
========================= */

exports.createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      assignedTo,
      priority,
      dueDate
    } = req.body;

    if (!title || !assignedTo) {
      return res.status(400).json({
        success: false,
        message: "Title and assigned worker are required"
      });
    }

    const worker = await User.findOne({
      _id: assignedTo,
      role: "Worker",
      isActive: true
    });

    if (!worker) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker"
      });
    }

    const task = await Task.create({
      title,
      description,
      assignedTo,
      assignedBy: req.user.id,
      priority,
      dueDate: dueDate || null
    });

    await notify(
      assignedTo,
      "New Task",
      `You have been assigned: ${title}`,
      "Task"
    );

    res.status(201).json({
      success: true,
      task
    });
  } catch (error) {
    next(error);
  }
};

exports.getTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find()
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name role")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({
      assignedTo: req.user.id
    })
      .populate("assignedBy", "name role")
      .sort({ dueDate: 1, createdAt: -1 });

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (
      !["Todo", "In Progress", "Completed"].includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status"
      });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      assignedTo: req.user.id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    task.status = status;

    await task.save();

    res.json({
      success: true,
      task
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(
      req.params.id
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    const allowed = [
      "title",
      "description",
      "assignedTo",
      "priority",
      "status",
      "dueDate"
    ];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    await task.save();

    res.json({
      success: true,
      task
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   PAYROLL
========================= */

exports.createPayroll = async (req, res, next) => {
  try {
    const {
      worker,
      month,
      year,
      baseSalary,
      bonus = 0,
      deductions = 0
    } = req.body;

    if (
      !worker ||
      !month ||
      !year ||
      baseSalary === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Worker, month, year and salary are required"
      });
    }

    const workerUser = await User.findOne({
      _id: worker,
      role: "Worker"
    });

    if (!workerUser) {
      return res.status(404).json({
        success: false,
        message: "Worker not found"
      });
    }

    const netSalary =
      Number(baseSalary) +
      Number(bonus) -
      Number(deductions);

    if (netSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Net salary cannot be negative"
      });
    }

    const payroll = await Payroll.create({
      worker,
      month,
      year,
      baseSalary,
      bonus,
      deductions,
      netSalary
    });

    await notify(
      worker,
      "Payroll Created",
      `Your payroll for ${month}/${year} has been created.`,
      "Payroll"
    );

    res.status(201).json({
      success: true,
      payroll
    });
  } catch (error) {
    next(error);
  }
};

exports.getPayroll = async (req, res, next) => {
  try {
    const payroll = await Payroll.find()
      .populate("worker", "name email salary")
      .sort({ year: -1, month: -1 });

    res.json({
      success: true,
      payroll
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyPayroll = async (req, res, next) => {
  try {
    const payroll = await Payroll.find({
      worker: req.user.id
    }).sort({
      year: -1,
      month: -1
    });

    res.json({
      success: true,
      payroll
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePayroll = async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(
      req.params.id
    );

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found"
      });
    }

    const {
      baseSalary,
      bonus,
      deductions,
      status
    } = req.body;

    if (baseSalary !== undefined)
      payroll.baseSalary = Number(baseSalary);

    if (bonus !== undefined)
      payroll.bonus = Number(bonus);

    if (deductions !== undefined)
      payroll.deductions = Number(deductions);

    if (status !== undefined) {
      if (!["Pending", "Paid"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payroll status"
        });
      }

      payroll.status = status;

      if (status === "Paid") {
        payroll.paidAt = new Date();
      }
    }

    payroll.netSalary =
      payroll.baseSalary +
      payroll.bonus -
      payroll.deductions;

    if (payroll.netSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Net salary cannot be negative"
      });
    }

    await payroll.save();

    res.json({
      success: true,
      payroll
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   NOTIFICATIONS
========================= */

exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.id
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

exports.markNotificationRead = async (
  req,
  res,
  next
) => {
  try {
    const notification =
      await Notification.findOneAndUpdate(
        {
          _id: req.params.id,
          recipient: req.user.id
        },
        {
          isRead: true
        },
        {
          new: true
        }
      );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   REPORTS
========================= */

exports.dashboard = async (req, res, next) => {
  try {
    const [
      totalWorkers,
      activeWorkers,
      departments,
      shifts,
      todayAttendance,
      pendingLeaves,
      activeTasks,
      completedTasks,
      payrollPending
    ] = await Promise.all([
      User.countDocuments({ role: "Worker" }),
      User.countDocuments({
        role: "Worker",
        isActive: true
      }),
      Department.countDocuments({ isActive: true }),
      Shift.countDocuments({ isActive: true }),
      Attendance.countDocuments({
        date: today()
      }),
      Leave.countDocuments({
        status: "Pending"
      }),
      Task.countDocuments({
        status: {
          $ne: "Completed"
        }
      }),
      Task.countDocuments({
        status: "Completed"
      }),
      Payroll.countDocuments({
        status: "Pending"
      })
    ]);

    res.json({
      success: true,
      dashboard: {
        totalWorkers,
        activeWorkers,
        departments,
        shifts,
        todayAttendance,
        pendingLeaves,
        activeTasks,
        completedTasks,
        payrollPending
      }
    });
  } catch (error) {
    next(error);
  }
};