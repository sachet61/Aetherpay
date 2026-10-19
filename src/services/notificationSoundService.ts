/**
 * Notification Sound & Desktop Alert Service
 * Provides synthesized Web Audio API chimes (zero external audio dependencies)
 * and native browser Desktop Notification integration.
 */

class NotificationSoundService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private desktopEnabled: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const storedSound = localStorage.getItem('swift_sweeps_sound_enabled');
        this.soundEnabled = storedSound !== null ? storedSound === 'true' : true;

        const storedDesktop = localStorage.getItem('swift_sweeps_desktop_notifs_enabled');
        this.desktopEnabled = storedDesktop === 'true' && Notification?.permission === 'granted';
      } catch {}
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Plays a pleasant dual-tone chime (D5 -> A5) using synthesized oscillators
   */
  public playIncomingMessageSound(): void {
    if (!this.soundEnabled) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Note 2: 880.00 Hz (A5) slightly staggered for a friendly chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.09);

      gain2.gain.setValueAtTime(0.001, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.28, now + 0.11);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.4);
    } catch (e) {
      console.warn('[NotificationSound] Audio playback notice:', e);
    }
  }

  /**
   * Checks current browser notification permission
   */
  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  /**
   * Requests desktop notification permission from user
   */
  public async requestDesktopPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      // Prime audio context on user gesture
      this.getAudioContext();

      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      this.setDesktopEnabled(granted);
      return granted;
    } catch {
      return false;
    }
  }

  /**
   * Dispatches a native browser notification (especially useful when tab is in background)
   */
  public showDesktopNotification(title: string, options?: { body?: string; icon?: string; tag?: string; onClick?: () => void }): void {
    if (!this.desktopEnabled) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const notif = new Notification(title, {
        body: options?.body || 'New message received',
        icon: options?.icon || '/favicon.png',
        tag: options?.tag || 'swift_sweeps_chat',
      });

      if (options?.onClick) {
        notif.onclick = () => {
          window.focus();
          options.onClick?.();
          notif.close();
        };
      }
    } catch (e) {
      console.warn('[NotificationSound] Desktop notification notice:', e);
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('swift_sweeps_sound_enabled', String(enabled));
    } catch {}
  }

  public isDesktopEnabled(): boolean {
    return this.desktopEnabled && Notification?.permission === 'granted';
  }

  public setDesktopEnabled(enabled: boolean): void {
    this.desktopEnabled = enabled;
    try {
      localStorage.setItem('swift_sweeps_desktop_notifs_enabled', String(enabled));
    } catch {}
  }
}

export const notificationSoundService = new NotificationSoundService();
