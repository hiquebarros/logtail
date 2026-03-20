const MICROSECONDS_IN_MILLISECOND = BigInt(1000);
const MICROSECONDS_IN_MINUTE = BigInt(60) * BigInt(1_000_000);

export type TimeRangeUs = {
  rf: string;
  rt: string;
};

export function nowMicros(): bigint {
  return BigInt(Date.now()) * MICROSECONDS_IN_MILLISECOND;
}

export function buildRelativeTimeRange(minutes: number, nowUs = nowMicros()): TimeRangeUs {
  const windowUs = BigInt(minutes) * MICROSECONDS_IN_MINUTE;
  const rf = nowUs - windowUs;

  return { rf: rf.toString(), rt: nowUs.toString() };
}

export function microsStringToMs(value: string): number {
  const us = BigInt(value);
  return Number(us / MICROSECONDS_IN_MILLISECOND);
}

export function msToMicrosString(value: number): string {
  return (BigInt(Math.floor(value)) * MICROSECONDS_IN_MILLISECOND).toString();
}
