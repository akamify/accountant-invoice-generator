export async function requestBrowserNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "default") {
    return Notification.requestPermission();
  }
  return Notification.permission;
}

export function playNotificationSound() {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const now = context.currentTime;
  const frequencies = [1400, 1800, 2200];

  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.09);
    gain.gain.setValueAtTime(0.0001, now + index * 0.09);
    gain.gain.exponentialRampToValueAtTime(1, now + index * 0.09 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.08);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + index * 0.09);
    oscillator.stop(now + index * 0.09 + 0.09);
  });

  window.setTimeout(() => context.close().catch(() => undefined), 500);
}
