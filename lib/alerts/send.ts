import { db } from '@/lib/db';
import { env } from '@/lib/env';

/**
 * Send pending alerts: in-app are "delivered" by marking SENT; email uses SMTP if configured.
 */
export async function processPendingAlerts(): Promise<{ sent: number; failed: number }> {
  const pending = await db.alert.findMany({
    where: { status: 'PENDING' },
    take: 50,
  });
  let sent = 0;
  let failed = 0;

  for (const alert of pending) {
    try {
      if (alert.channel === 'INAPP') {
        await db.alert.update({
          where: { id: alert.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
        sent++;
        continue;
      }

      if (alert.channel === 'EMAIL' && env.SMTP_HOST) {
        await sendEmailAlert(alert.message);
        await db.alert.update({
          where: { id: alert.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
        sent++;
      } else {
        await db.alert.update({
          where: { id: alert.id },
          data: { status: 'FAILED' },
        });
        failed++;
      }
    } catch {
      await db.alert.update({
        where: { id: alert.id },
        data: { status: 'FAILED' },
      }).catch(() => {});
      failed++;
    }
  }

  return { sent, failed };
}

async function sendEmailAlert(message: string): Promise<void> {
  const host = env.SMTP_HOST;
  const port = env.SMTP_PORT ?? 587;
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const from = env.ALERT_EMAIL_FROM;
  if (!host || !user || !pass || !from) {
    throw new Error('SMTP not fully configured');
  }
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.default.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  await transporter.sendMail({
    from,
    to: from,
    subject: 'ParkPilot Alert',
    text: message,
  });
}
