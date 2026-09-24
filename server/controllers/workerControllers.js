const bcrypt = require("bcryptjs");

const User = require("../models/User");

// =========================
// CREATE WORKER
// CEO + MANAGER
// =========================

const createWorker = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const existingWorker = await User.findOne({ email });

    if (existingWorker) {
      return res.status(400).json({
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const worker = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "Worker",
      isActive: true,
    });

    res.status(201).json({
      message: "Worker created successfully",

      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        role: worker.role,
        isActive: worker.isActive,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// GET ALL WORKERS
// CEO + MANAGER
// =========================

const getWorkers = async (req, res) => {
  try {
    const workers = await User.find({ role: "Worker" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      message: "Workers fetched successfully",
      count: workers.length,
      workers,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// GET SINGLE WORKER
// CEO + MANAGER
// =========================

const getWorker = async (req, res) => {
  try {
    const { id } = req.params;

    const worker = await User.findOne({
      _id: id,
      role: "Worker",
    }).select("-password");

    if (!worker) {
      return res.status(404).json({
        message: "Worker not found",
      });
    }

    res.json({
      message: "Worker fetched successfully",
      worker,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// UPDATE WORKER
// CEO + MANAGER
// =========================

const updateWorker = async (req, res) => {
  try {
    const { id } = req.params;

    const { name, email } = req.body;

    const worker = await User.findOne({
      _id: id,
      role: "Worker",
    });

    if (!worker) {
      return res.status(404).json({
        message: "Worker not found",
      });
    }

    if (name !== undefined) {
      worker.name = name;
    }

    if (email !== undefined) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: id },
      });

      if (existingUser) {
        return res.status(400).json({
          message: "Email already in use",
        });
      }

      worker.email = email;
    }

    await worker.save();

    res.json({
      message: "Worker updated successfully",

      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        role: worker.role,
        isActive: worker.isActive,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// DEACTIVATE WORKER
// CEO + MANAGER
// =========================

const deactivateWorker = async (req, res) => {
  try {
    const { id } = req.params;

    const worker = await User.findOneAndUpdate(
      {
        _id: id,
        role: "Worker",
      },
      {
        isActive: false,
      },
      {
        new: true,
      }
    ).select("-password");

    if (!worker) {
      return res.status(404).json({
        message: "Worker not found",
      });
    }

    res.json({
      message: "Worker deactivated successfully",
      worker,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// ACTIVATE WORKER
// CEO + MANAGER
// =========================

const activateWorker = async (req, res) => {
  try {
    const { id } = req.params;

    const worker = await User.findOneAndUpdate(
      {
        _id: id,
        role: "Worker",
      },
      {
        isActive: true,
      },
      {
        new: true,
      }
    ).select("-password");

    if (!worker) {
      return res.status(404).json({
        message: "Worker not found",
      });
    }

    res.json({
      message: "Worker activated successfully",
      worker,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  createWorker,
  getWorkers,
  getWorker,
  updateWorker,
  deactivateWorker,
  activateWorker,
};