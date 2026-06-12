(function () {
    function init() {
        const navToggle = document.getElementById('nav-toggle');
        const navMobile = document.getElementById('nav-mobile');

        if (navToggle && navMobile) {
            function closeMobileNav() {
                navMobile.hidden = true;
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.setAttribute('aria-label', 'Open menu');
            }

            function openMobileNav() {
                navMobile.hidden = false;
                navToggle.setAttribute('aria-expanded', 'true');
                navToggle.setAttribute('aria-label', 'Close menu');
            }

            navToggle.addEventListener('click', () => {
                if (navMobile.hidden) openMobileNav();
                else closeMobileNav();
            });

            navMobile.querySelectorAll('a').forEach((link) => {
                link.addEventListener('click', closeMobileNav);
            });
        }

        const sections = document.querySelectorAll('main section[id]');
        const navLinks = document.querySelectorAll('.nav-desktop a, .nav-mobile a');

        if (sections.length > 1) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;
                        const id = entry.target.id;
                        navLinks.forEach((link) => {
                            const href = link.getAttribute('href') || '';
                            link.classList.toggle('active', href.endsWith('#' + id));
                        });
                    });
                },
                { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
            );
            sections.forEach((section) => observer.observe(section));
        }

        document.querySelectorAll('.faq-item').forEach((item) => {
            item.addEventListener('toggle', () => {
                if (!item.open) return;
                document.querySelectorAll('.faq-item').forEach((other) => {
                    if (other !== item) other.open = false;
                });
            });
        });

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        document.querySelectorAll('.btn-search .kbd').forEach((kbd) => {
            kbd.textContent = isMac ? '⌘K' : 'Ctrl+K';
        });

        const hash = window.location.hash.slice(1);
        if (hash) {
            const el = document.getElementById(hash);
            if (el) {
                setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    el.classList.add('highlight-flash');
                    setTimeout(() => el.classList.remove('highlight-flash'), 2000);
                }, 100);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
