import { Router } from 'express';
import { ProwlarrController } from '../controllers/prowlarr.controller';
import { TorznabController } from '../controllers/torznab.controller';
import { TrackerController } from '../controllers/tracker.controller';
import { RssService } from '../services/rss.service';
import { TrackerService } from '../services/tracker.service';

export function configureRoutes(rssService: RssService): Router {
  const router = Router();
  const torznabController = new TorznabController();
  const prowlarrController = new ProwlarrController();
  const trackerService = new TrackerService(rssService);
  const trackerController = new TrackerController(trackerService);

  router.post('/json/prowlarr/sync', prowlarrController.syncToProwlarr.bind(prowlarrController));

  router.get('/json/torrents', torznabController.getJsonTorrents);
  router.get('/download', torznabController.proxyDownload);
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
