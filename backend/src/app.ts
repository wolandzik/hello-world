import express from 'express';
import { logError } from './lib/logger';
import { prisma } from './lib/prisma';
import { pingRedis } from './lib/redis';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import router from './routes';

type HealthStatus = 'up' | 'down' | 'skipped';

const shouldSkipHealthChecks = () =>
  process.env.HEALTHCHECK_SKIP_DEPENDENCIES === 'true' || process.env.NODE_ENV === 'test';

const checkDatabase = async (): Promise<HealthStatus> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'up';
  } catch (error) {
    logError({ message: 'database_health_check_failed', error });
    return 'down';
  }
};

const checkRedis = async (): Promise<HealthStatus> => {
  try {
    return await pingRedis();
  } catch (error) {
    logError({ message: 'redis_health_check_failed', error });
    return 'down';
  }
};

const buildHealthChecks = async () => {
  if (shouldSkipHealthChecks()) {
    return { db: 'skipped', redis: 'skipped' } as const;
  }

  const [db, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  return { db, redis } as const;
};

const app = express();
app.use(express.json());
app.use(requestLogger);

app.get('/health', async (_req, res) => {
  const checks = await buildHealthChecks();
  const isHealthy = Object.values(checks).every(
    (status) => status === 'up' || status === 'skipped'
  );

  res.json({
    status: isHealthy ? 'ok' : 'degraded',
    checks,
  });
});

app.use(router);

app.use(errorHandler);

export default app;
