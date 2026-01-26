// Worker: send the actual email when job fires
import { Worker } from "bullmq";
import { redis } from "../queues/reminderQueue.js";
import Subscription from "../models/subscription.model.js";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!
  }
});

async function sendReminderEmail(to: string, renewalDate: Date, plan?: string, offsetDays?: number) {
  const subject = `Reminder: subscription renews on ${renewalDate.toDateString()}`;
  const text =
`Hi,
Your subscription${plan ? ` (${plan})` : ""} will renew on ${renewalDate.toDateString()}.

You can cancel or manage your subscription here:
https://yourapp.com/billing

(You’re receiving this ${offsetDays} day(s) before renewal.)
`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM!,
    to,
    subject,
    text
  });
}

export const reminderWorker = new Worker(
  "subscription-reminders",
  async (job) => {
    const { subscriptionId, offsetDays } = job.data as { subscriptionId: string; offsetDays: number };

    // 1) Retrieve subscription
    const sub = await Subscription.findById(subscriptionId);
    if (!sub) return;

    // 2) Validate
    if (sub.status !== "active") return;

    // 3) Renewal date evaluation
    const now = new Date();
    if (sub.renewalDate.getTime() <= now.getTime()) {
      // renewal passed - do nothing (or send “renewed” email if you want)
      return;
    }

    // 4) Idempotency guard: do not send if already marked SENT for this offset
    const reminder = sub.reminders?.find(
      (r: any) => r.offsetDays === offsetDays && r.status === "SCHEDULED"
    );
    if (!reminder) return;

    // 5) Send
    await sendReminderEmail(sub.customerEmail, sub.renewalDate, sub.plan, offsetDays);

    // 6) Mark sent
    reminder.status = "SENT";
    reminder.sentAt = new Date();
    await sub.save();
  },
  { connection: redis, concurrency: 5 }
);
