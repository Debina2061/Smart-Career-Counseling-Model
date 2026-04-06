import nodemailer from "nodemailer";
import { envConfig } from "../Config/envConfig.js";

const transporter = nodemailer.createTransport({
  secure: false,
  service: "gmail",
  auth: {
    user: envConfig.emailUser,
    pass: envConfig.emailPassword,
  },
});
export const SendMail = (body) => {
  return transporter.sendMail({
    from: `ATS Platform <${envConfig.emailUser}>`,
    to: body?.email,
    subject: body?.subject,
    html: body?.html,
  });
};
