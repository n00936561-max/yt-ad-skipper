(function () {
  const FAST_FORWARD_RATE = 16;
  let adActive = false;
  let originalRate = 1;

  const SKIP_SELECTORS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-slot button',
  ];

  function getVideo() {
    return document.querySelector('video');
  }

  function isAdPlaying() {
    return !!(
      document.querySelector('.ad-showing') ||
      document.querySelector('.ytp-ad-player-overlay-instream-info')
    );
  }

  function tryClickSkip() {
    for (const sel of SKIP_SELECTORS) {
      const btn = document.querySelector(sel);
      if (btn) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  function isContextValid() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  function teardown() {
    clearInterval(intervalId);
    observer.disconnect();
    // Restore video state if an ad was mid-fast-forward
    const video = getVideo();
    if (video && adActive) {
      video.playbackRate = originalRate;
      video.muted = false;
    }
  }

  function tick() {
    if (!isContextValid()) {
      teardown();
      return;
    }

    try {
      chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
        if (!isContextValid()) { teardown(); return; }
        if (!enabled) return;

        const video = getVideo();
        if (!video) return;

        if (isAdPlaying()) {
          if (!adActive) {
            adActive = true;
            originalRate = video.playbackRate || 1;
          }

          // Always try to click skip (catches button appearing at end of fast-forwarded ad)
          tryClickSkip();

          // Also fast-forward if the skip button isn't clickable yet
          if (video.playbackRate !== FAST_FORWARD_RATE) {
            video.playbackRate = FAST_FORWARD_RATE;
            video.muted = true;
          }

          // If video stalled at the end, nudge it to trigger skip
          if (video.duration > 0 && video.currentTime >= video.duration - 0.1) {
            tryClickSkip();
          }
        } else {
          if (adActive) {
            adActive = false;
            video.playbackRate = originalRate;
            video.muted = false;
          }
        }
      });
    } catch {
      teardown();
    }
  }

  // Poll every 300ms
  const intervalId = setInterval(tick, 300);

  // Also react immediately to DOM changes (e.g. skip button appearing)
  const observer = new MutationObserver(tick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
