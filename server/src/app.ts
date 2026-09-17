import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import rewardRoutes from './routes/rewardRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import clockRoutes from './routes/clockRoutes.js';
import outboxRoutes from './routes/outboxRoutes.js';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN.split(',').map((value) => value.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/', (_req, res) => res.json({ name: 'CaféPoints API', status: 'ok' }));
app.use('/clock', clockRoutes);
app.use('/outbox', outboxRoutes);
app.use('/api/clock', clockRoutes);
app.use('/api/outbox', outboxRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.' } }));
app.use(errorHandler);
