chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // --------------------------------------------------
  // OPG_FETCH
  // --------------------------------------------------
  if (message.type === 'OPG_FETCH') {

    fetch(message.url, {
      cache: 'no-store',
      redirect: 'follow'
    })
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
  }

  // --------------------------------------------------
  // iframe 内で CA 発見
  // --------------------------------------------------
  if (message.type === 'OPG_FRAME_CA_FOUND') {

    console.log('[OPG] Frame CA found:', message.payload);

    if (sender.tab?.id) {

      chrome.tabs.sendMessage(
        sender.tab.id,
        {
          type: 'OPG_FRAME_CA_FOUND',
          payload: message.payload
        },
        {
          frameId: 0
        }
      );

    }
  }


  // OPEN_OPG_SIDEPANEL
  if (message.type === 'OPEN_OPG_SIDEPANEL') {

    const tabId = sender.tab?.id;

    if (!tabId) {
      sendResponse({
        ok: false,
        error: 'No active tab id.'
      });

      return;
    }

    chrome.sidePanel.open({ tabId }, () => {

      if (chrome.runtime.lastError) {

        sendResponse({
          ok: false,
          error: chrome.runtime.lastError.message
        });

        return;
      }

      sendResponse({ ok: true });
    });

    return true;
  }
});
