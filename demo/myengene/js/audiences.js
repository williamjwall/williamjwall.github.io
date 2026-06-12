(function () {
    const searchInput = document.getElementById('serve-search');
    const tabsEl = document.getElementById('serve-tabs');
    const listEl = document.getElementById('serve-list');
    const panelEl = document.getElementById('serve-panel');
    const countEl = document.getElementById('serve-count');

    if (!searchInput) return;

    let entries = [];
    let fuse = null;
    let activeId = null;
    let activeCategory = '';

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatBody(text) {
        return text
            .split(/(?<=\.)\s+/)
            .filter((s) => s.length > 0)
            .map((s) => '<p>' + escapeHtml(s) + '</p>')
            .join('');
    }

    function filterEntries() {
        const query = searchInput.value.trim();
        let results = entries;

        if (activeCategory) {
            results = results.filter((e) => e.category === activeCategory);
        }

        if (query && fuse) {
            const ids = new Set(fuse.search(query).map((r) => r.item.id));
            results = results.filter((e) => ids.has(e.id));
        } else if (query) {
            const q = query.toLowerCase();
            results = results.filter((e) =>
                e.title.toLowerCase().includes(q) ||
                e.summary.toLowerCase().includes(q) ||
                e.body.toLowerCase().includes(q)
            );
        }

        return results;
    }

    function updateUrl() {
        const params = new URLSearchParams();
        if (activeCategory) params.set('category', activeCategory);
        if (searchInput.value.trim()) params.set('q', searchInput.value.trim());
        if (activeId) params.set('topic', activeId);

        const qs = params.toString();
        const url = qs ? '?' + qs : window.location.pathname.split('/').pop() || 'audiences.html';
        history.replaceState(null, '', qs ? '?' + qs : 'audiences.html');
    }

    function setCategory(category) {
        activeCategory = category;
        activeId = null;

        tabsEl.querySelectorAll('.serve-explorer-tab').forEach((tab) => {
            const isActive = tab.dataset.category === category;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        render();
    }

    function showDetail(item) {
        activeId = item.id;

        listEl.querySelectorAll('.serve-explorer-item').forEach((li) => {
            li.classList.toggle('is-active', li.dataset.id === item.id);
        });

        panelEl.innerHTML =
            '<p class="serve-explorer-panel-cat">' + escapeHtml(item.category) + '</p>' +
            '<h2 class="serve-explorer-panel-title">' + escapeHtml(item.title) + '</h2>' +
            '<p class="serve-explorer-panel-summary">' + escapeHtml(item.summary) + '</p>' +
            '<div class="serve-explorer-panel-body">' + formatBody(item.body) + '</div>';

        updateUrl();

        if (window.matchMedia('(max-width: 768px)').matches) {
            panelEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function renderList(items) {
        listEl.innerHTML = '';
        const query = searchInput.value.trim();

        countEl.textContent = items.length
            ? items.length + ' result' + (items.length === 1 ? '' : 's')
            : '';

        if (!items.length) {
            listEl.innerHTML =
                '<li class="serve-explorer-item-empty">' +
                    (query ? 'No results for “' + escapeHtml(query) + '”. Try another term or tab.' : 'Nothing in this category yet.') +
                '</li>';
            panelEl.innerHTML = '<p class="serve-explorer-empty">Try a different search or filter.</p>';
            activeId = null;
            updateUrl();
            return;
        }

        items.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'serve-explorer-item' + (item.id === activeId ? ' is-active' : '');
            li.dataset.id = item.id;
            li.setAttribute('role', 'button');
            li.setAttribute('tabindex', '0');

            li.innerHTML =
                '<span class="serve-explorer-item-cat">' + escapeHtml(item.category) + '</span>' +
                '<span class="serve-explorer-item-title">' + escapeHtml(item.title) + '</span>' +
                '<span class="serve-explorer-item-summary">' + escapeHtml(item.summary) + '</span>';

            li.addEventListener('click', () => showDetail(item));
            li.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    showDetail(item);
                }
            });

            listEl.appendChild(li);
        });

        if (!activeId || !items.find((e) => e.id === activeId)) {
            showDetail(items[0]);
        } else {
            updateUrl();
        }
    }

    function render() {
        renderList(filterEntries());
    }

    searchInput.addEventListener('input', render);

    tabsEl.querySelectorAll('.serve-explorer-tab').forEach((tab) => {
        tab.addEventListener('click', () => setCategory(tab.dataset.category));
    });

    fetch('data/guides.json')
        .then((res) => res.json())
        .then((data) => {
            entries = data.entries || [];
            fuse = new Fuse(entries, {
                keys: ['title', 'summary', 'body', 'category'],
                threshold: 0.35,
                minMatchCharLength: 2
            });

            const params = new URLSearchParams(window.location.search);
            const cat = params.get('category');
            if (cat && ['Guides', 'For Individuals', 'For Industries'].includes(cat)) {
                activeCategory = cat;
                tabsEl.querySelectorAll('.serve-explorer-tab').forEach((tab) => {
                    const isActive = tab.dataset.category === cat;
                    tab.classList.toggle('active', isActive);
                    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
                });
            }

            const topic = params.get('topic');
            if (topic) activeId = topic;

            const q = params.get('q');
            if (q) searchInput.value = q;

            render();
        })
        .catch(() => {
            countEl.textContent = '';
            panelEl.innerHTML = '<p class="serve-explorer-empty">Unable to load topics.</p>';
        });
})();
