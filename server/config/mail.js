const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// Matches the nodemailer API shape: transporter.sendMail({ from, to, subject, text })
// so existing callers don't need to change.
const transporter = {
  sendMail: async ({ from, to, subject, text, html }) => {
    const { data, error } = await resend.emails.send({
      from: from || "ThoughtStream <onboarding@resend.dev>",
      to,
      subject,
      text,
      html,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};

module.exports = transporter;