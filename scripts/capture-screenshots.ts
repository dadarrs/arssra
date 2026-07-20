import { PrismaClient } from '@prisma/client';
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

async function main() {
  const dbPath = path.join(__dirname, '../config/torrents.db');
  const backupPath = path.join(__dirname, '../config/torrents.db.bak');
  const shmPath = path.join(__dirname, '../config/torrents.db-shm');
  const walPath = path.join(__dirname, '../config/torrents.db-wal');

  // Backup existing DB and WAL files
  if (fs.existsSync(dbPath)) fs.renameSync(dbPath, backupPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);

  let serverProcess: any;

  try {
    process.env.PORT = '3233';

    console.log('Pushing database schema...');
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });

    console.log('Seeding fake data...');
    const prisma = new PrismaClient();

    await prisma.torrent.deleteMany({});
    await prisma.tracker.deleteMany({});

    await prisma.tracker.create({
      data: {
        name: 'Ubuntu Linux ISOs',
        url: 'https://ubuntu.com/rss',
        lastStatus: 'OK',
        lastRun: new Date(),
        lastAddedCount: 12,
      },
    });

    const torrents = [
      {
        title: 'Ubuntu 24.04 LTS Desktop (amd64)',
        size: 4.5 * 1024 * 1024 * 1024,
        category: 'ISO',
      },
      { title: 'Big Buck Bunny 1080p 60fps', size: 1.2 * 1024 * 1024 * 1024, category: 'Movie' },
      { title: 'Sintel - 4K Open Movie', size: 8.5 * 1024 * 1024 * 1024, category: 'Movie' },
      { title: 'Debian 12.0 netinst', size: 350 * 1024 * 1024, category: 'ISO' },
      { title: 'Arch Linux 2024.01.01 x86_64', size: 850 * 1024 * 1024, category: 'ISO' },
      { title: 'Tears of Steel 1080p', size: 2.1 * 1024 * 1024 * 1024, category: 'Movie' },
    ];

    for (let i = 0; i < torrents.length; i++) {
      await prisma.torrent.create({
        data: {
          title: torrents[i].title,
          guid: `mock-guid-${i}-${Math.random()}`,
          link: `https://example.com/download/${i}`,
          size: torrents[i].size,
          trackerName: 'Ubuntu Linux ISOs',
          category: torrents[i].category,
          pubDate: new Date().toISOString(),
        },
      });
    }

    await prisma.$disconnect();

    console.log('Building frontend...');
    execSync('npm run build', { cwd: path.join(__dirname, '../frontend'), stdio: 'inherit' });

    console.log('Starting backend server...');
    serverProcess = spawn('npx', ['ts-node', 'src/index.ts'], {
      env: process.env,
      stdio: 'inherit',
      detached: true,
    });

    // wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log('Launching Puppeteer...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // ensure images directory exists
    const imgDir = path.join(__dirname, '../images');
    if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir);

    console.log('Capturing Light Mode...');
    await page.goto('http://localhost:3233');
    await new Promise((resolve) => setTimeout(resolve, 3000)); // wait for angular to load
    await page.screenshot({ path: path.join(imgDir, 'light-mode.png') });

    console.log('Switching to Dark Mode...');
    await page.evaluate(() => {
      const toggle = document.querySelector('mat-toolbar button[mat-icon-button]') as HTMLElement;
      if (toggle) toggle.click();
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log('Capturing Dark Mode...');
    await page.screenshot({ path: path.join(imgDir, 'dark-mode.png') });

    await browser.close();
  } finally {
    if (serverProcess?.pid) {
      try {
        process.kill(-serverProcess.pid);
      } catch {
        // ignore if already killed
      }
    }

    console.log('Restoring original database...');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);

    if (fs.existsSync(backupPath)) fs.renameSync(backupPath, dbPath);
    console.log('Screenshots captured successfully in /images!');
  }
}

main().catch(console.error);
