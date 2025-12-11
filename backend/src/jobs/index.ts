import { startHeartbeatJob } from './heartbeat';
import { startRolloverJob } from './rollover';
import { startDigestJob } from './digests';

export const startBackgroundJobs = () => {
  startHeartbeatJob();
  startRolloverJob();
  startDigestJob();
};
