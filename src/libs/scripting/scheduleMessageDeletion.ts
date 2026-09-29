export function scheduleMessageDeletion(
  remove: () => Promise<unknown>,
  durationMs?: number,
): void {
  if (!durationMs || durationMs <= 0) return;

  setTimeout(() => {
    remove().catch(() => {});
  }, durationMs);
}
