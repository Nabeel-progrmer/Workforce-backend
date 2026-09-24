const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d"
    }
  );
};

const generateQRToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const hashQRToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

// PUBLIC SIGNUP
// Public users can ONLY become Worker
exports.signup = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required"
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const rawQRToken = generateQRToken();

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role: "Worker",
      qrTokenHash: hashQRToken(rawQRToken)
    });

    const token = createToken(user);

    res.status(201).json({
      success: true,
      message: "Worker account created",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        qrToken: rawQRToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// LOGIN
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase()
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive"
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = createToken(user);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// FIRST CEO SETUP
exports.setupCEO = async (req, res, next) => {
  try {
    const { setupSecret, name, email, password } = req.body;

    if (setupSecret !== process.env.SETUP_SECRET) {
      return res.status(403).json({
        success: false,
        message: "Invalid setup secret"
      });
    }

    const existingCEO = await User.findOne({
      role: "CEO"
    });

    if (existingCEO) {
      return res.status(409).json({
        success: false,
        message: "CEO already exists"
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required"
      });
    }

    const existingEmail = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "CEO"
    });

    res.status(201).json({
      success: true,
      message: "CEO account created successfully"
    });
  } catch (error) {
    next(error);
  }
};