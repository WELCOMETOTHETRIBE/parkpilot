import { z } from 'zod';

const envSchema = z.object({
  // Database - optional for health checks, required when actually using DB
  DATABASE_URL: z.string().url().optional(),

  // App (defaults so app starts with minimal .env)
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_PASSWORD: z.string().min(8).default('changeme123'),

  // APIs (optional; discover shows message if missing)
  SERPAPI_API_KEY: z.string().default(''),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  ALERT_EMAIL_FROM: z.string().email().optional(),

  // Logging
  DEBUG: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

type Env = z.infer<typeof envSchema>;

let validatedEnv: Env;

try {
  validatedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Environment validation failed:');
    const criticalErrors = error.errors.filter(err => 
      err.path[0] !== 'DATABASE_URL' // DATABASE_URL is optional for health checks
    );
    
    if (criticalErrors.length > 0) {
      criticalErrors.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    } else {
      // Only DATABASE_URL is missing, which is OK for health checks
      console.warn('Warning: DATABASE_URL is not set. Database features will not work.');
      validatedEnv = envSchema.parse({
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
        DEBUG: process.env.DEBUG || 'false',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      });
    }
  } else {
    throw error;
  }
}

export const env = validatedEnv;
