const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    // No SMTP configured: print the email so you can still develop locally.
    console.log("\n--- EMAIL (SMTP not configured, printing instead) ---");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(text);
    console.log("-----------------------------------------------------\n");
    return;
  }
  await t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER || "ThoughtStream <no-reply@thoughtstream.app>",
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendMail };
