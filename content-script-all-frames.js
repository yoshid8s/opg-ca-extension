(function () {
  if (window.top === window) return;

  function scan() {
    const scripts = document.querySelectorAll(
      'script[type="application/cas+json"],' +
      'script[type="application/ops+json"],' +
      'script[type="application/opmeta+json"],' +
      'script[src][type="application/cas+json"],' +
      'script[src][type="application/ops+json"],' +
      'script[src][type="application/opmeta+json"]'
    );

    if (!scripts.length) return;

    const found = [];

    scripts.forEach((script) => {
      found.push({
        type: script.getAttribute('type'),
        src: script.getAttribute('src') || '',
        text: script.textContent || '',
        frameUrl: location.href
      });
    });

    chrome.runtime.sendMessage({
      type: 'OPG_FRAME_CA_FOUND',
      payload: found
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  setTimeout(scan, 1500);
})();
