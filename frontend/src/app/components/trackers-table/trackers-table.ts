import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';
import { ApiService } from '../../services/api.service';

import { AddTrackerModal } from '../add-tracker-modal/add-tracker-modal';
import { ProwlarrSyncModal } from '../prowlarr-sync-modal/prowlarr-sync-modal';

@Component({
  selector: 'app-trackers-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatDialogModule,
    RelativeTimePipe
  ],
  templateUrl: './trackers-table.html',
  styleUrl: './trackers-table.css',
})
export class TrackersTable implements OnInit, OnDestroy, AfterViewInit {
  trackersDataSource = new MatTableDataSource<any>();
  trackerColumns: string[] = ['name', 'lastRun', 'nextRun', 'refreshStatus', 'apiStatus', 'torrentCount', 'status', 'actions'];
  refreshInterval: any;

  @ViewChild('trackerSort') trackerSort!: MatSort;
  @ViewChild('deleteConfirmDialog') deleteConfirmDialog!: TemplateRef<any>;

  trackerToDelete: number | null = null;

  get hasActiveTrackers(): boolean {
    return this.trackersDataSource.data.some(t => t.active);
  }

  isCooldownActive(t: any): boolean {
    return !!t.apiCooldownUntil && new Date(t.apiCooldownUntil).getTime() > Date.now();
  }

  constructor(
    private readonly api: ApiService,
    private readonly dialog: MatDialog,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.fetchTrackers();
    this.refreshInterval = setInterval(() => {
      this.fetchTrackers();
    }, 60000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  ngAfterViewInit() {
    this.trackersDataSource.sort = this.trackerSort;
  }

  fetchTrackers() {
    this.api.getTrackers().subscribe((res) => {
      this.trackersDataSource.data = res;
      
      const hasApi = res.some((t: any) => t.allowApi);
      if (hasApi) {
        this.trackerColumns = ['name', 'lastRun', 'nextRun', 'refreshStatus', 'apiStatus', 'torrentCount', 'status', 'actions'];
      } else {
        this.trackerColumns = ['name', 'lastRun', 'nextRun', 'refreshStatus', 'torrentCount', 'status', 'actions'];
      }
      
      this.cdr.detectChanges();
    });
  }

  toggleTracker(id: number, active: boolean) {
    this.api.toggleTracker(id, active).subscribe(() => {
      this.fetchTrackers();
    });
  }

  deleteTracker(id: number) {
    this.trackerToDelete = id;
    this.dialog.open(this.deleteConfirmDialog, { width: '400px' });
  }

  confirmDelete() {
    if (this.trackerToDelete !== null) {
      this.api.deleteTracker(this.trackerToDelete).subscribe(() => {
        this.fetchTrackers();
        this.dialog.closeAll();
        this.trackerToDelete = null;
      });
    }
  }

  openAddTrackerDialog() {
    const dialogRef = this.dialog.open(AddTrackerModal, { 
      width: '600px',
      data: { tracker: null }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.fetchTrackers();
    });
  }

  editTracker(tracker: any) {
    const dialogRef = this.dialog.open(AddTrackerModal, { 
      width: '600px',
      data: { tracker }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.fetchTrackers();
    });
  }

  openProwlarrModal() {
    this.dialog.open(ProwlarrSyncModal, { 
      width: '600px',
      data: { hasActiveTrackers: this.hasActiveTrackers }
    });
  }
}
