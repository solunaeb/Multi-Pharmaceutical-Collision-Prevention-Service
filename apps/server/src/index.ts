import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { dataLoader } from './services/dataLoader.service';

const PORT = process.env.PORT || 3001;

// Load drug safety data into memory
dataLoader.load();

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
});
