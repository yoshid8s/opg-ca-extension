chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'OPG_FETCH') return;

  fetch(message.url, { cache: 'no-store', redirect: 'follow' })
    .then(async (res) => {
      const text = await res.text();
      sendResponse({
        ok: res.ok,
        status: res.status,
        url: res.url,
        text
      });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error: String(error)
      });
    });

  return true;
});
