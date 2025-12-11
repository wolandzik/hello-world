import express from 'express';
import googleSyncRouter from './routes/googleSync';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/sync/providers/google', googleSyncRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on port ${port}`);
  });
}

export default app;
