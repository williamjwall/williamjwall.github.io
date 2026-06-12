(function () {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function initReveal() {
        const targets = document.querySelectorAll(
            '.section, .page-hero, .serve-hero, .hero-fact, .stat-card, .step, ' +
            '.feature-card, .science-card, .pillar-card, .case-card, .team-card, ' +
            '.serve-highlight, .serve-explorer, .job-card'
        );

        targets.forEach((el) => el.classList.add('reveal'));

        if (reducedMotion) {
            targets.forEach((el) => el.classList.add('revealed'));
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.06, rootMargin: '0px 0px -32px 0px' }
        );

        targets.forEach((el) => observer.observe(el));
    }

    function initStatCounters() {
        const stats = document.querySelectorAll('.stat-value[data-count]');
        if (!stats.length || reducedMotion) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const el = entry.target;
                    const target = parseFloat(el.dataset.count);
                    const suffix = el.dataset.suffix || '';
                    const prefix = el.dataset.prefix || '';
                    const decimals = parseInt(el.dataset.decimals || '0', 10);
                    const duration = 1200;
                    const start = performance.now();

                    function tick(now) {
                        const t = Math.min((now - start) / duration, 1);
                        const eased = 1 - Math.pow(1 - t, 3);
                        const val = target * eased;
                        el.textContent = prefix + val.toFixed(decimals) + suffix;
                        if (t < 1) requestAnimationFrame(tick);
                    }

                    requestAnimationFrame(tick);
                    observer.unobserve(el);
                });
            },
            { threshold: 0.5 }
        );

        stats.forEach((el) => observer.observe(el));
    }

    function init() {
        initReveal();
        initStatCounters();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
