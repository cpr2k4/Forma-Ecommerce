import { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_WAIT_TIMEOUT_MS = 6000;

/**
 * Renders Google's official "Sign in with Google" button using Google
 * Identity Services (loaded via <script> in index.html). Emits the raw
 * ID token credential to the parent, which exchanges it with our API.
 */
export default function GoogleAuthButton({ text = 'signin_with', onCredential, onError }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState(CLIENT_ID ? 'loading' : 'unconfigured');

  useEffect(() => {
    if (!CLIENT_ID) return undefined;

    let cancelled = false;
    let pollId;
    const startedAt = Date.now();

    function render() {
      if (cancelled || !containerRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response?.credential) {
              onCredential?.(response.credential);
            } else {
              onError?.('Google did not return a credential. Please try again.');
            }
          },
        });
        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          shape: 'rectangular',
          text,
          logo_alignment: 'center',
          width: 336,
        });
        setStatus('ready');
      } catch {
        setStatus('error');
        onError?.('Could not load Google sign-in. Please try again later.');
      }
    }

    function poll() {
      if (cancelled) return;
      if (window.google?.accounts?.id) {
        render();
        return;
      }
      if (Date.now() - startedAt > SCRIPT_WAIT_TIMEOUT_MS) {
        setStatus('error');
        return;
      }
      pollId = window.setTimeout(poll, 150);
    }

    poll();

    return () => {
      cancelled = true;
      window.clearTimeout(pollId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (status === 'unconfigured') {
    return (
      <p className="muted" style={{ fontSize: '0.82rem' }}>
        Google sign-in isn’t configured yet. Set <code>VITE_GOOGLE_CLIENT_ID</code> in{' '}
        <code>client/.env</code>.
      </p>
    );
  }

  return (
    <div className="google-btn-wrap">
      <div ref={containerRef} className="google-btn-slot" />
      {status === 'loading' && <div className="google-btn-skeleton" aria-hidden="true" />}
      {status === 'error' && (
        <p className="muted" style={{ fontSize: '0.82rem' }}>
          Google sign-in is unavailable right now.
        </p>
      )}
    </div>
  );
}
