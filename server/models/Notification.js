import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    title: {
      type: String,
      required: true,
      maxlength: 150
    },

    message: {
      type: String,
      required: true,
      maxlength: 1000
    },

    type: {
      type: String,
      enum: [
        "General",
        "Task",
        "Leave",
        "Payroll",
        "Attendance",
        "System"
      ],
      default: "General"
    },

    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);