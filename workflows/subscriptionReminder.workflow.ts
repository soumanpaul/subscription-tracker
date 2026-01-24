import Subsctiption from "../models/subscription.model";
import { reminderQueue } from "../queues/reminderQueue";

function dayMs(days: number) {
    return days * 24 * 60 * 60 * 1000;
}

function toISODateOnly(d: Date) {
    return d.toISOString().slice(0, 10);
}

export async function schedulerSubscriptionReminders(subscriptionId: string) {
     
}
