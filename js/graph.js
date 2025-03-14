(function() {
    const canvas = document.getElementById('graph-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.5;

    const nodes = [];
    const edges = [];
    const numNodes = 50;
    const maxDistance = 150;

    function init() {
        for (let i = 0; i < numNodes; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5
            });
        }
    }

    function update() {
        nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;

            if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
        });

        edges.length = 0;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDistance) {
                    edges.push({ from: nodes[i], to: nodes[j], dist });
                }
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#64ffda';
        nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.strokeStyle = 'rgba(100, 255, 218, 0.2)';
        edges.forEach(edge => {
            ctx.beginPath();
            ctx.moveTo(edge.from.x, edge.from.y);
            ctx.lineTo(edge.to.x, edge.to.y);
            ctx.stroke();
        });
    }

    function animate() {
        update();
        draw();
        requestAnimationFrame(animate);
    }

    init();
    animate();
})(); 