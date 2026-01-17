import type { Request } from 'express'
import type { RateLimitKeyStrategy } from '../types/rate-limiter.types'

export class IpKeyStrategy implements RateLimitKeyStrategy {
    getKey(req: Request): string {
        return req.ip || "unknown-ip";
    }
}

export class ApiKeyHeaderStrategy implements RateLimitKeyStrategy {
    constructor(private readonly headerName: string = 'x-api-key') {}
    getKey(req: Request): string {
        const v = req.header(this.headerName);
        return v ? `apiKey:${v}` : `ip:${req.ip || 'unknown-ip'}`
    }
}