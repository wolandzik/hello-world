import { connect } from 'node:net';

type RedisHealth = 'up' | 'down';

const DEFAULT_REDIS_URL = 'redis://localhost:6379';

const getRedisUrl = () => process.env.REDIS_URL ?? DEFAULT_REDIS_URL;

export const pingRedis = async (): Promise<RedisHealth> => {
  const redisUrl = new URL(getRedisUrl());
  const port = Number(redisUrl.port || 6379);

  return new Promise<RedisHealth>((resolve) => {
    const socket = connect({ host: redisUrl.hostname, port });
    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    const resolveDown = () => {
      cleanup();
      resolve('down');
    };

    socket.on('connect', () => {
      socket.write('*1\r\n$4\r\nPING\r\n');
    });

    socket.on('data', (data) => {
      const isPong = data.toString().toUpperCase().includes('PONG');
      cleanup();
      resolve(isPong ? 'up' : 'down');
    });

    socket.on('error', resolveDown);
    socket.on('timeout', resolveDown);
    socket.setTimeout(500);
  });
};

export const getRedisConfig = () => ({
  url: getRedisUrl(),
});
