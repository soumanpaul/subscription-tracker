import { config } from 'dotenv';
import { z } from 'zod';

const NODE_ENV_RAW = process.env.NODE_ENV ?? "development";

// Load env
config({path: `.env.${NODE_ENV_RAW}.local`});

// Parsers
const numberFromString = z.string().trim().pipe(z.coerce.number());
const durationString = z.string().trim().min(1, "Duration string is required");

// Schema
const EnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', "production"]).default("development"),
    PORT: numberFromString.default(3000),
    DB_URI: z.string().min(1, "DB_URI is required"),
    JWT_SECRET: z.string().min(1, "JWT_SECRET must be at least 16 characters"),
    JWT_EXPIRES_IN: durationString.default("15m"),
})
.superRefine((val, ctx) => {
    // strong secret required only in production
    if(val.NODE_ENV === 'production' && val.JWT_SECRET.length < 32) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["JWT_SECRET"],
            message: "JWT_SECRET must be at least 32 characters in production"
        })
    }
})

// Validate and freeze env
const parsed = EnvSchema.safeParse(process.env);

if(!parsed.success) {
    const errors = parsed.error.issues
        .map((i) => `- ${i.path.join(".")} : ${i.message}`)
        .join("\n");

    throw new Error(`X Invalid environment variables:\n${errors}`);        
}

export const env = Object.freeze(parsed.data);
export type Env = z.infer<typeof EnvSchema>;
