import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import User from "./models/User.js";
import Department from "./models/department.js";
import Shift from "./models/shift.js";
import Attendance from "./models/Attendance.js";
import Leave from "./models/Leave.js";
import Task from "./models/Task.js";
import Payroll from "./models/Payroll.js";
import Notification from "./models/Notification.js";

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/workforce";
const localUri = "mongodb://127.0.0.1:27017/workforce";

const seedDatabase = async () => {
  try {
    console.log("Connecting to MongoDB for seeding...");
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    } catch (atlasErr) {
      console.warn("Cloud MongoDB connection failed, attempting local MongoDB connection:", atlasErr.message);
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 5000 });
    }

    console.log("Clearing existing sample data...");
    await User.deleteMany({});
    await Department.deleteMany({});
    await Shift.deleteMany({});
    await Attendance.deleteMany({});
    await Leave.deleteMany({});
    await Task.deleteMany({});
    await Payroll.deleteMany({});
    await Notification.deleteMany({});

    console.log("Creating Departments...");
    const engDept = await Department.create({
      name: "Software Engineering",
      description: "Core web & software development team"
    });
    const hrDept = await Department.create({
      name: "Human Resources",
      description: "People operations, hiring & welfare"
    });
    const opsDept = await Department.create({
      name: "Operations & Logistics",
      description: "Daily operations, facility management & quality"
    });

    console.log("Creating Shifts...");
    const dayShift = await Shift.create({
      name: "Day Shift (9 AM - 5 PM)",
      startTime: "09:00",
      endTime: "17:00",
      workDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    });
    const flexShift = await Shift.create({
      name: "Flexible Engineering Shift",
      startTime: "10:00",
      endTime: "18:00",
      workDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    });

    const commonPassword = await bcrypt.hash("password123", 12);

    console.log("Creating CEO Account...");
    const ceo = await User.create({
      employeeId: "EMP-CEO-001",
      name: "Victoria Vance",
      email: "ceo@workforce.com",
      password: commonPassword,
      role: "ceo",
      jobTitle: "Chief Executive Officer",
      phone: "+1 (555) 019-2831",
      salary: 185000,
      isEmailVerified: true
    });

    console.log("Creating Manager Account...");
    const manager = await User.create({
      employeeId: "EMP-MGR-002",
      name: "Marcus Holloway",
      email: "manager@workforce.com",
      password: commonPassword,
      role: "manager",
      jobTitle: "Engineering Lead / Operations Manager",
      department: engDept._id,
      shift: dayShift._id,
      phone: "+1 (555) 018-9942",
      salary: 95000,
      isEmailVerified: true
    });

    engDept.manager = manager._id;
    await engDept.save();

    console.log("Creating Worker Accounts...");
    const qr1 = "worker1-qr-token-demo-123456";
    const worker1 = await User.create({
      employeeId: "EMP-WRK-101",
      name: "Alexander Wright",
      email: "alex@workforce.com",
      password: commonPassword,
      role: "worker",
      jobTitle: "Senior Frontend Developer",
      department: engDept._id,
      shift: flexShift._id,
      phone: "+1 (555) 014-4421",
      salary: 78000,
      isEmailVerified: true,
      rawQrToken: qr1,
      qrTokenHash: crypto.createHash("sha256").update(qr1).digest("hex")
    });

    const qr2 = "worker2-qr-token-demo-654321";
    const worker2 = await User.create({
      employeeId: "EMP-WRK-102",
      name: "Sophia Martinez",
      email: "sophia@workforce.com",
      password: commonPassword,
      role: "worker",
      jobTitle: "UI/UX Designer & Researcher",
      department: engDept._id,
      shift: dayShift._id,
      phone: "+1 (555) 016-8812",
      salary: 72000,
      isEmailVerified: true,
      rawQrToken: qr2,
      qrTokenHash: crypto.createHash("sha256").update(qr2).digest("hex")
    });

    const qr3 = "worker3-qr-token-demo-999888";
    const worker3 = await User.create({
      employeeId: "EMP-WRK-103",
      name: "Liam O'Connor",
      email: "liam@workforce.com",
      password: commonPassword,
      role: "worker",
      jobTitle: "DevOps & Infrastructure Engineer",
      department: opsDept._id,
      shift: flexShift._id,
      phone: "+1 (555) 017-3329",
      salary: 80000,
      isEmailVerified: true,
      rawQrToken: qr3,
      qrTokenHash: crypto.createHash("sha256").update(qr3).digest("hex")
    });

    console.log("Creating Attendance Records...");
    const todayStr = new Date().toISOString().split("T")[0];
    await Attendance.create({
      worker: worker1._id,
      date: todayStr,
      checkIn: new Date(Date.now() - 4 * 3600 * 1000),
      checkOut: null,
      status: "Present",
      checkInMethod: "QR"
    });
    await Attendance.create({
      worker: worker2._id,
      date: todayStr,
      checkIn: new Date(Date.now() - 5 * 3600 * 1000),
      checkOut: new Date(Date.now() - 1 * 3600 * 1000),
      status: "Completed",
      checkInMethod: "QR"
    });

    console.log("Creating Sample Tasks...");
    await Task.create({
      title: "Design System UI Components",
      description: "Build glassmorphic UI component library and dark mode token system",
      assignedTo: worker2._id,
      assignedBy: manager._id,
      priority: "High",
      status: "In Progress",
      dueDate: new Date(Date.now() + 2 * 86400 * 1000)
    });

    await Task.create({
      title: "Optimize API Performance",
      description: "Audit Mongoose database queries and improve endpoint response latency",
      assignedTo: worker1._id,
      assignedBy: manager._id,
      priority: "Urgent",
      status: "In Progress",
      dueDate: new Date(Date.now() + 1 * 86400 * 1000)
    });

    await Task.create({
      title: "Setup CI/CD Pipeline",
      description: "Automate build and container deployment tests on push",
      assignedTo: worker3._id,
      assignedBy: manager._id,
      priority: "Medium",
      status: "Completed",
      dueDate: new Date(Date.now() - 1 * 86400 * 1000)
    });

    console.log("Creating Sample Leaves...");
    await Leave.create({
      worker: worker1._id,
      type: "Annual",
      startDate: new Date(Date.now() + 5 * 86400 * 1000),
      endDate: new Date(Date.now() + 9 * 86400 * 1000),
      reason: "Family vacation trip",
      status: "Pending"
    });

    await Leave.create({
      worker: worker2._id,
      type: "Sick",
      startDate: new Date(Date.now() - 3 * 86400 * 1000),
      endDate: new Date(Date.now() - 2 * 86400 * 1000),
      reason: "Flu and fever recovery",
      status: "Approved",
      reviewedBy: manager._id,
      reviewNote: "Get well soon!"
    });

    console.log("Creating Sample Payrolls...");
    await Payroll.create({
      worker: worker1._id,
      month: 9,
      year: 2026,
      baseSalary: 6500,
      bonus: 500,
      deductions: 200,
      netSalary: 6800,
      status: "Paid",
      paidAt: new Date()
    });

    await Payroll.create({
      worker: worker2._id,
      month: 9,
      year: 2026,
      baseSalary: 6000,
      bonus: 400,
      deductions: 150,
      netSalary: 6250,
      status: "Pending"
    });

    console.log("Creating Notifications...");
    await Notification.create({
      recipient: worker1._id,
      title: "Welcome to Workforce",
      message: "Your worker workspace is fully setup. Access tasks, QR check-in, and payroll.",
      type: "System"
    });

    console.log("✅ SEEDING COMPLETE SUCCESSFULLY!");
    console.log("-----------------------------------------");
    console.log("Demo Credentials (Password: password123)");
    console.log("CEO:     ceo@workforce.com");
    console.log("Manager: manager@workforce.com");
    console.log("Worker:  alex@workforce.com");
    console.log("-----------------------------------------");

    process.exit(0);
  } catch (error) {
    console.error("❌ SEEDING FAILED:", error);
    process.exit(1);
  }
};

seedDatabase();
