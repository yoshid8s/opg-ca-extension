(async function () {

    const isX = location.hostname === 'x.com' || location.hostname === 'twitter.com';

    if (isX) {
        initXTimelineMode();
        return;
    }

    const isStyleSite = location.hostname === 'style.yh-inc.jp';

    if (isStyleSite) {
        initBlockShareMode();
    }

  const opMeta = document.querySelector('meta[property="og:op"]');
  const opCasMeta = document.querySelector('meta[property="og:op:cas"]');

  let opData = null;

  try {

    if (opCasMeta && opCasMeta.content) {
      console.log('[OPG] og:op:cas found:', opCasMeta.content);

      const res = await fetch(opCasMeta.content, { cache: 'no-store' });
      const casJson = await res.json();

      const jwt = Array.isArray(casJson) ? casJson[0] : casJson.jwt || casJson.vc || casJson.token;

      if (!jwt) {
        throw new Error('CAS JWT not found');
      }

      const payload = decodeJwtPayload(jwt);

      console.log('[OPG] Decoded CAS payload:', payload);

      const subject = payload.credentialSubject || {};

      opData =  {
        issuer: normalizeIssuer(payload.issuer),
        author: normalizeAuthor(subject.author),
        published: subject.datePublished || subject.published || '-',
        updated: subject.dateModified || subject.updated || '-',
        verified: false,
        status: 'validated',
        logo: subject.logo || null
    };

    } else if (opMeta) {
      console.log('[OPG] og:op found');
      opData = JSON.parse(opMeta.content);

    } else {
      console.log('[OPG] og:op / og:op:cas not found');
      return;
    }

    renderCard(opData);

  } catch (e) {
    console.error('[OPG] Error:', e);

    renderCard({
      issuer: 'OP metadata error',
      author: '-',
      published: '-',
      updated: '-',
      verified: false
    });
  }

  function decodeJwtPayload(jwt) {
    const parts = jwt.split('.');

    if (parts.length < 2) {
      throw new Error('Invalid JWT format');
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );

    return JSON.parse(json);
  }

  function decodeJwtHeader(jwt) {
  const parts = jwt.split('.');

  if (parts.length < 2) {
    throw new Error('Invalid JWT format');
  }

  const base64Url = parts[0];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );

  return JSON.parse(json);
}

function normalizeIssuer(issuer) {
    if (!issuer) return 'Unknown';

    if (typeof issuer === 'string') {

        const issuerMap = {
         'dns:example.com': 'Example OP Holder',
         'dns:style.yh-inc.jp': 'Y&H Inc.'
        };

        return issuerMap[issuer] || issuer;
  }

    if (issuer.name) {
        return issuer.name;
    }

    if (issuer.id) {
        return normalizeIssuer(issuer.id);
    }

    return 'Unknown';
}

  function normalizeAuthor(author) {
    if (!author) return '-';

    if (Array.isArray(author)) {
      return author.map(normalizeAuthor).join(', ');
    }

    if (typeof author === 'string') {
      return author;
    }

    if (author.name) {
      return author.name;
    }

    if (author.id) {
      return author.id;
    }

    return '-';
  }

  function renderCard(opData) {
    const existing = document.getElementById('opg-ca-card');
    if (existing) existing.remove();

    const card = document.createElement('div');
    card.id = 'opg-ca-card';

    const logoUrl = chrome.runtime.getURL('op-logo.png');
    const issuerLogoUrl = chrome.runtime.getURL('yh_logo.png');

    const verified = opData.verified === true;

    let statusClass = 'opg-detected';

    if (opData.status === 'validated') {
        statusClass = 'opg-validated';
    }

    if (opData.verified === true) {
        statusClass = 'opg-verified';
    }

    const statusText = getStatusLabel(opData);

    card.innerHTML = `
      <div class="opg-header ${statusClass}">

        <img src="${logoUrl}" class="opg-logo">

        <div class="opg-header-text">
          ${statusText}
        </div>

      </div>

      <div class="opg-body">

        <div class="opg-issuer">

          <img src="${issuerLogoUrl}" class="opg-issuer-logo">

          <div class="opg-title">
            ${opData.issuer || 'Unknown'}
          </div>

        </div>

        <div class="opg-item">
          記事執筆者: ${opData.author || '-'}
        </div>

        <div class="opg-item">
         公開日: ${formatDateJa(opData.published)}
        </div>

        <div class="opg-item">
        更新日: ${formatDateJa(opData.updated)}
        </div>

      </div>
    `;

    document.body.appendChild(card);
  }

function initXTimelineMode() {
  console.log('[OPG] X timeline mode started');

  const processedUrls = new Set();
  const pendingUrls = new Set();

  const scan = () => {
    const tweets = Array.from(document.querySelectorAll('article'));

    tweets.forEach(async (tweet) => {
      if (tweet.querySelector('.opg-x-mini-card')) return;

      const links = Array.from(tweet.querySelectorAll('a[href]'));

      const link = links.find((a) => {
        const href = a.href || '';
        const text = a.textContent || '';
        return (
          href.includes('style.yh-inc.jp') ||
          text.includes('style.yh-inc.jp') ||
          href.includes('t.co')
        );
      });

      if (!link) return;

      const href = link.href;
      const text = tweet.innerText || '';
      const processKey = href + text.slice(0, 80);

      if (processedUrls.has(processKey)) return;
      if (pendingUrls.has(processKey)) return;

      pendingUrls.add(processKey);

      try {
        const targetUrl =
          findExpandedUrlFromTweet(tweet) ||
          href;

        console.log('[OPG] Target URL:', targetUrl);

        const opData = await fetchOpDataFromPage(targetUrl);
        if (!opData) return;

        const miniCard = createXMiniCard(opData);

        const linkCard =
          link.closest('div[role="link"]') ||
          link.closest('a');

        const insertTarget =
          linkCard?.closest('div[style*="border"]') ||
          linkCard?.parentElement?.parentElement ||
          linkCard?.parentElement;

        if (insertTarget && insertTarget.parentElement) {
          insertTarget.insertAdjacentElement('afterend', miniCard);
        } else {
          tweet.appendChild(miniCard);
        }

        processedUrls.add(processKey);

      } catch (e) {
        if (e && String(e.message || e).includes('Extension context invalidated')) {
          return;
        }

        console.error('[OPG] X timeline error:', e);
      } finally {
        pendingUrls.delete(processKey);
      }
    });
  };

  const scheduleScan = () => {
    setTimeout(scan, 300);
    setTimeout(scan, 1000);
    setTimeout(scan, 2500);
  };

  scheduleScan();

  const observer = new MutationObserver(() => {
    scheduleScan();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function extractStyleUrlFromText(text) {
  const match = text.match(/style\.yh-inc\.jp[^\s]*/);

  if (!match) {
    return null;
  }

  return 'https://' + match[0];
}

function fetchViaBackground(url) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'OPG_FETCH',
        url: url
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response || !response.ok) {
          reject(new Error(response?.error || `Fetch failed: ${response?.status}`));
          return;
        }

        resolve(response);
      }
    );
  });
}

async function verifySpProfile(spUrl) {
  try {
    const res = await fetchViaBackground(spUrl);

    console.log('[OPG] SP fetch result:', {
      url: spUrl,
      finalUrl: res.url,
      status: res.status,
      textStart: res.text.slice(0, 120)
    });

    const sp = JSON.parse(res.text);

    console.log('[OPG] SP parsed:', sp);

    if (
        sp &&
        (
            sp.credentialSubject ||
            sp.issuer ||
            sp.type ||
            sp['@context'] ||
            Array.isArray(sp.originators)
        )
    ) {
        console.log('[OPG] SP profile verified:', spUrl);
        return true;
    }

    return false;

  } catch (e) {
    console.warn('[OPG] SP profile verification failed:', e);
    return false;
  }
}

function base64UrlToBytes(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function findPublicJwk(obj) {
  if (!obj || typeof obj !== 'object') return null;

  if (obj.kty && obj.crv && obj.x && obj.y) {
    return obj;
  }

  for (const key of Object.keys(obj)) {
    const found = findPublicJwk(obj[key]);
    if (found) return found;
  }

  return null;
}

async function verifyJwtSignature(jwt, publicJwk) {
  if (!publicJwk) return false;

  const parts = jwt.split('.');
  if (parts.length !== 3) return false;

  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = base64UrlToBytes(parts[2]);

  const key = await crypto.subtle.importKey(
    'jwk',
    publicJwk,
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    false,
    ['verify']
  );

  return crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: 'SHA-256'
    },
    key,
    signature,
    data
  );
}

function findExpandedUrlFromTweet(tweet) {
  const text = tweet.innerText || '';

  const match = text.match(/style\.yh-inc\.jp\/(?:op-share|share)\/[a-zA-Z0-9_-]+/);

  if (!match) {
    return null;
  }

  return 'https://' + match[0];
}

async function fetchOpDataFromPage(url) {
  if (url.includes('t.co')) {
  console.log('[OPG] t.co URL detected. Need expanded URL:', url);
  }

  console.log('[OPG] Fetch linked page:', url);

    const pageRes = await fetchViaBackground(url);
    let html = pageRes.text;
    let finalUrl = pageRes.url;

    console.log('[OPG] Final URL:', finalUrl);

    if (finalUrl.includes('t.co') || !html.includes('og:op:cas')) {
        const match = html.match(/https:\/\/style\.yh-inc\.jp\/(?:op-share|share)\/[a-zA-Z0-9_-]+[^"' <]*/);

      if (match) {
        console.log('[OPG] Expanded share URL from t.co HTML:', match[0]);

        const expandedRes = await fetchViaBackground(match[0]);
        html = expandedRes.text;
        finalUrl = expandedRes.url;

        console.log('[OPG] Expanded final URL:', finalUrl);
      }
    }

  const doc = new DOMParser().parseFromString(html, 'text/html');

  const opCasMeta = doc.querySelector('meta[property="og:op:cas"]');
  const opMeta = doc.querySelector('meta[property="og:op"]');

  if (opCasMeta && opCasMeta.content) {
    const casRes = await fetchViaBackground(opCasMeta.content);
    const casJson = JSON.parse(casRes.text);

    const jwt = Array.isArray(casJson)
      ? casJson[0]
      : casJson.jwt || casJson.vc || casJson.token;

    if (!jwt) {
      throw new Error('CAS JWT not found');
    }

    const payload = decodeJwtPayload(jwt);
    const subject = payload.credentialSubject || {};

    const header = decodeJwtHeader(jwt);

    console.log('[OPG] JWT header:', header);
console.log('[OPG] JWT issuer:', payload.issuer);

    const spRes = await fetchViaBackground('https://style.yh-inc.jp/.well-known/sp.json');
    const sp = JSON.parse(spRes.text);

    const publicJwk = findPublicJwk(sp);
    const signatureVerified = await verifyJwtSignature(jwt, publicJwk);

    console.log('[OPG] JWT signature verified:', signatureVerified);

    const isVerified = signatureVerified === true;

    return {
        issuer: normalizeIssuer(payload.issuer),
        author: normalizeAuthor(subject.author),
        published: subject.datePublished || subject.published || '-',
        updated: subject.dateModified || subject.updated || '-',
        verified: isVerified,
        status: isVerified ? 'verified' : 'validated',
        logo: subject.logo || null
    };
  }

  if (opMeta && opMeta.content) {
    return JSON.parse(opMeta.content);
  }

  return null;
}

function getStatusLabel(opData) {
  if (opData.verified === true) {
    return 'OP Verified Origin';
  }

  if (opData.status === 'validated') {
    return 'OP Validated Origin';
  }

  return 'OP Origin Detected';
}

function formatDateJa(value) {
  if (!value || value === '-') return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function createXMiniCard(opData) {
  const opLogoUrl = chrome.runtime.getURL('op-logo.png');
  const fallbackIssuerLogoUrl = chrome.runtime.getURL('yh_logo.png');

  const issuerLogoUrl = opData.logo || fallbackIssuerLogoUrl;

  const card = document.createElement('div');
  card.className = 'opg-x-mini-card';

  let statusClass = 'opg-detected';
  
  if (opData.status === 'validated') {
        statusClass = 'opg-validated';
  }
    
  if (opData.verified === true) {
        statusClass = 'opg-verified';
  }

  card.innerHTML = `
    <div class="opg-x-mini-header ${statusClass}">
      <img src="${opLogoUrl}" class="opg-x-mini-logo">
      <span>${getStatusLabel(opData)}</span>
    </div>

    <div class="opg-x-mini-body">
      <div class="opg-x-mini-left">
        <img src="${issuerLogoUrl}" class="opg-x-issuer-logo">

        <div class="opg-x-mini-main">
          <strong>${opData.issuer || 'Unknown'}</strong>
          <span>執筆者: ${opData.author || '-'}</span>
        </div>
      </div>

      <div class="opg-x-mini-date">
        公開日: ${formatDateJa(opData.published)}
      </div>
    </div>
  `;

  return card;
}

function initBlockShareMode() {
  console.log('[OPG] Block share mode started');

  if (location.pathname.startsWith('/op-share/')) {
    console.log('[OPG] Block share mode skipped on OP Share page');
    return;
  }

  const targets = Array.from(
    document.querySelectorAll('p, h1, h2, h3, h4, blockquote')
  );

  targets.forEach((el) => {
    const text = (el.innerText || '').trim();

    if (!text || text.length < 30) return;
    if (el.dataset.opgShareReady === '1') return;

    el.dataset.opgShareReady = '1';
    el.classList.add('opg-share-target');

    el.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const hash = await sha256Base64Url(text);

      const ogTitleMeta = document.querySelector('meta[property="og:title"]');
      const h1Title = document.querySelector('h1');

      const pageTitle =
       (ogTitleMeta && ogTitleMeta.content) ||
       (h1Title && h1Title.innerText.trim()) ||
        document.title ||
        '';

      const sourceUrl = location.href.split('#')[0];

      const encodedText = encodeURIComponent(text.slice(0, 180));
      const encodedTitle = encodeURIComponent(pageTitle);
      const encodedSource = encodeURIComponent(sourceUrl);
      const encodedAuthor = encodeURIComponent('Yoshifumi Takeuchi');

      const shareUrl =
        `https://style.yh-inc.jp/op-share/${hash}` +
        `?text=${encodedText}` +
        `&title=${encodedTitle}` +
        `&source=${encodedSource}` +
        `&author=${encodedAuthor}`;

      const shareText = `${text}\n\n${shareUrl}`;

      await navigator.clipboard.writeText(shareText);

      showSharePopup(el, shareUrl);
    });
  });
}

async function sha256Base64Url(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);

  const bytes = Array.from(new Uint8Array(digest));
  const binary = bytes.map((b) => String.fromCharCode(b)).join('');
  const base64 = btoa(binary);

  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function showSharePopup(el, shareUrl) {
  const old = document.querySelector('.opg-share-popup');
  if (old) old.remove();

  const popup = document.createElement('div');
  popup.className = 'opg-share-popup';

  popup.innerHTML = `
    <div class="opg-share-title">OP block share copied</div>
    <div class="opg-share-url">${shareUrl}</div>
    <div class="opg-share-note">Xの投稿画面に貼り付けてください</div>
  `;

  document.body.appendChild(popup);

  const rect = el.getBoundingClientRect();

  popup.style.left = `${window.scrollX + rect.left}px`;
  popup.style.top = `${window.scrollY + rect.top - 90}px`;

  setTimeout(() => {
    popup.remove();
  }, 3500);
}

})();
