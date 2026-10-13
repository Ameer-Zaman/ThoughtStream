const { Resend } = require("resend");

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function sendMail({ to, subject, text, html }) {
  if (!resend) {
    console.log("\n--- EMAIL (RESEND_API_KEY missing, printing instead) ---");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(text);
    console.log("-------------------------------------------------------\n");
    return;
  }

  const { error } = await resend.emails.send({
    from: process.env.MAIL_FROM || "ThoughtStream <onboarding@resend.dev>",
    to,
    subject,
    text,
    html,
  });

  if (error) throw new Error(`Resend: ${error.message}`);
}

module.exports = { sendMail };