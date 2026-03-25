import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectionsRouter } from './routes/connections.js';
import { tokensRouter } from './routes/tokens.js';
import { auditRouter } from './routes/audit.js';
import { authRouter } from './routes/auth.js';
import { providersRouter } from './routes/providers.js';
import { errorHandler } from './middleware/error-handler.js';
import { authenticate } from './middleware/auth.js';
import { rateLimit } from './middleware/rate-limit.js';

const app = express();
const port = process.env.PORT ?? 3100;

app.use(helmet());
app.use(
  cors({ origin: process.env.DASHBOARD_URL ?? 'http://localhost:3200' }),
);
app.use(express.json());
app.use(morgan('short'));
app.use(rateLimit());

app.use('/api/auth', authRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

app.use('/api/connections', authenticate, connectionsRouter);
app.use('/api/tokens', authenticate, tokensRouter);
app.use('/api/audit', authenticate, auditRouter);
app.use('/api/providers', authenticate, providersRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Keygate server running on port ${port}`);
});

export default app;
