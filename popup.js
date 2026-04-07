const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
  toggle.checked = enabled;
  status.textContent = enabled ? 'Active — ads will be skipped' : 'Paused';
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ enabled });
  status.textContent = enabled ? 'Active — ads will be skipped' : 'Paused';
});
