import express, { type NextFunction, type Request, type Response} from 'express';
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import {Queue} from 'bullmq';
import IORedis from 'ioredis';

import { env } from './config/env.ts';
import { createRateLimiter } from './middleware/middleware.ts';
import { InMemoryFixedWindowStore } from './rate-limiter/memory-store.ts';
import { IpKeyStrategy } from './rate-limiter/key-strategies.ts';

import authRoutes from './routes/auth.routes.js';
// import userRoutes from './routes/user.routes.js'
import subscriptionRouter from './routes/subscription.routes.js'
// import errorMiddleware from './middleware/error.middleware.js';
// import authorize from './middleware/auth.middleware.js';

export const app = express();

const redisConnection = new IORedis();
const stepQueue = new Queue("workflow-steps", { connection: redisConnection });

const limiter = createRateLimiter({
    windowMs: 60_000,
    max: 2,
    store: new InMemoryFixedWindowStore({ cleanupIntervalMs: 60_000 }),
    keyStrategy: new IpKeyStrategy(),
    skip: (req) => req.path === "/health",
    standardHeaders: true,
    legacyHeaders: false
})

/**
 * 0) Reverse proxy awareness (ALB/Nginx/Cloudflare)
 * Needed for correct req.ip and secure cookies behind proxy.
 */
app.set("trust proxy", 1);

/**
 * 1) Security headers
 */
app.use(helmet());

/**
 * 2) CORS
 * Lock this down to your frontend domains in production.
 */
app.use(cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
}))

/**
 * 3) Request logging
 * In prod: "combined". In dev: "dev".
 */
app.use(morgan(env.NODE_ENV === "production" ? 'combined' : 'dev'));

/**
 * 4) Body parsing (limits to prevent abuse)
 */
app.use(express.json({ limit: "1mb"}));
app.use(express.urlencoded({ extended: true, limit: "1mb"}));

/**
 * 5) Cookie parsing
 * Put after trust proxy + before routes that depend on cookies.
 */
app.use(cookieParser());

/**
 * 6) Compression (usually after parsing)
 */
app.use(compression())


/**
 * 7) Rate limiting (place before routes)
 * Use your own implementation if you want better control / Redis.
 */

app.use(limiter);

/**
 * 8) Routes
 */
app.get("/health", (_req, res) => res.json({ ok: true }));

// app.use('/api/users', authorize, userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/subscription', subscriptionRouter);
// app.use(errorMiddleware);

app.get('/', (req, res) => {
    res.send('Hello World!' );
})
// app.listen(env.PORT, async () => {
//     console.log(`Subscription Tracker API is running on http://localhost:${env.PORT}`);
// })

app.post("/start", async (req, res) => {
  const initialData = req.body;
  // push step1 job with initial data
  const job = await stepQueue.add("step1", { initialData }, { removeOnComplete: true });
  res.json({ jobId: job.id})
});

/**
 * 9) 404 handler (after routes)
 */
app.use((_req, res) => {
  res.status(404).json({ error: "not_found", message: "Route not found" });
});


/**
 * 10) Central error handler (must be last)
 */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Add special handling for Zod errors if you use zod validation
  // if (err instanceof ZodError) { ... }

  if (err instanceof Error) {
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
  return res.status(500).json({ error: "internal_error", message: "Unknown error" });
});
