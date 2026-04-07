(function () {
  let currentVideoId = null;
  const LABEL_ID = 'ryd-dislike-count';

  function getVideoId() {
    return new URLSearchParams(window.location.search).get('v');
  }

  function findDislikeButton() {
    // Try several selectors to survive YouTube DOM changes
    return (
      document.querySelector('#segmented-dislike-button button') ||
      document.querySelector('ytd-segmented-like-dislike-button-renderer #dislike-button button') ||
      document.querySelector('button[aria-label*="Dislike"]') ||
      document.querySelector('like-button-view-model ~ like-button-view-model button')
    );
  }

  function formatCount(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString();
  }

  async function fetchDislikes(videoId) {
    try {
      const res = await fetch(`https://returnyoutubedislike.com/api/votes?videoId=${videoId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.dislikes ?? null;
    } catch {
      return null;
    }
  }

  function injectCount(count) {
    document.getElementById(LABEL_ID)?.remove();

    const btn = findDislikeButton();
    if (!btn) return;

    const label = document.createElement('span');
    label.id = LABEL_ID;
    label.textContent = formatCount(count);
    label.style.cssText = `
      font-size: 14px;
      font-weight: 500;
      color: var(--yt-spec-text-primary, #fff);
      margin-left: 6px;
      pointer-events: none;
      align-self: center;
      display: inline-flex;
      align-items: center;
    `;

    // Insert after the button inside its parent flex container
    btn.closest('yt-button-shape, div')?.appendChild(label) ??
      btn.parentElement?.appendChild(label);
  }

  async function run() {
    const videoId = getVideoId();
    if (!videoId || videoId === currentVideoId) return;
    currentVideoId = videoId;

    // Retry until the dislike button renders (YouTube loads lazily)
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const btn = findDislikeButton();
      if (btn) {
        clearInterval(interval);
        const count = await fetchDislikes(videoId);
        if (count !== null) injectCount(count);
      }
      if (attempts > 30) clearInterval(interval); // give up after ~15s
    }, 500);
  }

  // YouTube is a SPA — listen for navigation events
  window.addEventListener('yt-navigate-finish', run);
  // Also run on initial page load
  run();
})();
