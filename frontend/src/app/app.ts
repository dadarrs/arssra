import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  Pipe,
  PipeTransform,
  TemplateRef,
  ViewChild,
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
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

@Pipe({
  name: 'relativeTime',
  standalone: true,
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) return '';
    const time = new Date(value).getTime();
    const now = Date.now();
    const diff = time - now;
    const absDiff = Math.abs(diff);

    const minutes = Math.floor(absDiff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let label: string;
    if (days > 0) label = `${days} day${days > 1 ? 's' : ''}`;
    else if (hours > 0) label = `${hours} hr${hours > 1 ? 's' : ''}`;
    else if (minutes > 0) label = `${minutes} min${minutes > 1 ? 's' : ''}`;
    else return diff < 0 ? 'just now' : 'in a few seconds';

    return diff < 0 ? `${label} ago` : `in ${label}`;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    FormsModule,

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
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit, AfterViewInit {
  public get dialog(): MatDialog {
    return this._dialog;
  }
  torrentsDataSource = new MatTableDataSource<any>();
  trackersDataSource = new MatTableDataSource<any>();

  definitions: any[] = [];
  totalCount = 0;

  newTrackerDefId = '';
  newTrackerName = '';
  newTrackerUrl = '';
  newTrackerSchedule = '*/30 * * * *';
  editingTrackerId: number | null = null;
  trackerToDelete: number | null = null;

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

  constructor(
    private readonly http: HttpClient,
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
  }

  fetchTorrents() {
    this.hasMoreData = true;
    const q = encodeURIComponent(this.searchQuery);
    const url = q ? `/api/json/torrents?q=${q}` : `/api/json/torrents`;
    this.http.get<any>(url).subscribe((res) => {
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
    const q = encodeURIComponent(this.searchQuery);
    const offset = this.torrentsDataSource.data.length;
    const url = q
      ? `/api/json/torrents?q=${q}&offset=${offset}`
      : `/api/json/torrents?offset=${offset}`;

    this.http.get<any>(url).subscribe((res) => {
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
    this.http.get<any[]>('/api/json/trackers').subscribe((res) => {
      this.trackersDataSource.data = res;
      this.cdr.detectChanges();
    });
  }

  fetchDefinitions() {
    this.http.get<any[]>('/api/json/trackers/definitions').subscribe((res) => {
      this.definitions = res;
      this.cdr.detectChanges();
    });
  }

  toggleTracker(id: number, active: boolean) {
    this.http.put(`/api/json/trackers/${id}/toggle`, { active }).subscribe(() => {
      this.fetchTrackers();
    });
  }

  deleteTracker(id: number) {
    this.trackerToDelete = id;
    this.dialog.open(this.deleteConfirmDialog, { width: '400px' });
  }

  confirmDelete() {
    if (this.trackerToDelete !== null) {
      this.http.delete(`/api/json/trackers/${this.trackerToDelete}`).subscribe(() => {
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
      ? this.http.put(`/api/json/trackers/${this.editingTrackerId}`, payload)
      : this.http.post('/api/json/trackers', payload);

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
