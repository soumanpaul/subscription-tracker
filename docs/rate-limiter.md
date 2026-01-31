# Production note (important)
- In-memory limiting does not work correctly across multiple instances (multiple pods/PM2 cluster). For real production at scale, swap the store with Redis (same interface). If you want, I’ll paste a Redis store implementation using a single Lua script for atomic fixed-window or sliding-window (better), keeping the same middleware and tests.

Quick checklist to avoid IP bugs
If behind proxy/LB: app.set("trust proxy", 1)
Ensure proxy forwards X-Forwarded-For
Prefer API key or user id keys for authenticated routes (IP-only can punish NAT/shared networks)

If you tell me:
are you running single instance or multi-instance (k8s/PM2 cluster)?
do you want fixed window (simple) or sliding window/token bucket (smoother)?
…I’ll give you the best production variant (Redis + Lua) with the same SOLID structure.