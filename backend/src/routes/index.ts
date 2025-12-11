import { Router } from 'express';
import focusSessionRouter from '../modules/focus-sessions/focus-sessions.router';
import breaksRouter from '../modules/breaks/breaks.router';
import highlightsRouter from '../modules/highlights/highlights.router';
import objectivesRouter from '../modules/objectives/objectives.router';
import planningSessionRouter from '../modules/planning-sessions/planning-sessions.router';
import syncProviderRouter from '../modules/sync/providers/google.router';
import tasksRouter from '../modules/tasks/tasks.router';
import timeblocksRouter from '../modules/timeblocks/timeblocks.router';

const router = Router();

router.use('/tasks', tasksRouter);
router.use('/timeblocks', timeblocksRouter);
router.use('/planning-sessions', planningSessionRouter);
router.use('/focus-sessions', focusSessionRouter);
router.use('/breaks', breaksRouter);
router.use('/highlights', highlightsRouter);
router.use('/objectives', objectivesRouter);
router.use('/sync/providers/google', syncProviderRouter);

export default router;
