import express from 'express';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import router from './routes';

const app = express();
app.use(express.json());
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(router);

app.use(errorHandler);

export default app;
