(function () {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function initAmbientCanvas() {
        if (reducedMotion) return;

        const canvas = document.createElement('canvas');
        canvas.className = 'ambient-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.prepend(canvas);

        const ctx = canvas.getContext('2d');
        const nodes = [];
        const nodeCount = 48;
        const connectDist = 140;
        let w = 0;
        let h = 0;
        let mouse = { x: -1000, y: -1000 };

        function resize() {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        }

        function seedNodes() {
            nodes.length = 0;
            for (let i = 0; i < nodeCount; i++) {
                nodes.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.35,
                    vy: (Math.random() - 0.5) * 0.35,
                    r: 1.2 + Math.random() * 1.8
                });
            }
        }

        function draw() {
            ctx.clearRect(0, 0, w, h);

            nodes.forEach((n) => {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > w) n.vx *= -1;
                if (n.y < 0 || n.y > h) n.vy *= -1;

                const dx = mouse.x - n.x;
                const dy = mouse.y - n.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 180) {
                    n.x -= dx * 0.0008;
                    n.y -= dy * 0.0008;
                }
            });

            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < connectDist) {
                        const alpha = (1 - d / connectDist) * 0.18;
                        ctx.strokeStyle = 'rgba(13, 148, 136, ' + alpha + ')';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }

            nodes.forEach((n) => {
                ctx.fillStyle = 'rgba(13, 148, 136, 0.35)';
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fill();
            });

            requestAnimationFrame(draw);
        }

        resize();
        seedNodes();
        draw();

        window.addEventListener('resize', () => {
            resize();
            seedNodes();
        });

        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        }, { passive: true });
    }

    function initReveal() {
        const targets = document.querySelectorAll(
            '.section, .page-hero, .stat-card, .feature-card, .science-card, ' +
            '.pillar-card, .case-card, .team-card, .resource-card, ' +
            '.serve-explorer, .job-card'
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
            { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
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
        initAmbientCanvas();
        initReveal();
        initStatCounters();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
