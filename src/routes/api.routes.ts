import { Router } from 'express';
import { TorznabController } from '../controllers/torznab.controller';
import { TrackerController } from '../controllers/tracker.controller';
import { RssService } from '../services/rss.service';

import { TrackerService } from '../services/tracker.service';

export function configureRoutes(rssService: RssService): Router {
  const router = Router();
  const torznabController = new TorznabController();
  const trackerService = new TrackerService(rssService);
  const trackerController = new TrackerController(trackerService);

  router.get('/json/torrents', torznabController.getJsonTorrents);
  router.get('/', torznabController.handleRequest);

  router.get('/json/trackers/schedules', trackerController.getSchedules);
  router.get('/json/trackers/definitions', trackerController.getDefinitions);
  router.get('/json/trackers', trackerController.getAllTrackers);
  router.post('/json/trackers', trackerController.createTracker);
  router.put('/json/trackers/:id', trackerController.updateTracker);
  router.delete('/json/trackers/:id', trackerController.deleteTracker);
  router.put('/json/trackers/:id/toggle', trackerController.toggleTracker);

  return router;
}
