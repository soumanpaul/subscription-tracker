- Express + TS + Mongoose setup and add Redis + BullMQ as the “QStash-like” piece to schedule + retry reminder emails.
Trigger workflow when subscription is created/updated
Fetch subscription from Mongo
Validate (exists? active?)
Evaluate renewal date
Schedule reminders (multiple offsets)
Send email when due + mark as sent (idempotent)
Complete