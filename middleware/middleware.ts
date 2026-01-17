import type { NextFunction, Request, Response } from 'express';
import type { RateLimitKeyStrategy, RateLimitStore } from '../types/rate-limiter.types';

export type RateLimiterOptions = {
    windowMs: number;
    max: number;
    store: RateLimitStore;
    keyStrategy: RateLimitKeyStrategy;

    // allow list (health checks, internal)
    skip?: (req: Request) => boolean;

    // response shape + behavior
    message?: string;
    statusCode?: number;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
}

export function createRateLimiter(opts: RateLimiterOptions) {
    const {
        windowMs,
        max,
        store,
        keyStrategy,
        skip,
        message= "Too many requests, please try again later",
        statusCode = 429,
        standardHeaders = true,
        legacyHeaders = false
    } = opts;

    if(windowMs <=0) throw new Error("WindowMs must be > 0");
    if(max <= 0) throw new Error("max must be > 0");

    return async function rateLimiter(req: Request, res: Response, next: NextFunction) {
        try {
            if(skip?.(req)) return next();
            
            const nowMs = Date.now();
            const key = keyStrategy.getKey(req);

            const decision = await store.consume({
                key,
                windowMs,
                max,
                nowMs,
            });

            if(standardHeaders) {
                res.setHeader("RateLimit-Limit", String(decision.limit));
                res.setHeader("RateLimit-Remaining", String(decision.remaining));
                res.setHeader("RateLimit-Reset", String(Math.ceil(decision.resetEpochMs)))
            }

            if(legacyHeaders) {
                res.setHeader("X-RateLimit-Limit", String(decision.limit));
                res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
                res.setHeader("X-RateLimit-Rest", String(Math.ceil(decision.resetEpochMs / 1000)));

            }
            if(!decision.allowed) {
                if(decision.retryAfterSeconds != null) {
                    res.setHeader("Retry-After", String(decision.retryAfterSeconds))
                }
                return res.status(statusCode).json({
                    error: "rate_limit_exceeded",
                    message,
                    limit: decision.remaining,
                    resetEpochMs: decision.resetEpochMs
                })
            }
            return next();
        } catch (err) {
            // Fail-open vs fail-closed depends on risk appetite.
            // For most apps: fail-open (don't take down API if store is down)
            return next();
        }
    };
}

