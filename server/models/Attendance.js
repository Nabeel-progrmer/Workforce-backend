import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    date: {
      type: String,
      required: true
    },

    checkIn: {
      type: Date,
      default: null
    },

    checkOut: {
      type: Date,
      default: null
    },

    status: {
      type: String,
      enum: ["Present", "Completed", "Absent", "Late"],
      default: "Present"
    },

    checkInMethod: {
      type: String,
      enum: ["QR", "MANUAL", "ONLINE"],
      default: "QR"
    },

    notes: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

attendanceSchema.index(
  { worker: 1, date: 1 },
  { unique: true }
);

export default mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);
