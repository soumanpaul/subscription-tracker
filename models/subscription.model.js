import {Schema, model, Types } from "mongoose";

const ReminderSchema = new Schema(
    {
        offsetDays: { type: Number, required: true},
        scheduledFor: { type: Date, required: true},
        jobId: { type: String, required: true},
        sentAt: { type: Date },
        status: { type: String, enum: ["SCHEDULED", 'SENT', "CANCELLED"], default: "SCHEDULED" }
    },
    { _id: false}
);

// schema
const subscriptionSchema = new Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        minLength: 2,
        maxLength: 100
    },
    price: {
        type: Number,
        required: [true, "Subscription price is required"],
        min: [0, "Price must be greater than 0"]
    },
    currency: {
        type: String,
        enum: ['USD', 'EUR', 'GBP'],
        default: 'USD'
    },
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
    },
    catagory: {
        type: String,
        enum: ['sports', 'news', 'entertainment', 'lifestyle', 'technology', 'finance', 'politics', 'other'],
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'cancelled', 'expired'],
        default: 'active'
    },
    startDate: {
        type: Date,
        required: true,
        // validate: {
        //     validate:function(value) {
        //         return value < this.startDate;
        //     },
        //     message: "start date must be "
        // }
    },
    renewalDate: {
        type: Date,
        // required: true,
        // validate: {
        //     validator: function (value) {
        //         return value > this.startDate;
        //     },
        //     message: "Renewal date must be after this start date"
        // }
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    remainderOffsets: { type: Date,  default: [30, 7, 1]},
    remainders: { type: [ReminderSchema], default: []}
}, { timeseries: true})

// Auto-calculate renewal date if missing.
subscriptionSchema.pre('save', async function(){
    if(!this.renewalDate) {
        const renewalPeriods = {
            daily: 1,
            weekly: 7,
            monthly: 30,
            yearly: 365,
        }

        this.renewalDate = new Date(this.startDate);
        this.renewalDate.setDate(this.renewalDate.getDate() + renewalPeriods[this.frequency])
    }

    // auto-update the status if renewal date has passed
    if(this.renewalDate < new Date()) {
        this.status = 'expired'
    }
})

//  Model from schema
export default model("Subscription", subscriptionSchema);
