import { Resend } from "resend";

export const sendEmail = async ({ to, subject, html }) => {
  if (!to || !subject || !html) {
    return {
      success: false,
      error: {
        message: "Missing required email fields: to, subject, html",
      },
    };
  }

  if (!process.env.RESEND_API_KEY) {
    return {
      success: false,
      error: {
        message: "Missing RESEND_API_KEY environment variable",
      },
    };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: "Smart Career Councelling <smart-career@debina-baraili.me>",
      to,
      subject,
      html,
    });

    if (error) {
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error?.message || "Failed to send email",
      },
    };
  }
};
