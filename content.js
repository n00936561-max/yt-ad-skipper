(function () {
  const RATE = 16;
  let adActive = false;
  let savedRate = 1;

  const SKIP_SELECTORS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-slot button',
  ];

  function video() { return document.querySelector('video'); }

  function adPlaying() {
    return document.querySelector('.ad-showing') !== null;
  }

  function clickSkip() {
    for (const s of SKIP_SELECTORS) {
      const el = document.querySelector(s);
      if (el) { el.click(); return; }
    }
  }

  function tick() {
    const v = video();
    if (!v) return;

    if (adPlaying()) {
      if (!adActive) {
        adActive = true;
        savedRate = v.playbackRate || 1;
        v.muted = true;
      }
      v.playbackRate = RATE;
      clickSkip();
    } else if (adActive) {
      adActive = false;
      v.playbackRate = savedRate;
      v.muted = false;
    }
  }

  setInterval(tick, 300);

  new MutationObserver(tick).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
})();
