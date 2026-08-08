import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { TorrentsTable } from '../components/torrents-table/torrents-table';
import { TrackersTable } from '../components/trackers-table/trackers-table';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TrackersTable,
    TorrentsTable,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent {
}
