import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },

    year: {
      type: Number,
      required: true,
      min: 2020
    },

    baseSalary: {
      type: Number,
      required: true,
      min: 0
    },

    bonus: {
      type: Number,
      default: 0,
      min: 0
    },

    deductions: {
      type: Number,
      default: 0,
      min: 0
    },

    netSalary: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending"
    },

    paidAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

payrollSchema.index(
  { worker: 1, month: 1, year: 1 },
  { unique: true }
);

export default mongoose.models.Payroll || mongoose.model("Payroll", payrollSchema);