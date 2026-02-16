(() => {
  const els = {
    q: document.getElementById('q'),
    season: document.getElementById('season'),
    reset: document.getElementById('reset'),
    tbody: document.getElementById('tbody'),
    count: document.getElementById('count'),
    sortLabel: document.getElementById('sortLabel'),
    table: document.getElementById('t'),
  };

  let rows = [];
  let view = [];
  let sortKey = 'character';
  let sortDir = 1; // 1 asc, -1 desc

  const normalise = (s) => (s ?? '').toString().toLowerCase();

  const parseEp = (s) => {
    // "S02E03" -> [2,3]
    const m = /^S(\d\d)E(\d\d)$/.exec(s || '');
    if (!m) return [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
    return [parseInt(m[1], 10), parseInt(m[2], 10)];
  };

  const cmp = (a, b) => {
    const ka = a[sortKey];
    const kb = b[sortKey];

    // Episode-aware sort for first/last
    if (sortKey === 'first' || sortKey === 'last') {
      const [sa, ea] = parseEp(ka);
      const [sb, eb] = parseEp(kb);
      if (sa !== sb) return (sa - sb) * sortDir;
      if (ea !== eb) return (ea - eb) * sortDir;
      return normalise(a.character).localeCompare(normalise(b.character)) * sortDir;
    }

    return normalise(ka).localeCompare(normalise(kb)) * sortDir;
  };

  const labelForSort = () => {
    const dir = sortDir === 1 ? 'A→Z' : 'Z→A';
    const epDir = sortDir === 1 ? 'earlier→later' : 'later→earlier';
    const k = (sortKey === 'first' || sortKey === 'last')
      ? `${sortKey.toUpperCase()} (${epDir})`
      : `${sortKey[0].toUpperCase()}${sortKey.slice(1)} (${dir})`;
    els.sortLabel.textContent = k;
  };

  const applyFilters = () => {
    const q = normalise(els.q.value).trim();
    const s = els.season.value; // "S03" or ""
    view = rows.filter(r => {
      if (s) {
        // keep if character is present at any point during that season:
        const [sf] = parseEp(r.first);
        const [sl] = parseEp(r.last);
        const seasonNum = parseInt(s.slice(1), 10);

        const startsAfterSeason = sf > seasonNum;
        const endsBeforeSeason  = sl < seasonNum;
        if (startsAfterSeason || endsBeforeSeason) return false;
      }
      if (!q) return true;
      const hay =
        normalise(r.character) + ' ' +
        normalise(r.actor) + ' ' +
        normalise(r.end) + ' ' +
        normalise(r.first) + ' ' +
        normalise(r.last);
      return hay.includes(q);
    });

    view.sort(cmp);
    render();
  };

  const render = () => {
    els.count.textContent = String(view.length);

    if (view.length === 0) {
      els.tbody.innerHTML = '<tr><td colspan="5">No matches.</td></tr>';
      return;
    }

    const html = view.map(r => `
      <tr>
        <td>${escapeHtml(r.character)}</td>
        <td>${escapeHtml(r.actor)}</td>
        <td class="mono"><span class="pill">${escapeHtml(r.first)}</span></td>
        <td class="mono"><span class="pill">${escapeHtml(r.last)}</span></td>
        <td>${escapeHtml(r.end)}</td>
      </tr>
    `).join('');

    els.tbody.innerHTML = html;
  };

  const escapeHtml = (s) => {
    return (s ?? '').toString()
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  };

  const setSort = (key) => {
    if (sortKey === key) {
      sortDir *= -1;
    } else {
      sortKey = key;
      sortDir = 1;
    }
    labelForSort();
    applyFilters();
  };

  els.table.querySelectorAll('thead th[data-key]').forEach(th => {
    th.addEventListener('click', () => setSort(th.dataset.key));
  });

  els.q.addEventListener('input', applyFilters);
  els.season.addEventListener('change', applyFilters);
  els.reset.addEventListener('click', () => {
    els.q.value = '';
    els.season.value = '';
    sortKey = 'character';
    sortDir = 1;
    labelForSort();
    applyFilters();
  });

  fetch('./got_main_cast.json', { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(j => {
      rows = j;
      labelForSort();
      applyFilters();
    })
    .catch(err => {
      els.tbody.innerHTML =
        `<tr><td colspan="5"><span class="warn">Couldn’t load the data file.</span><br>` +
        `Make sure <span class="mono">got_main_cast.json</span> is next to <span class="mono">index.html</span>, ` +
        `and that you’re viewing this page from a normal web server (not inside a restricted preview).<br>` +
        `Details: ${escapeHtml(err.message)}</td></tr>`;
    });
})();
