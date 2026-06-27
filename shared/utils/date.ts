const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

export function getCurrentSGT(): Date {
  return new Date(Date.now() + SGT_OFFSET_MS);
}

export function getStartAndEndOfDaySGT() {
  const nowSGT = getCurrentSGT();

  const start = new Date(
    Date.UTC(nowSGT.getUTCFullYear(), nowSGT.getUTCMonth(), nowSGT.getUTCDate(), 0, 0, 0, 0) -
      SGT_OFFSET_MS
  );

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

export function isCurrentSGTBetweenHours(startHour: number, endHour: number): boolean {
  const nowSGT = getCurrentSGT();
  const hour = nowSGT.getUTCHours();

  if (startHour <= endHour) {
    return hour >= startHour && hour < endHour;
  }

  return hour >= startHour || hour < endHour;
}
