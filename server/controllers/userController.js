const User = require("../models/User");

// =========================
// GET MY PROFILE
// =========================

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "Profile fetched successfully",
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// MANAGEMENT DATA
// CEO + MANAGER
// =========================

const getManagementData = async (req, res) => {
  try {
    res.json({
      message: "Management data fetched successfully",
      accessedBy: req.user.role,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// CEO DATA
// CEO ONLY
// =========================

const getCEOData = async (req, res) => {
  try {
    res.json({
      message: "CEO data fetched successfully",
      accessedBy: req.user.role,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getProfile,
  getManagementData,
  getCEOData,
};