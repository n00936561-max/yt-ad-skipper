(function () {
  const LABEL_ID = 'ryd-count';
  let lastVideoId = null;

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
    } catch {
      return null;
    }
  }

  // Find the dislike button — try multiple selectors for different YouTube layouts
  function findDislikeBtn() {
    // Newer layout: two separate like-button-view-model elements
    const btns = document.querySelectorAll('like-button-view-model button');
    if (btns.length >= 2) return btns[1];

    // Segmented layout
    const seg = document.querySelector('#segmented-dislike-button button, #dislike-button button');
    if (seg) return seg;

    // Fallback: aria-label
    return document.querySelector('button[aria-label*="Dislike"], button[aria-label*="dislike"]');
  }

  function inject(count) {
    document.getElementById(LABEL_ID)?.remove();

    const btn = findDislikeBtn();
    if (!btn) return false;

    const span = document.createElement('span');
    span.id = LABEL_ID;
    span.textContent = fmt(count);
    span.style.cssText = `
      font-size:1.4rem;
      font-weight:500;
      color:var(--yt-spec-text-primary,#fff);
      margin-left:8px;
      line-height:1;
      align-self:center;
      pointer-events:none;
    `;

    // Insert after the button's icon container, inside the same flex row
    btn.insertAdjacentElement('afterend', span);
    return true;
  }

  async function run() {
    const id = videoId();
    if (!id || id === lastVideoId) return;
    lastVideoId = id;

    document.getElementById(LABEL_ID)?.remove();

    // Retry until the dislike button appears in the DOM
    let tries = 0;
    const poll = setInterval(async () => {
      try {
        tries++;
        if (tries > 40) { clearInterval(poll); return; } // 20s timeout

        const count = await fetchDislikes(id);
        if (count === null) return; // API not ready yet

        if (inject(count)) clearInterval(poll); // success
      } catch {
        clearInterval(poll);
      }
    }, 500);
  }

  // YouTube SPA: fires on every navigation
  window.addEventListener('yt-navigate-finish', run);

  // Initial load (not a SPA navigation)
  if (document.readyState === 'complete') {
    run();
  } else {
    window.addEventListener('load', run);
  }
})();
