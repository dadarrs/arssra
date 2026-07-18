import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
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
