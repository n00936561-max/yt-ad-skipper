(function () {
  const FAST_FORWARD_RATE = 16;
  let adActive = false;
  let originalRate = 1;
  let enabled = true; // cached — never read chrome.storage inside tick()

  // Load initial state once, then keep in sync via listener
  try {
    chrome.storage.local.get({ enabled: true }, (res) => { enabled = res.enabled; });
    chrome.storage.onChanged.addListener((changes) => {
      if ('enabled' in changes) enabled = changes.enabled.newValue;
    });
  } catch { /* extension context already gone on inject — default enabled */ }

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
      if (btn) { btn.click(); return true; }
    }
    return false;
  }

  function teardown() {
    clearInterval(intervalId);
    observer.disconnect();
    const video = getVideo();
    if (video && adActive) {
      video.playbackRate = originalRate;
      video.muted = false;
    }
  }

  // tick() is chrome-API-free — no risk of "context invalidated" here
  function tick() {
    if (!enabled) return;

    const video = getVideo();
    if (!video) return;

    if (isAdPlaying()) {
      if (!adActive) {
        adActive = true;
        originalRate = video.playbackRate || 1;
      }

      tryClickSkip();

      if (video.playbackRate !== FAST_FORWARD_RATE) {
        video.playbackRate = FAST_FORWARD_RATE;
        video.muted = true;
      }

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
  }

  const intervalId = setInterval(tick, 300);

  const observer = new MutationObserver(tick);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Clean up when the extension is reloaded/removed
  window.addEventListener('unload', teardown);
})();
