import crypto from "crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import User from "../models/User.js";
import Department from "../models/department.js";
import Shift from "../models/shift.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import Task from "../models/Task.js";
import Payroll from "../models/Payroll.js";
import Notification from "../models/Notification.js";

const getTodayString = () => {
  return new Date().toISOString().split("T")[0];
};

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

const notify = async (recipient, title, message, type = "General") => {
  try {
    await Notification.create({
      recipient,
      title,
      message,
      type
    });
  } catch (error) {
    console.error("Notification trigger error:", error.message);
  }
};

/* =========================================
   WORKERS / TEAM MANAGEMENT
   ========================================= */

export const getWorkers = async (req, res, next) => {
  try {
    const workers = await User.find({
      role: { $in: ["worker", "Worker"] }
    })
      .select("-password -qrTokenHash")
      .populate("department", "name description")
      .populate("shift", "name startTime endTime workDays")
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

export const createWorker = async (req, res, next) => {
  try {
    const { name, email, password, phone, jobTitle, department, shift, salary } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required"
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const exists = await User.findOne({ email: cleanEmail });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const rawQrToken = crypto.randomBytes(32).toString("hex");
    const qrTokenHash = crypto.createHash("sha256").update(rawQrToken).digest("hex");
    const employeeId = `EMP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const worker = await User.create({
      employeeId,
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      phone: phone || "",
      jobTitle: jobTitle || "Worker",
      department: department || null,
      shift: shift || null,
      salary: Number(salary) || 0,
      role: "worker",
      isEmailVerified: true,
      qrTokenHash,
      rawQrToken
    });

    res.status(201).json({
      success: true,
      message: "Worker created successfully",
      worker: {
        id: worker._id,
        _id: worker._id,
        employeeId: worker.employeeId,
        name: worker.name,
        email: worker.email,
        role: worker.role,
        jobTitle: worker.jobTitle,
        qrToken: rawQrToken
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorker = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID"
      });
    }

    const worker = await User.findById(id);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found"
      });
    }

    const fields = ["name", "phone", "jobTitle", "department", "shift", "salary", "role", "isActive"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        worker[f] = req.body[f];
      }
    });

    await worker.save();

    const updated = await User.findById(id)
      .select("-password -qrTokenHash")
      .populate("department", "name")
      .populate("shift", "name startTime endTime");

    res.json({
      success: true,
      message: "Worker updated successfully",
      worker: updated
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateWorker = async (req, res, next) => {
  try {
    const worker = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select("-password -qrTokenHash");

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found"
      });
    }

    res.json({
      success: true,
      message: "Worker account deactivated",
      worker
    });
  } catch (error) {
    next(error);
  }
};

export const activateWorker = async (req, res, next) => {
  try {
    const worker = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select("-password -qrTokenHash");

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found"
      });
    }

    res.json({
      success: true,
      message: "Worker account activated",
      worker
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================
   DEPARTMENTS
   ========================================= */

export const createDepartment = async (req, res, next) => {
  try {
    const { name, description, manager } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Department name is required"
      });
    }

    const department = await Department.create({
      name: name.trim(),
      description: description || "",
      manager: manager || null
    });

    res.status(201).json({
      success: true,
      message: "Department created",
      department
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find()
      .populate("manager", "name email jobTitle")
      .sort({ name: 1 });

    res.json({
      success: true,
      departments
    });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    const { name, description, manager, isActive } = req.body;

    if (name !== undefined) department.name = name;
    if (description !== undefined) department.description = description;
    if (isActive !== undefined) department.isActive = isActive;
    if (manager !== undefined) department.manager = manager || null;

    await department.save();

    res.json({
      success: true,
      department
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================
   SHIFTS
   ========================================= */

export const createShift = async (req, res, next) => {
  try {
    const { name, startTime, endTime, workDays } = req.body;

    if (!name || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Shift name, start time, and end time are required"
      });
    }

    const shift = await Shift.create({
      name: name.trim(),
      startTime,
      endTime,
      workDays: workDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    });

    res.status(201).json({
      success: true,
      message: "Shift pattern created",
      shift
    });
  } catch (error) {
    next(error);
  }
};

export const getShifts = async (req, res, next) => {
  try {
    const shifts = await Shift.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      shifts
    });
  } catch (error) {
    next(error);
  }
};

export const updateShift = async (req, res, next) => {
  try {
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
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

/* =========================================
   ATTENDANCE & QR CHECK-IN / CHECK-OUT
   ========================================= */

export const checkIn = async (req, res, next) => {
  try {
    const { qrToken, workerId } = req.body;

    let worker = null;

    if (qrToken) {
      const tokenHash = crypto.createHash("sha256").update(qrToken).digest("hex");
      worker = await User.findOne({
        $or: [{ qrTokenHash: tokenHash }, { rawQrToken: qrToken }],
        isActive: true
      });
    } else if (workerId || req.user) {
      const targetId = workerId || req.user._id;
      worker = await User.findById(targetId);
    }

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker QR code or user account invalid."
      });
    }

    const dateStr = getTodayString();

    let existing = await Attendance.findOne({
      worker: worker._id,
      date: dateStr
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `${worker.name} is already checked in for today (${dateStr}).`,
        attendance: existing
      });
    }

    const attendance = await Attendance.create({
      worker: worker._id,
      date: dateStr,
      checkIn: new Date(),
      status: "Present",
      checkInMethod: qrToken ? "QR" : "ONLINE"
    });

    await notify(
      worker._id,
      "Attendance Recorded",
      `Check-in recorded successfully at ${new Date().toLocaleTimeString()}.`,
      "Attendance"
    );

    res.status(201).json({
      success: true,
      message: `Check-in successful for ${worker.name}`,
      attendance,
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email
      }
    });
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const workerId = req.user._id;
    const dateStr = getTodayString();

    const attendance = await Attendance.findOne({
      worker: workerId,
      date: dateStr
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "No check-in record found for today to check out from."
      });
    }

    if (attendance.checkOut) {
      return res.status(409).json({
        success: false,
        message: "You have already checked out for today.",
        attendance
      });
    }

    attendance.checkOut = new Date();
    attendance.status = "Completed";

    await attendance.save();

    res.json({
      success: true,
      message: "Check-out recorded successfully",
      attendance
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAttendance = async (req, res, next) => {
  try {
    const records = await Attendance.find({
      worker: req.user._id
    }).sort({ date: -1 });

    res.json({
      success: true,
      attendance: records
    });
  } catch (error) {
    next(error);
  }
};

export const getAllAttendance = async (req, res, next) => {
  try {
    const records = await Attendance.find()
      .populate("worker", "name email employeeId jobTitle department")
      .sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      attendance: records
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================
   LEAVES MANAGEMENT
   ========================================= */

export const createLeave = async (req, res, next) => {
  try {
    const { type, startDate, endDate, reason } = req.body;

    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "Leave type, start date, end date, and reason are required"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return res.status(400).json({
        success: false,
        message: "Invalid start or end date sequence"
      });
    }

    const leave = await Leave.create({
      worker: req.user._id,
      type,
      startDate: start,
      endDate: end,
      reason,
      status: "Pending"
    });

    res.status(201).json({
      success: true,
      message: "Leave request submitted for review",
      leave
    });
  } catch (error) {
    next(error);
  }
};

export const getMyLeaves = async (req, res, next) => {
  try {
    const leaves = await Leave.find({
      worker: req.user._id
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

export const getLeaves = async (req, res, next) => {
  try {
    const leaves = await Leave.find()
      .populate("worker", "name email employeeId jobTitle department")
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

export const reviewLeave = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Approved or Rejected"
      });
    }

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found"
      });
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewNote = reviewNote || "";

    await leave.save();

    await notify(
      leave.worker,
      `Leave Request ${status}`,
      `Your leave application for ${leave.type} has been ${status.toLowerCase()}.`,
      "Leave"
    );

    res.json({
      success: true,
      message: `Leave application ${status.toLowerCase()}`,
      leave
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================
   TASKS & KANBAN MANAGEMENT
   ========================================= */

export const createTask = async (req, res, next) => {
  try {
    const { title, description, assignedTo, priority, dueDate } = req.body;

    if (!title || !assignedTo) {
      return res.status(400).json({
        success: false,
        message: "Task title and assigned worker are required"
      });
    }

    const worker = await User.findById(assignedTo);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Target worker not found"
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description || "",
      assignedTo,
      assignedBy: req.user._id,
      priority: priority || "Medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "Todo"
    });

    await notify(
      assignedTo,
      "New Task Assigned",
      `You have been assigned task: "${title}"`,
      "Task"
    );

    res.status(201).json({
      success: true,
      message: "Task created and assigned",
      task
    });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find()
      .populate("assignedTo", "name email employeeId jobTitle")
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

export const getMyTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({
      assignedTo: req.user._id
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

export const updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!["Todo", "In Progress", "Completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status option"
      });
    }

    const task = await Task.findById(req.params.id);

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
      message: `Task status updated to ${status}`,
      task
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================
   PAYROLL & SALARY MANAGEMENT
   ========================================= */

export const createPayroll = async (req, res, next) => {
  try {
    const { worker, month, year, baseSalary, bonus = 0, deductions = 0 } = req.body;

    if (!worker || !month || !year || baseSalary === undefined) {
      return res.status(400).json({
        success: false,
        message: "Worker ID, month, year, and base salary are required"
      });
    }

    const netSalary = Number(baseSalary) + Number(bonus) - Number(deductions);

    const payroll = await Payroll.create({
      worker,
      month: Number(month),
      year: Number(year),
      baseSalary: Number(baseSalary),
      bonus: Number(bonus),
      deductions: Number(deductions),
      netSalary,
      status: "Pending"
    });

    await notify(
      worker,
      "Payslip Issued",
      `Payslip generated for ${month}/${year}. Net salary: $${netSalary}`,
      "Payroll"
    );

    res.status(201).json({
      success: true,
      message: "Payroll entry created",
      payroll
    });
  } catch (error) {
    next(error);
  }
};

export const getPayroll = async (req, res, next) => {
  try {
    const payroll = await Payroll.find()
      .populate("worker", "name email employeeId salary jobTitle department")
      .sort({ year: -1, month: -1 });

    res.json({
      success: true,
      payroll
    });
  } catch (error) {
    next(error);
  }
};

export const getMyPayroll = async (req, res, next) => {
  try {
    const payroll = await Payroll.find({
      worker: req.user._id
    }).sort({ year: -1, month: -1 });

    res.json({
      success: true,
      payroll
    });
  } catch (error) {
    next(error);
  }
};

export const updatePayroll = async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll record not found"
      });
    }

    const { baseSalary, bonus, deductions, status } = req.body;

    if (baseSalary !== undefined) payroll.baseSalary = Number(baseSalary);
    if (bonus !== undefined) payroll.bonus = Number(bonus);
    if (deductions !== undefined) payroll.deductions = Number(deductions);

    if (status !== undefined) {
      payroll.status = status;
      if (status === "Paid") payroll.paidAt = new Date();
    }

    payroll.netSalary = payroll.baseSalary + payroll.bonus - payroll.deductions;
    await payroll.save();

    res.json({
      success: true,
      payroll
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================
   NOTIFICATIONS
   ========================================= */

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================
   EXECUTIVE / MANAGER DASHBOARD METRICS
   ========================================= */

export const dashboard = async (req, res, next) => {
  try {
    const dateStr = getTodayString();

    const [
      totalWorkers,
      activeWorkers,
      totalDepartments,
      totalShifts,
      todayAttendance,
      pendingLeaves,
      activeTasks,
      completedTasks,
      payrollPending
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ["worker", "Worker"] } }),
      User.countDocuments({ role: { $in: ["worker", "Worker"] }, isActive: true }),
      Department.countDocuments({ isActive: true }),
      Shift.countDocuments({ isActive: true }),
      Attendance.countDocuments({ date: dateStr }),
      Leave.countDocuments({ status: "Pending" }),
      Task.countDocuments({ status: { $ne: "Completed" } }),
      Task.countDocuments({ status: "Completed" }),
      Payroll.countDocuments({ status: "Pending" })
    ]);

    const recentAttendance = await Attendance.find({ date: dateStr })
      .populate("worker", "name jobTitle employeeId")
      .limit(5)
      .sort({ checkIn: -1 });

    const recentTasks = await Task.find()
      .populate("assignedTo", "name")
      .limit(5)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      dashboard: {
        totalWorkers,
        activeWorkers,
        totalDepartments,
        totalShifts,
        todayAttendance,
        pendingLeaves,
        activeTasks,
        completedTasks,
        payrollPending,
        attendanceRate: totalWorkers > 0 ? Math.round((todayAttendance / totalWorkers) * 100) : 0,
        recentAttendance,
        recentTasks
      }
    });
  } catch (error) {
    next(error);
  }
};
