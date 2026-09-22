const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: `"Workforce Management" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Workforce Management OTP",
    text: `Your verification OTP is ${otp}. It will expire in 10 minutes.`,
  });
};

module.exports = sendOTP;