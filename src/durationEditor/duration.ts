// Duration values are stored as a number of milliseconds.
// Display/edit format is HH:MM:SS (sub-second precision is truncated).

export function formatDuration(totalMs: number): string {
  const totalSeconds = Math.floor(Math.max(totalMs, 0) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
