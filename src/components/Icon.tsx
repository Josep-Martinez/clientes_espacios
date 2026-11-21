export type IconName = 'mark' | 'search' | 'pin' | 'calendar' | 'clock' | 'arrow' | 'check' | 'plus' | 'building' | 'person' | 'close';

const paths: Record<Exclude<IconName, 'mark'>, string> = {
  search: 'M11 19a8 8 0 1 1 5.66-2.34L21 21M19 19l-2.34-2.34',
  pin: 'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  calendar: 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Zm3 8h3m-3 4h3m3-4h3',
  clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  plus: 'M12 5v14m-7-7h14',
  building: 'M4 21h16M6 21V7l6-4 6 4v14M9 10h1m4 0h1m-6 4h1m4 0h1m-5 7v-4h3v4',
  person: 'M20 21a8 8 0 0 0-16 0m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  close: 'M18 6 6 18M6 6l12 12',
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  if (name === 'mark') {
    return (
      <svg aria-hidden="true" className="brand-mark" width={size} height={size} viewBox="0 0 28 28" fill="none">
        <path d="M6 7.5h8.2a5 5 0 0 1 0 10H6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M22 20.5h-8.2a5 5 0 0 1 0-10H22" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="6" cy="7.5" r="2" fill="currentColor" />
        <circle cx="22" cy="20.5" r="2" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={paths[name]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
