chrome.storage.local.get(['opgDomainInfo'], async (result) => {
  const content = document.getElementById('content');

  const hostname = result.opgDomainInfo?.domain || '';
  const pageUrl = result.opgDomainInfo?.url || '';
  const pageTitle = result.opgDomainInfo?.title || '';

  if (!hostname) {
    content.textContent = 'ドメイン情報が取得できませんでした。';
    return;
  }

  const prompt = `
現在表示中のWebサイトについて確認してください。

URL:
${pageUrl}

ページタイトル:
${pageTitle}

ドメイン:
${hostname}

このサイト内に掲載されている運営者情報を最優先で確認してください。

そのうえで、ドメイン公開登録情報と照合し、
一致しているかを一般ユーザー向けに説明してください。

似た名称の別サイトや別法人と混同しないでください。
`;

  const cleanDomain = hostname
    .replace(/^https?:\/\//, '')
    .replace(/^dns:/, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim();

  const rdapUrl = `https://rdap.org/domain/${cleanDomain}`;

  try {
    console.log('[OPG] RDAP domain:', cleanDomain);
    console.log('[OPG] RDAP URL:', rdapUrl);

    const res = await fetch(rdapUrl);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(`RDAP failed: ${res.status}`);
    }

    const registrar =
      data.entities?.[0]?.vcardArray?.[1]?.find((v) => v[0] === 'fn')?.[3] ||
      data.name ||
      '-';

    const nameservers = (data.nameservers || [])
      .map((n) => n.ldhName)
      .filter(Boolean)
      .join(', ') || '-';

    content.innerHTML = `
      <div class="item">
        <div class="label">Domain</div>
        <div class="value">${escapeHtml(cleanDomain)}</div>
      </div>

      <div class="item">
        <div class="label">Registrant / Registrar</div>
        <div class="value">${escapeHtml(registrar)}</div>
      </div>

      <div class="item">
        <div class="label">Name Servers</div>
        <div class="value">${escapeHtml(nameservers)}</div>
      </div>

      <hr>
      
      <p>
          上記のドメイン公開登録情報の見方がわからない方は、<br>
          このドメインの運営者情報について、<br>
          ChatGPTに質問することもできます。
      </p>
      
      <p>
        <a
            href="https://chatgpt.com/?q=${encodeURIComponent(prompt)}"
            target="_blank"
            rel="noopener noreferrer"
        >
            ChatGPTに質問する
        </a>
      </p>
    `;

  } catch (e) {
    content.innerHTML = `
      <div class="item">
        <div class="label">Domain</div>
        <div class="value">${escapeHtml(cleanDomain)}</div>
      </div>

      <p>
        ドメイン名やIPアドレスの登録者・管理者情報を確認できる<br>
        公開情報サービス「RDAP」の情報を<br>
        自動取得できませんでした。
      </p>

      <p>
        このドメインの運営者情報について、<br>
        ChatGPTに質問することもできます。
      </p>

      <p>
        <a
          href="https://chatgpt.com/?q=${encodeURIComponent(prompt)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ChatGPTに質問する
        </a>
      </p>
    `;
  }
});

function makeDomainCandidates(hostname) {
  const clean = hostname.replace(/^www\./, '').toLowerCase();
  const parts = clean.split('.');

  const candidates = [];

  for (let i = 0; i < parts.length - 1; i++) {
    candidates.push(parts.slice(i).join('.'));
  }

  return candidates;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
