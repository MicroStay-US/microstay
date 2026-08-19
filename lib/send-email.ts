import { Resend } from 'resend';
import nodemailer from 'nodemailer';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams) {
  const recipients = Array.isArray(to) ? to : [to];
  const resendKey = process.env.RESEND_API_KEY || process.env.Resend_API_KEY;
  const isDev = process.env.NODE_ENV !== 'production';

  // 1. Try Resend first if key is present
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const defaultFrom = isDev ? 'MicroStay <onboarding@resend.dev>' : 'MicroStay <no-reply@microstay.us>';
      const fromAddr = from || defaultFrom;

      const { data, error } = await resend.emails.send({
        from: fromAddr,
        to: recipients,
        subject,
        html,
      });

      if (!error && data) {
        console.log(`[sendEmail] Resend success to ${recipients.join(', ')}`);
        return { success: true, provider: 'resend', data };
      }

      console.warn(`[sendEmail] Resend returned error for ${recipients.join(', ')}:`, error?.message || 'Unknown error');
    } catch (err: any) {
      console.warn(`[sendEmail] Resend exception:`, err.message);
    }
  }

  // 2. Fallback to SMTP / Nodemailer if configured
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: from ? `${from.split('<')[0].trim()} <${smtpUser}>` : `MicroStay <${smtpUser}>`,
        to: recipients.join(', '),
        subject,
        html,
      });

      console.log(`[sendEmail] Nodemailer SMTP success to ${recipients.join(', ')}:`, info.messageId);
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (smtpErr: any) {
      console.error(`[sendEmail] Nodemailer SMTP error:`, smtpErr.message);
      return { success: false, error: smtpErr.message };
    }
  }

  return { success: false, error: 'All email providers failed or unconfigured' };
}
