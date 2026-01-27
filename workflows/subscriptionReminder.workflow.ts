import Subscription from "../models/subscription.model.js";
import { reminderQueue } from "../queues/reminderQueue.js";

const DAY = 24 * 60 * 60 * 1000;

export async function scheduleSubscriptionReminders(subscriptionId: string) {
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return;

  // Validation
  if (sub.status !== "active") return;
  if (sub.renewalDate <= new Date()) return;

  // Cancel previous pending reminders
  for (const r of sub.reminders) {
    if (r.status === "SCHEDULED") {
      await reminderQueue.remove(r.jobId).catch(() => {});
      r.status = "CANCELLED";
    }
  }

  sub.reminders = [];

  // Schedule new reminders
  for (const offset of sub.reminderOffsets) {
    const scheduledFor = new Date(sub.renewalDate.getTime() - offset * DAY);
    const delay = Math.max(0, scheduledFor.getTime() - Date.now());

    const jobId = `sub:${sub._id}:reminder:${offset}:${sub.renewalDate.toISOString().slice(0, 10)}`;

    await reminderQueue.add(
      "send-reminder",
      { subscriptionId: sub._id.toString(), offset },
      {
        jobId,
        delay,
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true
      }
    );

    sub.reminders.push({
      offsetDays: offset,
      scheduledFor,
      jobId,
      status: "SCHEDULED"
    });
  }

  await sub.save();
}
