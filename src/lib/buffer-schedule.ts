/** Buffer "add to queue" share URL (free tier). */
export const BUFFER_ADD_URL = "https://buffer.com/add";

export function buildBufferScheduleUrl(caption: string): string {
  const text = caption.trim();
  if (!text) {
    return BUFFER_ADD_URL;
  }
  return `${BUFFER_ADD_URL}?text=${encodeURIComponent(text)}`;
}

export function openBufferSchedule(caption: string): void {
  window.open(buildBufferScheduleUrl(caption), "_blank", "noopener,noreferrer");
}
