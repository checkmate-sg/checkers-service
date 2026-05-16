export function getStartAndEndOfDaySGT() {
  const now = new Date();

  const sgtNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const start = new Date(
    Date.UTC(sgtNow.getUTCFullYear(), sgtNow.getUTCMonth(), sgtNow.getUTCDate(), 0, 0, 0)
  );

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}
