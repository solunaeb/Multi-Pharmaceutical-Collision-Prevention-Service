import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import healthRoutes from './routes/health.routes';
import profileRoutes from './routes/profile.routes';
import medicationRoutes from './routes/medication.routes';
import analysisRoutes from './routes/analysis.routes';
import ocrRoutes from './routes/ocr.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use(healthRoutes);
app.use(profileRoutes);
app.use(medicationRoutes);
app.use(analysisRoutes);
app.use(ocrRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
