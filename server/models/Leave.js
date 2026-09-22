import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    type: {
      type: String,
      enum: [
        "Annual",
        "Sick",
        "Casual",
        "Emergency",
        "Unpaid",
        "Other"
      ],
      required: true
    },

    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending"
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    reviewNote: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.Leave || mongoose.model("Leave", leaveSchema);