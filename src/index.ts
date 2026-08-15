import dotenv from 'dotenv';
const _log = console.log;
console.log = () => {};
dotenv.config();
console.log = _log;

if (process.env.NODE_ENV !== 'test') {
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;

  const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
  };

  const formatTime = (color: string) => `${color}[${new Date().toISOString()}]${colors.reset}`;

  console.log = (...args) => originalLog(formatTime(colors.gray), ...args);
  console.info = (...args) => originalInfo(formatTime(colors.cyan), ...args);
  console.warn = (...args) => originalWarn(formatTime(colors.yellow), ...args);
  console.error = (...args) => originalError(formatTime(colors.red), ...args);
}

import express from 'express';
import path from 'node:path';
import { configureRoutes } from './routes/api.routes';
import { RssService } from './services/rss.service';

class App {
  public app: express.Application;
  private readonly port: string | number;
  private readonly rssService: RssService;

  constructor() {
    this.app = express();
    this.app.use(express.json()); // enable JSON body parsing
    this.port = process.env.PORT || 3232;
    this.rssService = new RssService();

    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.app.use('/api', configureRoutes(this.rssService));

    // Serve static frontend files
    const frontendPath = path.join(__dirname, '../frontend/dist/frontend/browser');
    this.app.use(express.static(frontendPath));

    // Fallback for Angular routing
    this.app.use((_req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`Torznab server listening on port ${this.port}`);
      this.rssService.initializeCronJobs();
    });
  }
}

export const server = new App();

// Only start the server if this file is run directly
if (require.main === module) {
  server.start();
}
