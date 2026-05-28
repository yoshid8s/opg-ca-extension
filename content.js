(async function () {

    const isX = location.hostname === 'x.com' || location.hostname === 'twitter.com';

    if (isX) {
        initXTimelineMode();
    }

    const hasOpMeta =
      document.querySelector('meta[property="og:op"]') ||
      document.querySelector('meta[property="og:op:cas"]');

    if (hasOpMeta) {
      initBlockShareMode();
    } 

  const opMeta = document.querySelector('meta[property="og:op"]');
  const opCasMeta = document.querySelector('meta[property="og:op:cas"]');

  const casUrl = opCasMeta?.content || '';

  const postIdMatch = casUrl.match(/\/cas\/(\d+)_cas\.json/);
  const postId = postIdMatch ? postIdMatch[1] : '';

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

      const siteProfileData = await fetchSiteProfile();

      if (siteProfileData) {
        opData = siteProfileData;
      } else {

        const hostname = location.hostname;

        let platformType = 'non-op';

        if (
          hostname.includes('youtube.com') ||
          hostname.includes('youtu.be') ||
          hostname.includes('tiktok.com')
        ) {
          platformType = 'platform-video';

        } else if (
          hostname.includes('x.com') ||
          hostname.includes('twitter.com') ||
          hostname.includes('facebook.com') ||
          hostname.includes('fb.com') ||
          hostname.includes('instagram.com') ||
          hostname.includes('threads.com') ||
          hostname.includes('reddit.com')
        ) {
          platformType = 'platform-social';

        } else if (
          hostname.includes('note.com')
        ) {
          platformType = 'platform-community';
        }

        if (platformType === 'platform-video') {
          // YouTube / TikTok 用
          opData = {
            issuer: '動画共有プラットフォーム（OP未対応）',
            author: '-',
            published: '-',
            updated: '-',
            verified: false,
            status: 'non-op',
            logo: null,
            message:
              '動画共有プラットフォームでは、多くのクリエーターが動画を発信しています。<br>' +
              '発信者確認やコンテンツの信頼性判断は、<br>' +
              'プラットフォームの仕組みや利用者自身の確認に依存しています。<br><br>' +
              'OPが動画共有プラットフォームで、<br>' +
              'どのように発信者確認やコンテンツ真正性を支援できるかは、<br>' +
              '今後の検討領域です。<br>'
          };
        }
        else if (platformType === 'platform-social') {
          // X / FB / Insta / Threads / Reddit 用
          opData = {
            issuer: 'SNSプラットフォーム（OP未対応）',
            author: '-',
            published: '-',
            updated: '-',
            verified: false,
            status: 'non-op',
            logo: null,
            message:
              'SNSでは、多くの人がリアルタイムに情報発信しています。<br><br>' +
              '情報の信頼性判断は、<br>' +
              '利用者自身による確認や、<br>' +
              '各プラットフォームの仕組みに依存しています。<br><br>' +
              'OPがSNSにおける発信者確認や<br>' +
              '情報真正性確認をどのように支援できるかは、<br>' +
              '今後の検討領域です。<br>'
          };
        }
        else if (platformType === 'platform-community') {
          // note 用
          opData = {
            issuer: 'ブログ・コミュニティプラットフォーム（OP未対応）',
            author: '-',
            published: '-',
            updated: '-',
            verified: false,
            status: 'non-op',
            logo: null,
            message:
              'ブログやコミュニティサービスでは、<br>' +
              '個人や組織が自由に情報発信しています。<br><br>' +
              '発信者確認やコンテンツ真正性確認は、<br>' +
              'サービス提供者や利用者の判断に依存しています。<br><br>' +
              'OPがコミュニティサービスをどのように支援できるかは、<br>' +
              '今後の検討領域です。<br>'
          };
        }
        else {
          opData = {
            issuer: 'このサイトは非OPサイトです',
            author: '-',
            published: '-',
            updated: '-',
            verified: false,
            status: 'non-op',
            logo: null,
            message:
              'このサイトはOPに対応していません。<br>' +
              'OPによる発信者確認はできませんが、<br>' +
              'ドメインの公開登録情報を確認できます。<br><br>' +
              'このサイトの運営者情報に疑問がある場合は、<br>' +
              'この画面をクリックして、<br>' +
              'サイト上に表示されている運営者情報と、<br>' +
              'ドメインの公開登録情報が一致しているか確認することをおすすめします。'
          };
        }
      }
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

  function getSiteFavicon() {
    return (
      document.querySelector('link[rel="icon"]')?.href ||
      document.querySelector('link[rel="shortcut icon"]')?.href ||
      document.querySelector('link[rel="apple-touch-icon"]')?.href ||
      `${location.origin}/favicon.ico`
    );
  }

  async function fetchSiteProfile() {
  const hosts = [
    location.hostname,
    location.hostname.replace(/^www\./, '')
  ];

  for (const host of [...new Set(hosts)]) {
    try {
      const spUrl = `https://${host}/.well-known/sp.json`;
      console.log('[OPG] Fetch Site Profile:', spUrl);

      const res = await fetchViaBackground(spUrl);
      const sp = JSON.parse(res.text);

      const hasBasicStructure =
        sp &&
        (
          sp.credentialSubject ||
          sp.issuer ||
          sp.type ||
          sp['@context'] ||
          Array.isArray(sp.originators)
        );

      if (!hasBasicStructure) continue;

      const subject = sp.credentialSubject || {};
      const originator = Array.isArray(sp.originators) ? sp.originators[0] : null;

      const issuer =
        sp.issuer ||
        subject.name ||
        subject.id ||
        originator?.name ||
        originator?.id ||
        host;

      return {
        issuer: normalizeIssuer(issuer),
        author: normalizeAuthor(subject.author || originator?.name),
        published: subject.datePublished || sp.validFrom || '-',
        updated: subject.dateModified || sp.validUntil || '-',
        verified: false,
        status: 'site-profile',
        logo: subject.logo || originator?.logo || getSiteFavicon(),
        message:
          'このサイトでは OP Site Profile が公開されています。<br>' +
          '発信者情報を参照できます。<br><br>' +
          'ただし、このページ単位の Content Attestation は確認できませんでした。'
      };
    } catch (e) {
      console.log('[OPG] Site Profile fetch failed:', host, e);
    }
  }

  return null;
}

  function renderCard(opData) {
    const existing = document.getElementById('opg-ca-card');
    if (existing) existing.remove();

    const card = document.createElement('div');
    card.id = 'opg-ca-card';

    const logoUrl = chrome.runtime.getURL('op-logo.png');
    const fallbackIssuerLogoUrl = chrome.runtime.getURL('default-logo.png');
    const issuerLogoUrl = opData.logo || fallbackIssuerLogoUrl;

    const verified = opData.verified === true;
    const isNonOp = opData.status === 'non-op';

    let statusClass = 'opg-detected';

    if (opData.status === 'validated') {
      statusClass = 'opg-validated';
    }

    if (opData.verified === true) {
      statusClass = 'opg-verified';
    }

    if (isNonOp) {
      statusClass = 'opg-nonop';
    }

    const statusText = isNonOp
      ? 'OPによる発信者情報は確認できません'
      : getStatusLabel(opData);

    const messageHtml = opData.message
      ? opData.message
      : 'この投稿内容は、上記発信者のWebページにあるものと同一で、文章の改ざんはされていないことが、OPにより確認できました。';

    const issuerLogoHtml = isNonOp
      ? `<div class="opg-nonop-icon">?</div>`
      : `<img src="${issuerLogoUrl}" class="opg-issuer-logo">`;

    card.innerHTML = `
      <div class="opg-header ${statusClass}">

        <img src="${logoUrl}" class="opg-logo">

        <div class="opg-header-text">
          ${statusText}
        </div>

      </div>

      <div class="opg-body">

        <div class="opg-issuer">

          ${issuerLogoHtml}

          <div class="opg-title">
            ${opData.issuer || 'Unknown'}
          </div>

        </div>

        <div class="opg-item">
          記事執筆者: ${opData.author || '-'}
        </div>

        <div class="opg-item">
          編集者: ${opData.editor || '-'}
        </div>

        <div class="opg-item">
         公開日: ${formatDateJa(opData.published)}
        </div>

        <div class="opg-item">
        更新日: ${formatDateJa(opData.updated)}
        </div>

        ${opData.genre ? `
          <div class="opg-item">
            ジャンル: ${opData.genre}
          </div>
        ` : ''}

        ${opData.description ? `
          <div class="opg-item opg-description">
            説明: ${opData.description}
          </div>
        ` : ''}

        <div class="opg-message">
          ${messageHtml}
        </div>

      </div>
    `;

    document.body.appendChild(card);

    if (opData.status === 'non-op') {
      card.style.cursor = 'pointer';

      card.addEventListener('click', async () => {
        const domain = location.hostname.replace(/^www\./, '');

        const favicon =
          document.querySelector('link[rel="icon"]')?.href ||
          document.querySelector('link[rel="shortcut icon"]')?.href ||
          document.querySelector('link[rel="apple-touch-icon"]')?.href ||
          `${location.origin}/favicon.ico`;

          if (!chrome?.storage?.local) {
            console.log('[OPG] chrome.storage.local not available');
            return;
          }

          await chrome.storage.local.set({
            opgDomainInfo: {
            domain,
            url: location.href,
            title: document.title,
            favicon
          }
        });

        chrome.runtime.sendMessage({
          type: 'OPEN_OPG_SIDEPANEL'
        });
      });
    }

    const toggle = document.createElement('button');
    toggle.id = 'opg-ca-toggle';
    toggle.innerHTML = `<img src="${logoUrl}" alt="OP">`;

    document.body.appendChild(toggle);

    toggle.addEventListener('click', () => {
      const collapsed = card.classList.toggle('opg-collapsed');

      if (collapsed) {
        toggle.classList.add('opg-toggle-visible');
      } else {
        toggle.classList.remove('opg-toggle-visible');
      }
    });

    setTimeout(() => {
      card.classList.add('opg-collapsed');
      toggle.classList.add('opg-toggle-visible');
    }, 5000);

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

      if (!href.startsWith('http')) {
        return false;
      }

      if (href.includes('x.com') || href.includes('twitter.com')) {
        return false;
      }

      return true;
    });

      if (!link) return;

      const href = link.href;
      const text = tweet.innerText || '';
      const processKey = href + text.slice(0, 80);

      if (processedUrls.has(processKey)) return;
      if (pendingUrls.has(processKey)) return;

      pendingUrls.add(processKey);

      try {
        const targetUrl = href;

        console.log('[OPG] Target URL:', targetUrl);

        const tweetText = extractTweetMainText(tweet);
        const opData = await fetchOpDataFromPage(targetUrl, tweetText);

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

  const httpsMatch = text.match(/https?:\/\/[^\s]+/);
  if (httpsMatch) {
    return httpsMatch[0];
  }

  const domainMatch = text.match(/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/);
  if (domainMatch) {
    return 'https://' + domainMatch[0];
  }

  return null;
}

async function fetchOpDataFromPage(url, tweetText = '') {
  if (url.includes('t.co')) {
  console.log('[OPG] t.co URL detected. Need expanded URL:', url);
  }

  console.log('[OPG] Fetch linked page:', url);

    const pageRes = await fetchViaBackground(url);
    let html = pageRes.text;
    let finalUrl = pageRes.url;

    const match = html.match(/https?:\/\/[^"' <]+\/(?:op-share|share)\/[a-zA-Z0-9_-]+(?:\?[^"' <]*)?/);

    if (match) {
      const expandedUrl = match[0]
        .replace(/&amp;/g, '&')
        .replace(/&#038;/g, '&');

      console.log('[OPG] Expanded share URL from t.co HTML:', expandedUrl);

      const expandedRes = await fetchViaBackground(expandedUrl);
      html = expandedRes.text;
      finalUrl = expandedRes.url;

      console.log('[OPG] Expanded final URL:', finalUrl);
      console.log('[OPG] Expanded HTML has og:op:cas:', html.includes('og:op:cas'));
      console.log('[OPG] Expanded HTML start:', html.slice(0, 500));
    }


  function extractFaviconFromDoc(doc, finalUrl) {
  const iconEl =
    doc.querySelector('link[rel~="icon"][sizes]') ||
    doc.querySelector('link[rel~="apple-touch-icon"]') ||
    doc.querySelector('link[rel~="icon"]') ||
    doc.querySelector('link[rel~="shortcut icon"]');

  const iconHref = iconEl?.getAttribute('href');

  if (iconHref) {
    return new URL(iconHref, finalUrl).href;
  }

  return new URL('/favicon.ico', finalUrl).href;
  }
  
  const doc = new DOMParser().parseFromString(html, 'text/html');

  console.log(
    '[OPG] icon tags:',
      Array.from(doc.querySelectorAll('link[rel*="icon"]'))
      .map(x => x.outerHTML)
  );

  const favicon = extractFaviconFromDoc(doc, finalUrl);
  console.log('[OPG] favicon:', favicon);

  const opCasMeta = doc.querySelector('meta[property="og:op:cas"]');
  console.log('[OPG] opCasMeta:', opCasMeta);
  console.log('[OPG] opCasMeta content:', opCasMeta?.content);
  const opMeta = doc.querySelector('meta[property="og:op"]');

  const blockTextMeta = doc.querySelector('meta[property="og:op:block_text"]');
  const blockHashMeta = doc.querySelector('meta[property="og:op:block_hash"]');

  let originalBlockText = blockTextMeta?.content || '';

  if (!originalBlockText && tweetText) {
    originalBlockText = tweetText;
  }
  const originalBlockHash = blockHashMeta?.content || '';

  if (opCasMeta && opCasMeta.content) {
    const casUrl = opCasMeta.content
      .replace(/&amp;/g, '&')
      .trim();

    console.log('[OPG] Fetch CAS URL:', casUrl);

    const casRes = await fetchViaBackground(casUrl);

    console.log('[OPG] CAS fetch result:', {
      url: casRes.url,
      status: casRes.status,
      textStart: casRes.text.slice(0, 200)
    });

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

    const spUrl = new URL('/.well-known/sp.json', finalUrl).href;
    const spRes = await fetchViaBackground(spUrl);

    const sp = JSON.parse(spRes.text);

    const publicJwk = findPublicJwk(sp);
    const signatureVerified = await verifyJwtSignature(jwt, publicJwk);

    console.log('[OPG] JWT signature verified:', signatureVerified);

    const isVerified = signatureVerified === true;

    const comparison = compareSharedText(tweetText, originalBlockText, originalBlockHash);

    return {
        issuer: normalizeIssuer(payload.issuer),
        author: normalizeAuthor(subject.author),
        published: subject.datePublished || subject.published || '-',
        updated: subject.dateModified || subject.updated || '-',
        verified: isVerified,
        status: isVerified ? 'verified' : 'validated',
        logo: favicon || subject.logo || null,
        comparison: comparison
    };
  }

  if (opMeta && opMeta.content) {
    return JSON.parse(opMeta.content);
  }

  return null;
}

function getStatusLabel(opData) {
  if (opData.comparison && ['minor', 'changed'].includes(opData.comparison.type)) {
    return 'OPによる内容変更検出';
  }

  if (opData.status === 'site-profile') {
    return 'OP Site Profile 公開済みサイト';
  }

  if (opData.verified === true) {
    return 'OPによる発信者実在性確認済みサイト';
  }

  if (opData.status === 'validated') {
    return 'OPによる発信者検証済みサイト';
  }

  if (opData.status === 'ca-detected') {
    return 'Content Attestation 検出済みページ';
  }

  return 'OPによる発信者情報検出';
}

function formatDateJa(value) {
  if (!value || value === '-') return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function normalizeCompareText(text) {
  return (text || '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/\S*)?/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/　/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function hashTextBase64Url(text) {
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

function textSimilarity(a, b) {
  const aa = tokenizeForSimilarity(a);
  const bb = tokenizeForSimilarity(b);

  if (!aa.length || !bb.length) return 0;

  const setA = new Set(aa);
  const setB = new Set(bb);

  let common = 0;
  setA.forEach((x) => {
    if (setB.has(x)) common++;
  });

  return common / Math.max(setA.size, setB.size);
}

function detectMeaningFlip(a, b) {
  const aa = normalizeCompareText(a).toLowerCase();
  const bb = normalizeCompareText(b).toLowerCase();

  const negPatterns = [
    /not\s+\w+/g,
    /cannot\s+\w+/g,
    /can't\s+\w+/g,
    /never\s+\w+/g,
    /できません/g,
    /できない/g,
    /ではない/g,
    /じゃない/g,
    /ありません/g,
    /ない/g,
    /ません/g
  ];

  const extractNegatives = (text) => {
    const found = [];

    negPatterns.forEach((re) => {
      const matches = text.match(re);
      if (matches) {
        found.push(...matches);
      }
    });

    return found.sort().join('|');
  };

  return extractNegatives(aa) !== extractNegatives(bb);
}

function tokenizeForSimilarity(text) {
  const normalized = normalizeCompareText(text).toLowerCase();

  if (!normalized) return [];

  // 英文・日本語混在でも動く簡易2-gram
  const compact = normalized.replace(/\s+/g, '');

  const tokens = [];
  for (let i = 0; i < compact.length - 1; i++) {
    tokens.push(compact.slice(i, i + 2));
  }

  return tokens;
}

function compareSharedText(tweetText, originalText, originalHash) {
  const tweet = normalizeCompareText(tweetText);
  const original = normalizeCompareText(originalText);

  console.log('[OPG] compare tweet:', tweet);
  console.log('[OPG] compare original:', original);
  console.log('[OPG] compare score:', textSimilarity(tweet, original));
  console.log('[OPG] meaningFlip:', detectMeaningFlip(tweet, original));

  if (!tweet || !original) {
    return {
      type: 'unknown',
      message: ''
    };
  }

  if (tweet === original) {
    return {
      type: 'match',
      message: 'この投稿内容は、上記発信者のWebページにあるものと同一で、文章の改ざんはされていないことが、OPにより確認できました。'
    };
  }

  if (original.startsWith(tweet) || tweet.startsWith(original)) {
    return {
      type: 'truncated',
      message: 'この投稿内容は、Xの文字数制限等により、文章の一部が省略または末尾が調整されています。'
    };
  }

  const score = textSimilarity(tweet, original);
  const meaningFlip = detectMeaningFlip(tweet, original);

  if (meaningFlip && score >= 0.6) {
    return {
      type: 'changed',
      message: 'この投稿内容は、オリジナルから変更されており、否定表現などにより文章の意味が変化している可能性があります。注意して原文を確認してください。'
    };
  }

  if (score >= 0.75) {
    return {
      type: 'minor',
      message: 'この投稿内容は、オリジナルから変更されていますが、文章の意味改変は軽微です。原文を確認してください。'
    };
  }

  return {
    type: 'changed',
    message: 'この投稿内容は、オリジナルから変更されており、文章の意味が変化している可能性があります。注意して原文を確認してください。'
  };
}

function extractTweetMainText(tweet) {
  const tweetTextEl = tweet.querySelector('[data-testid="tweetText"]');

  if (!tweetTextEl) {
    return normalizeCompareText(tweet.innerText || '');
  }

  const clone = tweetTextEl.cloneNode(true);

  clone.querySelectorAll('a').forEach((a) => a.remove());

  return normalizeCompareText(clone.innerText || '');
}

function createXMiniCard(opData) {
  const opLogoUrl = chrome.runtime.getURL('op-logo.png');
  const fallbackIssuerLogoUrl = chrome.runtime.getURL('default-logo.png');

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

    ${opData.comparison?.message ? `
      <div class="opg-x-compare-message opg-x-compare-${opData.comparison.type}">
        ${opData.comparison.message}
      </div>
    ` : ''}
  `;

  return card;
}

function initBlockShareMode() {
  console.log('[OPG] Block share mode started');
  console.log('[OPG] initBlockShareMode start');

  if (location.pathname.startsWith('/op-share/')) {
    console.log('[OPG] Block share mode skipped on OP Share page');
    return;
  }

  const targets = Array.from(
    document.querySelectorAll('p, h1, h2, h3, h4, blockquote')
  );

  console.log('[OPG] share targets found:', targets.length, targets);

  targets.forEach((el) => {
    const text = (el.innerText || '').trim();

    if (!text || text.length < 30) return;
    if (el.dataset.opgShareReady === '1') return;

    el.dataset.opgShareReady = '1';
    el.classList.add('opg-share-target');

    el.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const shareBlockText = text.slice(0, 80);

      const hash = await sha256Base64Url(shareBlockText);

      const ogTitleMeta = document.querySelector('meta[property="og:title"]');
      const h1Title = document.querySelector('h1');

      const pageTitle =
        (ogTitleMeta && ogTitleMeta.content) ||
        (h1Title && h1Title.innerText.trim()) ||
        document.title ||
        '';

      const sourceUrl = location.href.split('#')[0];

      const encodedText = encodeURIComponent(shareBlockText);
      const encodedTitle = encodeURIComponent(pageTitle);
      const encodedSource = encodeURIComponent(sourceUrl);
      const encodedAuthor = encodeURIComponent('Yoshifumi Takeuchi');

      const metaShareBase = document.querySelector(
        'meta[property="og:op:share_base"]'
      );

      if (!metaShareBase?.content) {
        console.log('[OPG] og:op:share_base not found');
        console.log('[OPG] selector mode only');

        // return を消す
      }

      let shareBase = null;

      if (!metaShareBase?.content) {
        console.log('[OPG] og:op:share_base not found');
        console.log('[OPG] selector mode only');
      } else {
        shareBase = metaShareBase.content;
      }

      const opCasMeta = document.querySelector('meta[property="og:op:cas"]');
      const encodedCas = encodeURIComponent(opCasMeta?.content || '');

      if (!shareBase) {
        console.log('[OPG] no shareBase, external site share mode');

        const shareText = `${shareBlockText}\n\n${sourceUrl}`;

        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
          '_blank'
        );

        showSharePopup(el, sourceUrl);
        return;
      }

      const shareUrl =
        `${shareBase.replace(/\/$/, '')}/${hash}`;

      const apiUrl =
        `${shareBase.replace(/\/op-share\/?$/, '')}/wp-json/opg/v1/share`;

      const savePayload = {
        hash: hash,
        text: shareBlockText,
        post_id: postId,
        cas_url: opCasMeta?.content || '',
        title: pageTitle,
        source: sourceUrl,
        author: 'Yoshifumi Takeuchi'
      };

      const saveRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
         'Content-Type': 'application/json'
        },
        body: JSON.stringify(savePayload)
      });

      if (!saveRes.ok) {
        console.error('[OPG] Failed to save OP share data:', await saveRes.text());
        return;
      }

      const shareText = `${shareBlockText}\n\n${shareUrl}`;

      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
        '_blank'
      );

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

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'OPG_FRAME_CA_FOUND') return;

  console.log('[OPG] CA found in frame:', message.payload);

  renderCard({
    issuer: location.hostname,
    author: '-',
    published: '-',
    updated: '-',
    verified: false,
    status: 'ca-detected',
    logo: getSiteFavicon(),
    message:
      'このページでは Content Attestation 情報が検出されました。<br>' +
      'ページ内に CA 情報があります。<br><br>' +
      '現在はCA情報の検出段階で、署名検証までは行っていません。'
  });

  initBlockShareMode();
});

function scanCasScriptsInMainPage() {
  if (window.__opgCasDetected) return true;

  const scripts = document.querySelectorAll(
    'script[type="application/cas+json"],' +
    'script[type="application/ops+json"],' +
    'script[type="application/opmeta+json"],' +
    'script[src][type="application/cas+json"],' +
    'script[src][type="application/ops+json"],' +
    'script[src][type="application/opmeta+json"]'
  );

  if (!scripts.length) return false;

  console.log('[OPG] CA script found in main page:', scripts);

  window.__opgCasDetected = true;

  let caPayload = null;

  try {
    const firstScript = scripts[0];
    const rawText = (firstScript.textContent || '').trim();

    let jwt = rawText;

    if (rawText.startsWith('[')) {
      jwt = JSON.parse(rawText)[0];
    }

    if (jwt && jwt.includes('.')) {
      caPayload = decodeJwtPayload(jwt);
      console.log('[OPG] Decoded embedded CA payload:', caPayload);
    }
  } catch (e) {
    console.log('[OPG] Failed to decode embedded CA:', e);
  }

  const subject = caPayload?.credentialSubject || {};

  renderCard({
    issuer: normalizeIssuer(caPayload?.issuer || location.hostname),
    headline: subject.headline || '',
    author: normalizeAuthor(subject.author),
    editor: normalizeAuthor(subject.editor),
    published: subject.datePublished || '-',
    updated: subject.dateModified || '-',
    genre: subject.genre || '',
    description: subject.description || '',
    verified: false,
    status: 'ca-detected',
    logo: getSiteFavicon(),
    message:
      'このページでは Content Attestation 情報が検出されました。<br>' +
      'ページ内に CA 情報があります。<br><br>' +
      '現在はCA情報の検出段階で、署名検証までは行っていません。'
  });

  console.log('[OPG] call initBlockShareMode from CA detection');

  setTimeout(() => {
    initBlockShareMode();
  }, 1000);

  return true;
}

scanCasScriptsInMainPage();

const opgCasObserver = new MutationObserver(() => {
  scanCasScriptsInMainPage();
});

opgCasObserver.observe(document.documentElement, {
  childList: true,
  subtree: true

});

})();

