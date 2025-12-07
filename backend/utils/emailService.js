// import nodemailer from "nodemailer";

// export const sendEmail = async (to, subject, html) => {
//   try {
//     const transporter = nodemailer.createTransport({
//       host: "smtp.gmail.com",
//       port: 465,
//       secure: false, // IMPORTANT
//       auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS
//       },
//       tls: {
//         rejectUnauthorized: false, // IMPORTANT for Gmail
//       }
//     });

//     const mailOptions = {
//       from: `"RoseWood Hospital" <${process.env.SMTP_USER}>`,
//       to,
//       subject,
//       html,
//     };

//     await transporter.sendMail(mailOptions);
//     // console.log("Email Sent Successfully!");
//   } catch (error) {
//     console.log("EMAIL ERROR:", error);
//   }
// };

// brevo integration

import client from "../configs/brevo.js";

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const sendSmtpEmail = {
      sender: { name: "Rosewood Hospital", email: "soulf032@gmail.com" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    };

    const response = await client.sendTransacEmail(sendSmtpEmail);

    console.log("Email sent successfully:", response);
    return response;
  } catch (error) {
    console.error("Brevo Error:", error.response?.text || error.message);
    throw new Error("Email not sent");
  }
};
