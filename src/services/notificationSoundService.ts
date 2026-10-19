// Audio and Desktop Notification Helper

class NotificationSoundService {
  private soundEnabled: boolean = true;
  private desktopEnabled: boolean = false;

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  public isDesktopEnabled(): boolean {
    return this.desktopEnabled;
  }

  public setDesktopEnabled(enabled: boolean): void {
    this.desktopEnabled = enabled;
  }

  public getPermissionStatus(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  }

  public async requestDesktopPermission(): Promise<boolean> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
    return false;
  }

  public playIncomingMessageSound(): void {
    if (!this.soundEnabled) return;
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public showDesktopNotification(title: string, options?: NotificationOptions): void {
    if (!this.desktopEnabled) return;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, options);
      } catch {
        // Fallback
      }
    }
  }
}

export const notificationSoundService = new NotificationSoundService();
