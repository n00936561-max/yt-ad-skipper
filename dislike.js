(function () {
  const LABEL_ID = 'ryd-count';
  let lastVideoId = null;
  let pollTimer = null;

  // Same port teardown so reloads don't leave dangling timers
  try {
    const port = chrome.runtime.connect({ name: 'dislike' });
    port.onDisconnect.addListener(() => {
      clearInterval(pollTimer);
      document.getElementById(LABEL_ID)?.remove();
    });
  } catch { return; }

  function videoId() {
    return new URLSearchParams(location.search).get('v');
  }

  function fmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString();
  }

  async function fetchDislikes(id) {
    try {
      const r = await fetch('https://returnyoutubedislike.com/api/votes?videoId=' + id);
      if (!r.ok) return null;
      const d = await r.json();
      return typeof d.dislikes === 'number' ? d.dislikes : null;
    } catch { return null; }
  }

  function findDislikeArea() {
    // Try every known YouTube layout variant
    return (
      // 2024+ layout: two like-button-view-model, second is dislike
      document.querySelector('like-button-view-model:last-of-type') ||
      document.querySelector('like-button-view-model + like-button-view-model') ||
      // Segmented button layout
      document.querySelector('#segmented-dislike-button') ||
      document.querySelector('#dislike-button') ||
      // Aria fallback
      document.querySelector('button[aria-label*="islike"]')?.closest('yt-button-shape, div')
    );
  }

  function inject(count) {
    document.getElementById(LABEL_ID)?.remove();

    const area = findDislikeArea();
    if (!area) return false;

    const span = document.createElement('span');
    span.id = LABEL_ID;
    span.textContent = fmt(count);
    span.style.cssText = [
      'font-size:1.4rem',
      'font-weight:500',
      'color:var(--yt-spec-text-primary,#fff)',
      'margin-left:6px',
      'align-self:center',
      'pointer-events:none',
      'display:inline-block',
    ].join(';');

    area.appendChild(span);
    return true;
  }

  async function run() {
    const id = videoId();
    if (!id || id === lastVideoId) return;
    lastVideoId = id;

    clearInterval(pollTimer);
    document.getElementById(LABEL_ID)?.remove();

    // Fetch once, then retry injection until the button is in the DOM
    const count = await fetchDislikes(id);
    if (count === null) return;

    let tries = 0;
    pollTimer = setInterval(() => {
      tries++;
      if (tries > 40) { clearInterval(pollTimer); return; }
      if (inject(count)) clearInterval(pollTimer);
    }, 500);
  }

  window.addEventListener('yt-navigate-finish', run);
  window.addEventListener('load', run);
})();
