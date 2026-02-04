import mongoose from "mongoose";

export type Frequency = "daily" | "weekly" | "monthly" | "yearly";
export type SubscriptionStatus = "active" | "cancelled" | "expired";

export interface IReminder {
  offsetDays: number;
  scheduledFor: Date;
  jobId: string;
  sentAt?: Date;
  status: "SCHEDULED" | "SENT" | "CANCELLED";
}

export interface ISubscription {
  name: string;
  price: number;
  currency: "USD" | "EUR" | "GBP";

  frequency: Frequency;
  category:
    | "sports"
    | "news"
    | "entertainment"
    | "lifestyle"
    | "technology"
    | "finance"
    | "politics"
    | "other";

  status: SubscriptionStatus;

  startDate: Date;
  renewalDate?: Date; // ✅ optional in TS (you compute it)

  user: mongoose.Types.ObjectId;

  reminderOffsets: number[];
  reminders: IReminder[];

  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema = new mongoose.Schema<IReminder>(
  {
    offsetDays: { type: Number, required: true },
    scheduledFor: { type: Date, required: true },
    jobId: { type: String, required: true, index: true },
    sentAt: { type: Date },
    status: {
      type: String,
      enum: ["SCHEDULED", "SENT", "CANCELLED"],
      default: "SCHEDULED",
    },
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema<ISubscription>(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["USD", "EUR", "GBP"], default: "USD" },

    frequency: { type: String, enum: ["daily", "weekly", "monthly", "yearly"], required: true },

    category: {
      type: String,
      enum: ["sports", "news", "entertainment", "lifestyle", "technology", "finance", "politics", "other"],
      required: true,
    },

    status: { type: String, enum: ["active", "cancelled", "expired"], default: "active", index: true },

    startDate: { type: Date, required: true },
    renewalDate: { type: Date, required: true, index: true },

    user: { type: mongoose.Types.ObjectId, ref: "User", required: true, index: true },

    reminderOffsets: { type: [Number], default: [30, 7, 1] },
    reminders: { type: [ReminderSchema], default: [] },
  },
  { timestamps: true }
);

// ✅ No next() overload resolution needed
subscriptionSchema.pre("validate", function () {
  if (!this.renewalDate) {
    const daysMap: Record<Frequency, number> = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      yearly: 365,
    };

    const days = daysMap[this.frequency];
    this.renewalDate = new Date(this.startDate);
    this.renewalDate.setUTCDate(this.renewalDate.getUTCDate() + days);
  }
});

subscriptionSchema.pre("save", function () {
  if (this.renewalDate && this.renewalDate < new Date()) {
    this.status = "expired";
  }
});

const SubscriptionModel =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", subscriptionSchema);

export default SubscriptionModel;
