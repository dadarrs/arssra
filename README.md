# arssra

**Automated RSS to Torznab**

arssra is a powerful, lightweight service that bridges RSS feeds to Torznab APIs. It seamlessly integrates with Prowlarr to automate torrent indexing, fetching, and syncing, all wrapped in a responsive and native-feeling Material UI dashboard.

---

## Screenshots

<p align="center">
  <img src="images/light-mode.png" width="49%" alt="Light Mode Dashboard">
  <img src="images/dark-mode.png" width="49%" alt="Dark Mode Dashboard">
</p>

## Features

- **Automated RSS syncing:** Periodically pulls RSS feeds and indexes them locally.
- **Torznab API support:** Exposes indexed torrents via a standard Torznab endpoint, making it instantly compatible with the *arr stack (Sonarr, Radarr, Prowlarr).
- **Prowlarr integration:** Effortlessly sync and manage your indexers via a dedicated connection to your Prowlarr instance.
- **Material 3 UI:** A robust frontend built with Angular and Angular Material, featuring built-in light and dark themes that natively follow your system preferences.
- **Lightweight backend:** Powered by Node.js, Express, and Prisma with an embedded SQLite database.

## Supported trackers

arssra currently provides specialized RSS-to-Torznab indexing for the following trackers:

- **TV Chaos UK** (Broadcasting the best of British)

*More trackers can be supported by adding their definitions to the codebase.*

## Prowlarr integration

arssra features a fully automated integration with Prowlarr. Instead of manually configuring Torznab indexers, you can push the arssra configuration directly from the dashboard.

1. Open the arssra web dashboard.
2. Click the **Connect to Prowlarr** button at the top of the page.
3. Enter your Prowlarr URL (e.g., `http://192.168.1.100:9696`) and your Prowlarr API Key.
4. Enter your arssra URL so Prowlarr knows where to connect back (e.g., `http://192.168.1.100:3232`).
5. Click **Auto-Sync**. 

arssra will automatically create or update a dedicated "arssra" Torznab indexer inside your Prowlarr instance. Prowlarr will then seamlessly pass this indexer down to Sonarr and Radarr.

### Manual Torznab configuration

If you prefer not to use Prowlarr, or want to configure an *arr application manually, use the following Torznab details:

- **URL:** `http://<your-arssra-ip>:3232`
- **API Key:** Leave blank (or enter any string if required by the client)

## Installation (Docker)

The easiest and recommended way to install arssra is via Docker Compose.

1. Create a `docker-compose.yml` file:

```yaml
services:
  arssra:
    image: ghcr.io/dadarrs/arssra:latest
    container_name: arssra
    ports:
      - "3232:3232"
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
    volumes:
      - ./config:/app/config
    restart: unless-stopped
```

2. Start the container:

```bash
docker compose up -d
```

3. Access the web dashboard at `http://localhost:3232`.

### Environment variables

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `PUID` | User ID to run the app as (for file permissions) | `1000` |
| `PGID` | Group ID to run the app as | `1000` |
| `TZ` | Timezone | `Etc/UTC` |

## Local development

If you want to contribute or run the app locally from source, you can set up the backend and frontend separately.

### Prerequisites
- Node.js (v24+)
- npm

### Backend setup

1. Navigate to the root directory and install dependencies:
   ```bash
   npm install
   ```
2. Initialize the Prisma SQLite database:
   ```bash
   npm run pretest
   ```
3. Start the backend development server:
   ```bash
   npm run dev
   ```

### Frontend setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Angular development server:
   ```bash
   npm start
   ```

The frontend will proxy API requests to the backend automatically.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.