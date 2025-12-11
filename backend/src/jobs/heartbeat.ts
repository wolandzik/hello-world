import { setInterval } from 'node:timers';
import { log } from '../lib/logger';
import { pingRedis } from '../lib/redis';

const HEARTBEAT_INTERVAL_MS = 60_000;
let interval: NodeJS.Timeout | null = null;

export const startHeartbeatJob = () => {
  if (interval) {
    return interval;
  }

  interval = setInterval(async () => {
    const redisStatus = await pingRedis();
    log({
      level: 'info',
      message: 'heartbeat_job',
      redisStatus,
    });
  }, HEARTBEAT_INTERVAL_MS);

  return interval;
};

export const stopHeartbeatJob = () => {
  if (!interval) {
    return;
  }

  clearInterval(interval);
  interval = null;
};
