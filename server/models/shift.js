import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    startTime: {
      type: String,
      required: true
    },

    endTime: {
      type: String,
      required: true
    },

    workDays: {
      type: [String],
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ],
      default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.Shift || mongoose.model("Shift", shiftSchema);