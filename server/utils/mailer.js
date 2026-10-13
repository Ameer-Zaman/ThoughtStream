const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.BREVO_SMTP_KEY) return null;

  transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_LOGIN,
      pass: process.env.BREVO_SMTP_KEY,
    },
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.log("\n--- EMAIL (BREVO_SMTP_KEY missing, printing instead) ---");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(text);
    console.log("-------------------------------------------------------\n");
    return;
  }

  await t.sendMail({
    from: process.env.MAIL_FROM || "ThoughtStream <thoughtstream4@gmail.com>",
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendMail };