import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'forma-intro-seen';
const SCROLL_THRESHOLD = 160;
const EXIT_DURATION_MS = 900;
const REDUCED_EXIT_DURATION_MS = 150;

function hasSeenIntro() {
  if (typeof window === 'undefined') return true;
  try {
    return Boolean(window.sessionStorage.getItem(STORAGE_KEY));
  } catch {
    // sessionStorage unavailable (privacy mode, etc.) — show intro every time
    return false;
  }
}

/**
 * Full-screen intro that gates the home page once per session.
 * Dismisses on scroll / swipe / keypress / click, with a themed exit transition.
 * All continuous feedback is driven through a single CSS custom property
 * (--intro-progress) so scroll tracking stays cheap and declarative.
 */
export default function IntroLanding() {
  const [dismissed, setDismissed] = useState(hasSeenIntro);
  const [exiting, setExiting] = useState(false);
  const overlayRef = useRef(null);
  const triggerExitRef = useRef(() => {});

  useEffect(() => {
    if (dismissed) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let accumulated = 0;
    let touchStartY = null;
    let triggered = false;

    function setProgress(ratio) {
      const clamped = Math.min(1, Math.max(0, ratio));
      overlayRef.current?.style.setProperty('--intro-progress', String(clamped));
    }

    function triggerExit() {
      if (triggered) return;
      triggered = true;
      setProgress(1);
      setExiting(true);
      window.setTimeout(
        () => {
          try {
            window.sessionStorage.setItem(STORAGE_KEY, '1');
          } catch {
            // ignore storage failures — intro will just replay next visit
          }
          document.body.style.overflow = previousOverflow;
          setDismissed(true);
        },
        reducedMotion ? REDUCED_EXIT_DURATION_MS : EXIT_DURATION_MS
      );
    }
    triggerExitRef.current = triggerExit;

    function handleWheel(e) {
      if (e.deltaY <= 0) return;
      e.preventDefault();
      accumulated += e.deltaY;
      setProgress(accumulated / SCROLL_THRESHOLD);
      if (accumulated >= SCROLL_THRESHOLD) triggerExit();
    }

    function handleTouchStart(e) {
      touchStartY = e.touches[0]?.clientY ?? null;
    }

    function handleTouchMove(e) {
      if (touchStartY == null) return;
      const delta = touchStartY - (e.touches[0]?.clientY ?? touchStartY);
      if (delta <= 0) return;
      e.preventDefault();
      accumulated = delta;
      setProgress(accumulated / SCROLL_THRESHOLD);
      if (accumulated >= SCROLL_THRESHOLD) triggerExit();
    }

    function handleKeyDown(e) {
      if (e.key === 'Tab' || e.key === 'Shift') return;
      triggerExit();
    }

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <div
      ref={overlayRef}
      className={`intro-overlay${exiting ? ' is-exiting' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="FORMA intro"
      onClick={() => triggerExitRef.current()}
    >
      <span className="intro-panel intro-panel-top" aria-hidden="true" />
      <span className="intro-panel intro-panel-bottom" aria-hidden="true" />
      <div className="intro-scanline" aria-hidden="true" />

      <div className="intro-content">
        <p className="intro-kicker">FORMA // SYSTEM ONLINE</p>
        <h1 className="intro-logo">FORMA</h1>
        <p className="intro-tagline">Next-gen everyday goods, rendered.</p>
        <button
          type="button"
          className="btn btn-primary intro-enter"
          onClick={(e) => {
            e.stopPropagation();
            triggerExitRef.current();
          }}
          autoFocus
        >
          Enter site
        </button>
        <p className="intro-prompt">
          <span className="intro-chevron" aria-hidden="true" />
          Scroll, swipe, or press any key
        </p>
      </div>

      <div className="intro-progress-track" aria-hidden="true">
        <div className="intro-progress-fill" />
      </div>
    </div>
  );
}
