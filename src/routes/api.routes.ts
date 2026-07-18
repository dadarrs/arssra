import { Router } from 'express';
import { TorznabController } from '../controllers/torznab.controller';
import { TrackerController } from '../controllers/tracker.controller';
import { RssService } from '../services/rss.service';

export function configureRoutes(rssService: RssService): Router {
  const router = Router();
  const torznabController = new TorznabController();
  const trackerController = new TrackerController(rssService);

  router.get('/json/torrents', torznabController.getJsonTorrents);
  router.get('/', torznabController.handleRequest);

  router.get('/json/trackers/definitions', trackerController.getDefinitions);
  router.get('/json/trackers', trackerController.getAllTrackers);
  router.post('/json/trackers', trackerController.createTracker);
  router.put('/json/trackers/:id', trackerController.updateTracker);
  router.delete('/json/trackers/:id', trackerController.deleteTracker);
  router.put('/json/trackers/:id/toggle', trackerController.toggleTracker);

  return router;
}
