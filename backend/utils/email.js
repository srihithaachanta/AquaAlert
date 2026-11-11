import nodemailer from "nodemailer";

export async function sendEmail(to, subject, message) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !to) {
    console.log("Email not configured. Notification:", subject);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text: message
    });
  } catch (error) {
    console.error("Email error:", error.message);
  }
}