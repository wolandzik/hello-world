import app from './app';
import { startBackgroundJobs } from './jobs';
import { logError } from './lib/logger';

const port = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'test') {
  try {
    startBackgroundJobs();
  } catch (error) {
    logError({
      message: 'failed_to_start_background_jobs',
      error,
    });
  }
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on port ${port}`);
  });
}

export default app;
