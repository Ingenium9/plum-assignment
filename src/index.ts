import dotenv from 'dotenv';
dotenv.config();
//import "dotenv/config";
import express from 'express';
import fs from 'fs';
import path from 'path';
import processRoutes from './routes/process.route';


const app = express();
const PORT = process.env.PORT || 3000;

// Built-in JSON parser
app.use(express.json());

// Ensure uploads dir exists for Tesseract preprocessed images
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Simple health endpoint (important for Render)
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Main API
app.use('/api', processRoutes);

// Landing page
app.get('/', (_req, res) => {
  res.send('Plum AI Billing Extractor Service is Running');
});

// Boot the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
