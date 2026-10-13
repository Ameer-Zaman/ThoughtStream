// Uses Brevo's HTTPS API instead of SMTP.
// Render (and most cloud hosts) block outbound SMTP on ports 25/465/587,
// but HTTPS on port 443 always works.

async function sendMail({ to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.log("\n--- EMAIL (BREVO_API_KEY missing, printing instead) ---");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(text);
    console.log("-------------------------------------------------------\n");
    return;
  }

  const senderEmail =
    process.env.MAIL_FROM_EMAIL || "thoughtstream4@gmail.com";
  const senderName = process.env.MAIL_FROM_NAME || "ThoughtStream";

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API ${res.status}: ${body.slice(0, 200)}`);
  }
}

module.exports = { sendMail };