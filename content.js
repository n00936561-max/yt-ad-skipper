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

  function tick() {
    chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
      if (!enabled) return;

      const video = getVideo();
      if (!video) return;

      if (isAdPlaying()) {
        if (!adActive) {
          adActive = true;
          originalRate = video.playbackRate || 1;
        }

        // Try to click skip first; if no skip button, fast-forward
        if (!tryClickSkip()) {
          if (video.playbackRate !== FAST_FORWARD_RATE) {
            video.playbackRate = FAST_FORWARD_RATE;
            video.muted = true;
          }
        }
      } else {
        if (adActive) {
          adActive = false;
          video.playbackRate = originalRate;
          video.muted = false;
        }
      }
    });
  }

  // Poll every 300ms
  setInterval(tick, 300);

  // Also react immediately to DOM changes (e.g. skip button appearing)
  const observer = new MutationObserver(tick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
