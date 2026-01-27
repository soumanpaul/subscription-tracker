import { Worker } from "bullmq";
import { redis } from "../queues/reminderQueue.js";
import Subscription from "../models/subscription.model.js";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!
  }
});

export const reminderWorker = new Worker(
  "subscription-reminders",
  async (job) => {
    const { subscriptionId, offset } = job.data;

    const sub = await Subscription.findById(subscriptionId);
    if (!sub || sub.status !== "active") return;

    const reminder = sub.reminders.find(
      r => r.offsetDays === offset && r.status === "SCHEDULED"
    );
    if (!reminder) return; // idempotency guard

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM!,
      to: sub.customerEmail,
      subject: `Subscription renewal reminder`,
      text: `Your subscription "${sub.name}" renews on ${sub.renewalDate.toDateString()}.
You can cancel or continue it from your account.`
    });

    // Mark sent
    reminder.status = "SENT";
    reminder.sentAt = new Date();
    await sub.save();
  },
  { connection: redis, concurrency: 5 }
);
