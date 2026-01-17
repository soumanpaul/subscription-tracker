export type RateLimitDecision = {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetEpochMs: number;
    retryAfterSeconds?: number;
}

export interface RateLimitStore {
    // Atomically increments and returns window counters for a key
    consume(params: {
        key: string;
        windowMs: number;
        max: number;
        nowMs: number
    }): Promise<RateLimitDecision>
}

export interface RateLimitKeyStrategy {
    getKey(req: import("express").Request): string;
}