import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    description: {
      type: String,
      trim: true,
      default: ""
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium"
    },

    status: {
      type: String,
      enum: ["Todo", "In Progress", "Completed"],
      default: "Todo"
    },

    dueDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.Task || mongoose.model("Task", taskSchema);