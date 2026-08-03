import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild
} from '@angular/core';

import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../services/api.service';

import { RelativeTimePipe } from '../pipes/relative-time.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    NgClass,
    CommonModule,

    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatSelectModule,
    MatAutocompleteModule,
    RelativeTimePipe,
    MatSortModule,
    MatTooltipModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  public get dialog(): MatDialog {
    return this._dialog;
  }
  torrentsDataSource = new MatTableDataSource<any>();
  trackersDataSource = new MatTableDataSource<any>();

  get hasActiveTrackers(): boolean {
    return this.trackersDataSource.data.some(t => t.active);
  }

  refreshInterval: any;

  definitions: any[] = [];
  schedules: any[] = [];
  totalCount = 0;

  newTrackerDefId = '';
  newTrackerName = '';
  newTrackerUrl = '';
  newTrackerSchedule = '*/30 * * * *';
  editingTrackerId: number | null = null;
  trackerToDelete: number | null = null;

  get selectedTrackerDef(): any {
    return this.definitions.find((d) => d.id === this.newTrackerDefId);
  }

  prowlarrUrl = 'http://localhost:9696';
  prowlarrApiKey = '';
  arssraUrl = 'http://localhost:3232';
  prowlarrSyncStatus: 'idle' | 'syncing' | 'success' | 'error' = 'idle';
  prowlarrSyncMessage = '';

  searchQuery = '';
  isLoadingMore = false;
  hasMoreData = true;
  private searchTimer: any;

  trackerColumns: string[] = ['name', 'lastRun', 'nextRun', 'refreshStatus', 'status', 'actions'];
  torrentColumns: string[] = ['title', 'tracker', 'category', 'size', 'pubDate', 'action'];

  @ViewChild('trackerSort') trackerSort!: MatSort;
  @ViewChild('torrentSort') torrentSort!: MatSort;
  @ViewChild('addTrackerDialog') addTrackerDialog!: TemplateRef<any>;
  @ViewChild('deleteConfirmDialog') deleteConfirmDialog!: TemplateRef<any>;
  @ViewChild('prowlarrSyncDialog') prowlarrSyncDialog!: TemplateRef<any>;

  constructor(
    private readonly api: ApiService,
    private readonly _dialog: MatDialog,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit() {
    this.trackersDataSource.sort = this.trackerSort;
    this.torrentsDataSource.sort = this.torrentSort;
    this.torrentsDataSource.sortingDataAccessor = (item, property) => {
      if (property === 'pubDate') return item.created_at || item.pubDate;
      if (property === 'tracker') return item.trackerName || '';
      return item[property];
    };
  }

  ngOnInit() {
    this.fetchTorrents();
    this.fetchTrackers();
    this.fetchDefinitions();
    this.fetchSchedules();

    // Poll every 60 seconds to update Torrents and Trackers
    this.refreshInterval = setInterval(() => this.backgroundRefresh(), 60000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  backgroundRefresh() {
    this.fetchTrackers();
    this.fetchSchedules();
    
    // Fetch exactly as many torrents as the user has already loaded so we don't break infinite scroll
    const currentLimit = Math.max(50, this.torrentsDataSource.data.length);
    this.api.getTorrents(this.searchQuery, 0, currentLimit).subscribe((res) => {
      this.torrentsDataSource.data = res.items;
      this.totalCount = res.totalCount;
      if (this.torrentsDataSource.data.length >= res.totalCount) {
        this.hasMoreData = false;
      }
      this.cdr.detectChanges();
    });
  }

  fetchTorrents() {
    this.hasMoreData = true;
    this.api.getTorrents(this.searchQuery).subscribe((res) => {
      this.torrentsDataSource.data = res.items;
      this.totalCount = res.totalCount;
      if (this.torrentsDataSource.data.length >= res.totalCount) {
        this.hasMoreData = false;
      }
      this.cdr.detectChanges();
    });
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    if (this.isLoadingMore || !this.hasMoreData) return;

    // Check if we are near the bottom of the page
    const pos =
      (document.documentElement.scrollTop || document.body.scrollTop) +
      document.documentElement.offsetHeight;
    const max = document.documentElement.scrollHeight;

    if (pos >= max - 200) {
      this.loadMoreTorrents();
    }
  }

  loadMoreTorrents() {
    if (this.torrentsDataSource.data.length >= this.totalCount) {
      this.hasMoreData = false;
      return;
    }

    this.isLoadingMore = true;
    const offset = this.torrentsDataSource.data.length;

    this.api.getTorrents(this.searchQuery, offset).subscribe((res) => {
      this.torrentsDataSource.data = [...this.torrentsDataSource.data, ...res.items];
      this.totalCount = res.totalCount;
      this.isLoadingMore = false;
      if (this.torrentsDataSource.data.length >= res.totalCount) {
        this.hasMoreData = false;
      }
      this.cdr.detectChanges();
    });
  }

  onSearchModel(value: string) {
    this.searchQuery = value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.fetchTorrents();
    }, 300);
  }

  onSearch(event: any) {
    this.searchQuery = event.target.value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.fetchTorrents();
    }, 300);
  }

  clearSearch() {
    this.searchQuery = '';
    this.fetchTorrents();
  }

  fetchTrackers() {
    this.api.getTrackers().subscribe((res) => {
      this.trackersDataSource.data = res;
      this.cdr.detectChanges();
    });
  }

  fetchDefinitions() {
    this.api.getTrackerDefinitions().subscribe((res) => {
      this.definitions = res;
      this.cdr.detectChanges();
    });
  }

  fetchSchedules() {
    this.api.getTrackerSchedules().subscribe((res) => {
      this.schedules = res;
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
    this.editingTrackerId = null;
    this.newTrackerDefId = '';
    this.newTrackerName = '';
    this.newTrackerUrl = '';
    this.newTrackerSchedule = '*/30 * * * *';
    this.dialog.open(this.addTrackerDialog, { width: '600px' });
  }

  editTracker(tracker: any) {
    this.editingTrackerId = tracker.id;
    const def = this.definitions.find(
      (d) => d.name === tracker.name || d.id === tracker.definitionId,
    );
    this.newTrackerDefId = def ? def.id : 'tvchaosuk'; // Fallback
    this.newTrackerName = tracker.name;
    this.newTrackerUrl = tracker.url;
    this.newTrackerSchedule = tracker.cronSchedule;
    this.dialog.open(this.addTrackerDialog, { width: '600px' });
  }

  onDefinitionSelect() {
    const def = this.definitions.find((d) => d.id === this.newTrackerDefId);
    if (def && !this.newTrackerName) {
      this.newTrackerName = def.name;
    }
  }

  saveTracker() {
    if (
      !this.newTrackerDefId ||
      !this.newTrackerUrl ||
      !this.newTrackerSchedule ||
      !this.newTrackerName
    )
      return;

    const payload = {
      definitionId: this.newTrackerDefId,
      name: this.newTrackerName,
      url: this.newTrackerUrl,
      schedule: this.newTrackerSchedule,
    };

    const request = this.editingTrackerId
      ? this.api.updateTracker(this.editingTrackerId, payload)
      : this.api.createTracker(payload);

    request.subscribe(() => {
      this.dialog.closeAll();
      this.editingTrackerId = null;
      this.newTrackerDefId = '';
      this.newTrackerName = '';
      this.newTrackerUrl = '';
      this.newTrackerSchedule = '*/30 * * * *';
      this.fetchTrackers();
    });
  }

  openProwlarrModal() {
    this.prowlarrSyncStatus = 'idle';
    this.prowlarrSyncMessage = '';
    this.dialog.open(this.prowlarrSyncDialog, { width: '600px' });
  }

  syncToProwlarr() {
    if (!this.prowlarrUrl || !this.prowlarrApiKey || !this.arssraUrl) return;

    this.prowlarrSyncStatus = 'syncing';
    this.prowlarrSyncMessage = '';
    this.cdr.detectChanges();

    this.api.syncProwlarr({
      prowlarrUrl: this.prowlarrUrl,
      prowlarrApiKey: this.prowlarrApiKey,
      arssraUrl: this.arssraUrl
    }).subscribe({
      next: (res) => {
        this.prowlarrSyncStatus = 'success';
        this.prowlarrSyncMessage = res.message || 'Successfully synced with Prowlarr!';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.prowlarrSyncStatus = 'error';
        const backendError = err.error?.error;
        const details = err.error?.details;
        
        if (backendError) {
          this.prowlarrSyncMessage = details ? `${backendError}: ${details}` : backendError;
        } else {
          this.prowlarrSyncMessage = 'Failed to sync with Prowlarr. Check your URL and API Key.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  formatSize(size: number) {
    if (!size) return 'Unknown';
    if (size >= 1024 * 1024 * 1024 * 1024)
      return (size / (1024 * 1024 * 1024 * 1024)).toFixed(2) + ' TB';
    if (size >= 1024 * 1024 * 1024) return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (size >= 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB';
    if (size >= 1024) return (size / 1024).toFixed(2) + ' KB';
    return size + ' B';
  }

  formatCategory(id: string) {
    if (id === '2000') return 'Movies (2000)';
    if (id === '2030') return 'Movies/SD (2030)';
    if (id === '2040') return 'Movies/HD (2040)';
    if (id === '3000') return 'Audio (3000)';
    if (id === '3010') return 'Audio/MP3 (3010)';
    if (id === '3020') return 'Audio/Video (3020)';
    if (id === '3030') return 'Audio/Audiobook (3030)';
    if (id === '3040') return 'Audio/Lossless (3040)';
    if (id === '5000') return 'TV (5000)';
    if (id === '5020') return 'TV/Foreign (5020)';
    if (id === '5030') return 'TV/SD (5030)';
    if (id === '5040') return 'TV/HD (5040)';
    if (id === '5060') return 'TV/Sport (5060)';
    if (id === '5070') return 'Anime (5070)';
    if (id === '5080') return 'TV/Doc (5080)';
    return id || 'Unknown';
  }

  formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString();
  }
}
