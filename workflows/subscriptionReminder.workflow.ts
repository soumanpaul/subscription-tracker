// “Workflow API” function: schedule reminders for a subscription

import Subsctiption from "../models/subscription.model";
import { reminderQueue } from "../queues/reminderQueue";

function dayMs(days: number) {
    return days * 24 * 60 * 60 * 1000;
}

function toISODateOnly(d: Date) {
    return d.toISOString().slice(0, 10);
}

export async function schedulerSubscriptionReminders(subscriptionId: string) {
    // 1) Retrieve subscription details
    const sub = await Subsctiption.findById(subscriptionId);
    if(!sub) {
        console.warn("Subscription not found:", subscriptionId);
        return;
    }

    // 2) Validation checks
    if(sub.status !== "active") {
        console.log("Subscription not active. Skip scheduling:", subscriptionId)
        return;
    }

    // 3) Renewal date evaluation
    const now = new Date();
    if(sub.renewalDate.getTime() <= now.getTime()) {
        console.info("Renewal date already passed. Skip scheduling: ", subscriptionId)
        return;
    }

    // Optional: clear any previously scheduled remainders when rescheduling
    await cancelPendingReminders(subscriptionId);

    // 4) Reminder scheduling
    const offsets = sub.remainderOffsets?.length ? sub.remainderOffsets : [7];

    const remainderDocs: any[] = [];

    for (const offsetDays of offsets) {
        const scheduledFor = new Date(sub.remainderDate.getTime() - dayMs(offsetDays));

        // if reminder date is in the past, send ASAP (delay 0)
        const delay = Math.max(0, scheduledFor.getTime() - Date.now());

        // stable dedupe job id (prevents duplicates)
        const jobId = `reminder:${subscriptionId}:${offsetDays}:${toISODateOnly(sub.renewalDate)}`;

        await reminderQueue.add(
            "send-reminder",
            { subscriptionId, offsetDays },
            {
                jobId,
                delay,
                attempts: 5,
                backoff: { type: "exponential", delay: 2000 },
                removeOnComplete: true
            }
        );

        remainderDocs.push({
            offsetDays,
            scheduledFor,
            jobId,
            status: "SCHEDULED"
        });
    }

    // Save scheduled reminders into Mongo
    sub.remainders = remainderDocs;
    await sub.save();
}

export async function cancelPendingReminders(subscriptionId: string) {
    const sub = await Subsctiption.findById(subscriptionId)
    if (!sub?.remainders?.length) return;

    // Remove jobs by jobId (only possible if you stored jobId)
    for (const r of sub.reminders) {
    if (r.status === "SCHEDULED" && r.jobId) {
      try {
        await reminderQueue.remove(r.jobId);
        r.status = "CANCELLED";
      } catch {
        // job may have already run/been removed
      }
    }
  }
  await sub.save();
}