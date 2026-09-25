import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },

    role: {
      type: String,
      enum: ["ceo", "manager", "worker", "CEO", "Manager", "Worker"],
      default: "worker",
      set: (v) => (v ? v.toLowerCase() : "worker")
    },

    phone: {
      type: String,
      trim: true,
      default: ""
    },

    jobTitle: {
      type: String,
      trim: true,
      default: "Employee"
    },

    avatarId: {
      type: String,
      enum: ["professional", "team-lead", "operations", "security", "developer", "project", "finance", "schedule"],
      default: "professional"
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null
    },

    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null
    },

    salary: {
      type: Number,
      min: 0,
      default: 0
    },

    isActive: {
      type: Boolean,
      default: true
    },

    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },

    isEmailVerified: {
      type: Boolean,
      default: true
    },

    verificationToken: {
      type: String,
      select: false
    },

    verificationExpires: {
      type: Date,
      select: false
    },

    qrTokenHash: {
      type: String,
      select: false
    },

    rawQrToken: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
