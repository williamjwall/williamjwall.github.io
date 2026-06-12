(function () {
    let fuse = null;
    let entries = [];
    let selectedIndex = 0;

    function getEls() {
        return {
            overlay: document.getElementById('search-overlay'),
            input: document.getElementById('search-input'),
            resultsList: document.getElementById('search-results'),
            emptyState: document.getElementById('search-empty'),
            openBtn: document.getElementById('open-search')
        };
    }

    function initFuse(data) {
        entries = data.entries || [];
        fuse = new Fuse(entries, {
            keys: ['title', 'summary', 'body', 'tags', 'category'],
            threshold: 0.35,
            includeMatches: true,
            minMatchCharLength: 2
        });
        bindSearch();
    }

    function openSearch() {
        const { overlay, input, resultsList, emptyState } = getEls();
        if (!overlay) return;

        overlay.hidden = false;
        input.value = '';
        selectedIndex = 0;
        resultsList.innerHTML = '';
        emptyState.hidden = false;
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => input.focus());
    }

    function closeSearch() {
        const { overlay } = getEls();
        if (!overlay) return;
        overlay.hidden = true;
        document.body.style.overflow = '';
    }

    function navigateTo(item) {
        closeSearch();

        const onAudiences = window.location.pathname.includes('audiences.html');

        if (item.id && !item.href) {
            if (onAudiences) {
                const listItem = document.querySelector('.serve-explorer-item[data-id="' + item.id + '"]');
                if (listItem) {
                    listItem.click();
                    return;
                }
            }
            window.location.href = 'audiences.html?topic=' + encodeURIComponent(item.id);
            return;
        }

        if (item.href) {
            if (item.href.startsWith('audiences.html') && item.id) {
                const onAudiencesPage = window.location.pathname.includes('audiences.html');
                if (onAudiencesPage) {
                    const listItem = document.querySelector('.serve-explorer-item[data-id="' + item.id + '"]');
                    if (listItem) {
                        listItem.click();
                        return;
                    }
                }
                window.location.href = 'audiences.html?topic=' + encodeURIComponent(item.id);
                return;
            }

            const parts = item.href.split('#');
            const page = parts[0];
            const anchor = parts[1];
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';

            if (page === currentPage || (page === 'index.html' && currentPage === '')) {
                scrollToAnchor(anchor);
            } else {
                window.location.href = item.href;
            }
            return;
        }

        if (item.anchor) {
            scrollToAnchor(item.anchor);
        }
    }

    function scrollToAnchor(anchor) {
        const el = document.getElementById(anchor);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.remove('highlight-flash');
        void el.offsetWidth;
        el.classList.add('highlight-flash');
        setTimeout(() => el.classList.remove('highlight-flash'), 2000);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderResults(results) {
        const { resultsList, emptyState } = getEls();
        resultsList.innerHTML = '';
        emptyState.hidden = results.length > 0;

        results.forEach((result, index) => {
            const item = result.item;
            const li = document.createElement('li');
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', index === selectedIndex ? 'true' : 'false');

            li.innerHTML =
                '<div class="search-result-title">' + escapeHtml(item.title) + '</div>' +
                '<div class="search-result-meta">' + escapeHtml(item.category) + '</div>' +
                '<div class="search-result-snippet">' + escapeHtml(item.summary) + '</div>';

            li.addEventListener('click', () => navigateTo(item));
            resultsList.appendChild(li);
        });
    }

    function runSearch(query) {
        if (!fuse || !query.trim()) {
            renderResults([]);
            return;
        }

        const results = fuse.search(query).slice(0, 12);
        selectedIndex = 0;
        renderResults(results);
    }

    function selectResult(index) {
        const { resultsList } = getEls();
        const items = resultsList.querySelectorAll('li');
        if (!items.length) return;

        selectedIndex = Math.max(0, Math.min(index, items.length - 1));
        items.forEach((li, i) => {
            li.setAttribute('aria-selected', i === selectedIndex ? 'true' : 'false');
        });
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }

    function confirmSelection() {
        const { input } = getEls();
        const query = input.value;
        if (!fuse || !query.trim()) return;
        const results = fuse.search(query).slice(0, 12);
        if (results[selectedIndex]) {
            navigateTo(results[selectedIndex].item);
        }
    }

    let bound = false;

    function bindSearch() {
        if (bound) return;
        bound = true;

        const { overlay, input, openBtn } = getEls();
        if (!overlay || !openBtn) return;

        openBtn.addEventListener('click', openSearch);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeSearch();
        });

        input.addEventListener('input', () => runSearch(input.value));

        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectResult(selectedIndex + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectResult(selectedIndex - 1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                confirmSelection();
            } else if (e.key === 'Escape') {
                closeSearch();
            }
        });

        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (overlay.hidden) openSearch();
                else closeSearch();
            }
            if (e.key === 'Escape' && !overlay.hidden) closeSearch();
        });
    }

    fetch('data/content.json')
        .then((res) => res.json())
        .then(initFuse)
        .catch((err) => console.error('Failed to load search index:', err));
})();
