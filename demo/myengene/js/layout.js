(function () {
    const script = document.currentScript;
    const currentPage = script && script.dataset.page;

    const navItems = [
        { href: 'index.html', label: 'Home', id: 'home' },
        { href: 'platform.html', label: 'Platform', id: 'platform' },
        { href: 'audiences.html', label: 'Who We Serve', id: 'audiences' },
        { href: 'about.html', label: 'About', id: 'about' }
    ];

    function navLink(item) {
        const active = item.id === currentPage ? ' active' : '';
        return '<a href="' + item.href + '" class="nav-link' + active + '">' + item.label + '</a>';
    }

    const headerHtml =
        '<div class="header-inner">' +
            '<a href="index.html" class="logo">MyEngene<span class="logo-reg">®</span></a>' +
            '<div class="header-right">' +
                '<nav class="nav-desktop" aria-label="Main navigation">' +
                    navItems.map(navLink).join('') +
                '</nav>' +
                '<div class="header-actions">' +
                    '<button type="button" class="btn-search" id="open-search" aria-label="Search (Ctrl+K)">' +
                        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
                        '<span class="search-label">Search</span>' +
                        '<kbd class="kbd">⌘K</kbd>' +
                    '</button>' +
                    '<button type="button" class="nav-toggle" id="nav-toggle" aria-label="Open menu" aria-expanded="false">' +
                        '<span></span><span></span><span></span>' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<nav class="nav-mobile" id="nav-mobile" aria-label="Mobile navigation" hidden>' +
            navItems.map(navLink).join('') +
        '</nav>';

    const footerHtml =
        '<div class="container">' +
            '<div class="footer-grid">' +
                '<div>' +
                    '<p class="footer-logo">MyEngene<span>®</span></p>' +
                    '<p class="footer-tagline">Right Drug, Right Dose, Right Now!</p>' +
                '</div>' +
                '<div>' +
                    '<p class="footer-heading">Associations</p>' +
                    '<ul class="footer-list">' +
                        '<li>American Society of Pharmacovigilance</li>' +
                        '<li>STRIPE — Standardizing Laboratory Practices in Pharmacogenomics</li>' +
                        '<li>Golden Helix Foundation</li>' +
                    '</ul>' +
                '</div>' +
            '</div>' +
            '<p class="footer-copy">© 2025 MyEngene®. Demo redesign — informational only.</p>' +
        '</div>';

    const searchOverlayHtml =
        '<div class="search-overlay" id="search-overlay" hidden>' +
            '<div class="search-modal" role="dialog" aria-label="Search" aria-modal="true">' +
                '<div class="search-input-wrap">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
                    '<input type="search" id="search-input" placeholder="Search MyEngene…" autocomplete="off" aria-label="Search query">' +
                    '<kbd class="kbd">Esc</kbd>' +
                '</div>' +
                '<ul class="search-results" id="search-results" role="listbox"></ul>' +
                '<p class="search-empty" id="search-empty">Type to search all content…</p>' +
            '</div>' +
        '</div>';

    const headerEl = document.getElementById('site-header');
    const footerEl = document.getElementById('site-footer');
    const searchMount = document.getElementById('search-mount');

    if (headerEl) {
        headerEl.className = 'site-header';
        headerEl.innerHTML = headerHtml;
    }
    if (footerEl) {
        footerEl.className = 'site-footer';
        footerEl.innerHTML = footerHtml;
    }
    if (searchMount) {
        searchMount.innerHTML = searchOverlayHtml;
    }
})();
