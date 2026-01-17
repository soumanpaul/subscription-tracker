import type { RateLimitDecision, RateLimitStore } from "../types/rate-limiter.types";

type Bucket = {
    windiwStartMs: number;
    count: number;
}

export class InMemoryFixedWindowStore implements RateLimitStore {
    private readonly buckets = new Map<string, Bucket>();
    private lastCleanupMs = 0;

    constructor(
        private readonly opts: {
            cleanupIntervalMs?: number;
            maxKeys?: number;
        } = {},
    ){}

    async consume(params: { key: string; windowMs: number; max: number; nowMs: number; }): Promise<RateLimitDecision> {
        const { key, windowMs, max, nowMs} = params;

        this.maybeCleanup(nowMs);

        const windiwStartMs = nowMs - (nowMs % windowMs);
        const resetEpochMs = windiwStartMs + windowMs;

        const existing = this.buckets.get(key);

        let count: number;
        if(!existing || existing.windiwStartMs !== windiwStartMs) {
            count = 1;
            this.buckets.set(key, { windiwStartMs, count })
        } else {
            existing.count +=1;
            count = existing.count;
        }

        const allowed = count <= max;
        const remaining = Math.max(0, max - count);

        const decision: RateLimitDecision = {
            allowed,
            limit: max,
            remaining,
            resetEpochMs,
        };

        if(!allowed) {
            const retryAfterSeconds = Math.max(0, Math.ceil((resetEpochMs - nowMs)/1000));
            decision.retryAfterSeconds = retryAfterSeconds;
        }

        // Basic guardrail to avoid unbounded memory growth
        const maxKeys = this.opts.maxKeys ?? 200_000;
        if(this.buckets.size > maxKeys) {
            this.buckets.clear();
        }
        return decision;
    }

    private maybeCleanup(nowMs: number): void {
        const interval = this.opts.cleanupIntervalMs ?? 60_000;
        if(nowMs - this.lastCleanupMs < interval) return;

        this.lastCleanupMs = nowMs;

        for(const [key, buckets] of this.buckets.entries()) {
            if(nowMs - buckets.windiwStartMs > interval * 2) {
                this.buckets.delete(key);
            }
        }
    }
}
