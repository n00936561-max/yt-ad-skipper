(function () {
  const RATE = 16;
  let adActive = false;
  let savedRate = 1;
  let stopped = false;

  // Connect to background — when the extension reloads, the port disconnects,
  // which lets us cleanly shut down before Chrome can throw "context invalidated"
  try {
    const port = chrome.runtime.connect({ name: 'content' });
    port.onDisconnect.addListener(stop);
  } catch {
    return; // extension already gone, don't run at all
  }

  const SKIP_SELECTORS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-slot button',
  ];

  function stop() {
    stopped = true;
    clearInterval(timer);
    obs.disconnect();
    // Restore video if mid-ad
    const v = document.querySelector('video');
    if (v && adActive) { v.playbackRate = savedRate; v.muted = false; }
  }

  function tick() {
    if (stopped) return;
    const v = document.querySelector('video');
    if (!v) return;
    const ad = document.querySelector('.ad-showing') !== null;
    if (ad) {
      if (!adActive) { adActive = true; savedRate = v.playbackRate || 1; v.muted = true; }
      v.playbackRate = RATE;
      for (const s of SKIP_SELECTORS) {
        const el = document.querySelector(s);
        if (el) { el.click(); break; }
      }
    } else if (adActive) {
      adActive = false;
      v.playbackRate = savedRate;
      v.muted = false;
    }
  }

  const timer = setInterval(tick, 300);
  const obs = new MutationObserver(tick);
  obs.observe(document.documentElement, {
    childList: true, subtree: true,
    attributes: true, attributeFilter: ['class'],
  });
})();
