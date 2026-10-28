// Audio and Desktop Notification Helper with Web Audio API synthesis
class NotificationSoundService {
  private soundEnabled: boolean = true;
  private desktopEnabled: boolean = true;
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const storedSound = localStorage.getItem('swiftsweeps_sound_enabled');
        if (storedSound !== null) this.soundEnabled = storedSound === 'true';
        const storedDesktop = localStorage.getItem('swiftsweeps_desktop_enabled');
        if (storedDesktop !== null) this.desktopEnabled = storedDesktop === 'true';
      } catch {
        // LocalStorage sandbox fallback
      }

      // Auto-unlock AudioContext on first user interaction to satisfy browser autoplay policies
      const unlockAudio = () => {
        this.getAudioContext();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        this.isUnlocked = true;
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };

      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      } catch (err) {
        console.warn('Web Audio API not supported in this environment:', err);
      }
    }
    return this.audioCtx;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('swiftsweeps_sound_enabled', String(enabled));
    } catch {}
  }

  public isDesktopEnabled(): boolean {
    return this.desktopEnabled;
  }

  public setDesktopEnabled(enabled: boolean): void {
    this.desktopEnabled = enabled;
    try {
      localStorage.setItem('swiftsweeps_desktop_enabled', String(enabled));
    } catch {}
  }

  public getPermissionStatus(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  public async requestDesktopPermission(): Promise<boolean> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        this.desktopEnabled = perm === 'granted';
        return perm === 'granted';
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Synthesizes a clean, pleasant notification chime using Web Audio API
   * Dual-tone ascending bell with gentle attack and exponential decay (D5 -> A5)
   */
  public playIncomingMessageSound(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // Tone 1: Fundamental note (D5 - 587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.start(now);
      osc1.stop(now + 0.36);

      // Tone 2: Harmonic fifth chime (A5 - 880 Hz) with 70ms offset
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.07);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      gain2.gain.setValueAtTime(0, now + 0.07);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc2.start(now + 0.07);
      osc2.stop(now + 0.46);
    } catch (err) {
      console.warn('Audio playback notice:', err);
    }
  }

  /**
   * Triggers native browser push/desktop notification.
   * Works even when user is on another application or browser tab is in background.
   */
  public showDesktopNotification(title: string, options?: NotificationOptions): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          icon: '/favicon.png',
          badge: '/favicon.png',
          silent: true, // We handle our own precise audio chime via Web Audio API
          ...options,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };

        // Auto close after 6 seconds
        setTimeout(() => {
          try {
            notif.close();
          } catch {}
        }, 6000);
      } catch (err) {
        console.warn('Desktop notification dispatch notice:', err);
      }
    } else if (Notification.permission === 'default' && this.desktopEnabled) {
      // Opportunistically request permission on user activity
      this.requestDesktopPermission().then((granted) => {
        if (granted) {
          this.showDesktopNotification(title, options);
        }
      });
    }
  }
}

export const notificationSoundService = new NotificationSoundService();

