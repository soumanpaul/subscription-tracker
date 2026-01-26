// BullMQ setup (queue + connection)

import { Queue } from "bullmq"
import IORedis from 'ioredis'

export const redis = new IORedis(process.env.REDIS_URL!);

export const reminderQueue = new Queue("subscription-remainders", {
    connection: redis
})
