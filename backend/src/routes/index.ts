import { Router } from 'express';
import focusSessionRouter from '../modules/focus-sessions/focus-sessions.router';
import planningSessionRouter from '../modules/planning-sessions/planning-sessions.router';
import syncProviderRouter from '../modules/sync/providers/google.router';
import tasksRouter from '../modules/tasks/tasks.router';
import timeblocksRouter from '../modules/timeblocks/timeblocks.router';

const router = Router();

router.use('/tasks', tasksRouter);
router.use('/timeblocks', timeblocksRouter);
router.use('/planning-sessions', planningSessionRouter);
router.use('/focus-sessions', focusSessionRouter);
router.use('/sync/providers/google', syncProviderRouter);

export default router;
