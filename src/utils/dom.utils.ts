/** Vendor-prefixed Fullscreen API entry points, missing from lib.dom.d.ts. */
interface VendorFullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => unknown;
  mozRequestFullScreen?: () => unknown;
  msRequestFullscreen?: () => unknown;
}

interface VendorFullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  mozCancelFullScreen?: () => void;
  webkitExitFullscreen?: () => void;
  msExitFullscreen?: () => void;
}

/** `screen.orientation.lock`, missing from lib.dom.d.ts's `ScreenOrientation` (`.unlock` is already there). */
interface LockableScreenOrientation extends ScreenOrientation {
  lock?: (orientation: string) => Promise<void>;
}

const DomUtils = {
  preventRightClick(element: HTMLElement) {
    element.addEventListener('contextmenu', event => event.preventDefault());
  },
  preventZoom() {
    document.addEventListener(
      'wheel',
      event => {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
        }
      },
      { passive: false }
    );
  },
  /**
   * Whether this browser can put the page fullscreen at all.
   *
   * iPhone Safari cannot: the Fullscreen API is exposed on `HTMLVideoElement`
   * and nowhere else there, so the whole feature is missing rather than merely
   * refused. Worth asking before drawing a button, because a control that can
   * never work is worse than no control — see `OrientationHint.vue` for what
   * those devices get instead.
   */
  fullscreenSupported(): boolean {
    if (typeof document === 'undefined') return false;
    const element = document.documentElement as VendorFullscreenElement;
    return Boolean(
      element.requestFullscreen ||
      element.webkitRequestFullscreen ||
      element.mozRequestFullScreen ||
      element.msRequestFullscreen
    );
  },

  isFullscreen(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(
      document.fullscreenElement || (document as VendorFullscreenDocument).webkitFullscreenElement
    );
  },

  /**
   * Pin the device to landscape, if it will have it.
   *
   * Chrome on Android only honours this **while the document is fullscreen**,
   * which is why it is called from `goFullscreen` rather than offered as its
   * own button: an orientation lock on its own would silently do nothing. iOS
   * has no `screen.orientation.lock` at all.
   *
   * So a rejection is the normal case on half the devices that will run this
   * and is swallowed on purpose. Nothing downstream branches on the result —
   * the portrait hint watches the *actual* orientation instead, which is true
   * whether the lock worked, failed, or was never available.
   */
  lockLandscape(): void {
    const orientation: LockableScreenOrientation | null =
      typeof screen === 'undefined' ? null : (screen.orientation as LockableScreenOrientation);
    if (typeof orientation?.lock !== 'function') return;
    try {
      Promise.resolve(orientation.lock('landscape')).catch(() => {});
    } catch {
      /* Safari throws synchronously rather than rejecting. Same non-answer. */
    }
  },

  unlockOrientation(): void {
    const orientation: LockableScreenOrientation | null =
      typeof screen === 'undefined' ? null : (screen.orientation as LockableScreenOrientation);
    if (typeof orientation?.unlock !== 'function') return;
    try {
      orientation.unlock();
    } catch {
      /* as above */
    }
  },

  goFullscreen() {
    const element = document.documentElement as VendorFullscreenElement;
    const request: undefined | (() => unknown) =
      element.requestFullscreen ??
      element.mozRequestFullScreen ??
      element.webkitRequestFullscreen ??
      element.msRequestFullscreen;
    if (!request) return;

    // The lock is chained onto the request rather than fired beside it: until
    // the document is actually fullscreen, Android refuses it. The prefixed
    // methods return nothing, so those fall through to the immediate call —
    // which is the older, looser behaviour those browsers had anyway.
    const pending = request.call(element);
    if (pending instanceof Promise) pending.then(() => this.lockLandscape()).catch(() => {});
    else this.lockLandscape();
  },
  exitFullscreen() {
    this.unlockOrientation();
    const doc = document as VendorFullscreenDocument;
    if (document.exitFullscreen) document.exitFullscreen();
    else if (doc.mozCancelFullScreen) doc.mozCancelFullScreen();
    else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    else if (doc.msExitFullscreen) doc.msExitFullscreen();
  },
  toggleFullscreen(): boolean {
    if (this.isFullscreen()) {
      this.exitFullscreen();
      return false;
    }
    this.goFullscreen();
    return true;
  },
};
export default DomUtils;
