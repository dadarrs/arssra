import { Pipe, PipeTransform } from '@angular/core';

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
