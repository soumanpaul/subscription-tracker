import mongoose, { Schema, model, Types } from "mongoose";

const ReminderSchema = new Schema(
  {
    offsetDays: { type: Number, required: true }, // 30, 7, 1
    scheduledFor: { type: Date, required: true },
    jobId: { type: String, required: true, index: true },
    sentAt: { type: Date },
    status: {
      type: String,
      enum: ["SCHEDULED", "SENT", "CANCELLED"],
      default: "SCHEDULED"
    }
  },
  { _id: false }
);

const subscriptionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["USD", "EUR", "GBP"], default: "USD" },

    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
      required: true
    },

    category: {
      type: String,
      enum: ["sports", "news", "entertainment", "lifestyle", "technology", "finance", "politics", "other"],
      required: true
    },

    status: {
      type: String,
      enum: ["active", "cancelled", "expired"],
      default: "active",
      index: true
    },

    startDate: { type: Date, required: true },
    renewalDate: { type: Date, required: true, index: true },

    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    // 🔑 predefined reminders (in days)
    reminderOffsets: {
      type: [Number],
      default: [30, 7, 1]
    },

    // 🔑 persisted workflow state
    reminders: {
      type: [ReminderSchema],
      default: []
    }
  },
  { timestamps: true }
);

// Auto-calculate renewal date safely
subscriptionSchema.pre("validate", function (next) {
  if (!this.renewalDate) {
    const daysMap = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      yearly: 365
    };

    const days = daysMap[this.frequency];
    this.renewalDate = new Date(this.startDate);
    this.renewalDate.setUTCDate(this.renewalDate.getUTCDate() + days);
  }

  next();
});


// Auto-expire subscriptions
subscriptionSchema.pre("save", function (next) {
  if (this.renewalDate < new Date()) {
    this.status = "expired";
  }
  next();
});
//  Model from schema
export default model("Subscription", subscriptionSchema);