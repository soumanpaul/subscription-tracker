import mongoose, { Schema, model, Types, HydratedDocument, Model, CallbackWithoutResultAndOptionalError } from "mongoose";

/** --- Enums (as union types) --- */
export type Currency = "USD" | "EUR" | "GBP";
export type Frequency = "daily" | "weekly" | "monthly" | "yearly";
export type Category =
  | "sports"
  | "news"
  | "entertainment"
  | "lifestyle"
  | "technology"
  | "finance"
  | "politics"
  | "other";

export type SubscriptionStatus = "active" | "cancelled" | "expired";
export type ReminderStatus = "SCHEDULED" | "SENT" | "CANCELLED";

/** --- Subdocument types --- */
export interface IReminder {
  offsetDays: number; // 30, 7, 1
  scheduledFor: Date;
  jobId: string;
  sentAt?: Date;
  status: ReminderStatus;
}

/** --- Main document type --- */
export interface ISubscription {
  name: string;
  price: number;
  currency: Currency;

  frequency: Frequency;
  category: Category;

  status: SubscriptionStatus;

  startDate: Date;
  renewalDate: Date;

  user: Types.ObjectId;

  reminderOffsets: number[];
  reminders: IReminder[];

  createdAt: Date;
  updatedAt: Date;
}

/** --- Reminder sub-schema --- */
const ReminderSchema = new Schema<IReminder>(
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

/** --- Subscription schema --- */
const subscriptionSchema = new Schema<ISubscription>(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["USD", "EUR", "GBP"], default: "USD" },

    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
      required: true,
    },

    category: {
      type: String,
      enum: [
        "sports",
        "news",
        "entertainment",
        "lifestyle",
        "technology",
        "finance",
        "politics",
        "other",
      ],
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "cancelled", "expired"],
      default: "active",
      index: true,
    },

    startDate: { type: Date, required: true },
    renewalDate: { type: Date, required: true, index: true },

    user: { type: Types.ObjectId, ref: "User", required: true, index: true },

    reminderOffsets: { type: [Number], default: [30, 7, 1] },

    reminders: { type: [ReminderSchema], default: [] },
  },
  { timestamps: true }
);

/** --- Hooks --- */

subscriptionSchema.pre(
  "validate",
  function (this: HydratedDocument<ISubscription>, next: CallbackWithoutResultAndOptionalError) {
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

    next();
  }
);


// Auto-expire subscriptions
// subscriptionSchema.pre("save", function (next: (err?: Error) => void) {
//   const doc = this as HydratedDocument<ISubscription>;

//   if (doc.renewalDate < new Date()) {
//     doc.status = "expired";
//   }

//   next();
// });

/** --- Model --- */
const SubscriptionModel: Model<ISubscription> =
  mongoose.models.Subscription ||
  model<ISubscription>("Subscription", subscriptionSchema);

export default SubscriptionModel;
