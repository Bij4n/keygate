import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectionsRouter } from './routes/connections.js';
import { tokensRouter } from './routes/tokens.js';
import { auditRouter } from './routes/audit.js';
import { authRouter } from './routes/auth.js';
import { providersRouter } from './routes/providers.js';
import { oauthRouter } from './routes/oauth.js';
import { errorHandler } from './middleware/error-handler.js';
import { authenticate } from './middleware/auth.js';
import { rateLimit } from './middleware/rate-limit.js';
import { shutdown as shutdownPool } from './db/pool.js';

const app = express();
const port = process.env.PORT ?? 3100;

app.use(helmet());
app.use(
  cors({
    origin: process.env.DASHBOARD_URL ?? 'http://localhost:3200',
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan('short'));
app.use(rateLimit());

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/oauth', oauthRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

// Protected routes
app.use('/api/connections', authenticate, connectionsRouter);
app.use('/api/tokens', authenticate, tokensRouter);
app.use('/api/audit', authenticate, auditRouter);
app.use('/api/providers', authenticate, providersRouter);

app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`Keygate server running on port ${port}`);
});

async function gracefulShutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await shutdownPool();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
