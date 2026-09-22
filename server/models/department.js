import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100
    },

    description: {
      type: String,
      trim: true,
      default: ""
    },

    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
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

export default mongoose.models.Department || mongoose.model("Department", departmentSchema);