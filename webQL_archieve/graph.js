(function() {
    const canvas = document.getElementById('graph-canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas to cover the entire window
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    // Call resize on load and when window is resized
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    const nodes = [];
    const edges = [];
    const numNodes = 80;
    const maxDistance = 200;
    
    function init() {
        nodes.length = 0;
        edges.length = 0;
        
        for (let i = 0; i < numNodes; i++) {
            nodes.push(createNode());
        }
    }
    
    function createNode() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: 2 + Math.random() * 4,
            color: `rgba(245, 213, 71, ${Math.random() * 0.5 + 0.5})`
        };
    }
    
    function update() {
        nodes.forEach(node => {
            // Update position
            node.x += node.vx;
            node.y += node.vy;
            
            // Bounce off edges
            if (node.x < node.radius || node.x > canvas.width - node.radius) node.vx *= -1;
            if (node.y < node.radius || node.y > canvas.height - node.radius) node.vy *= -1;
            
            // Add slight friction to prevent excessive speed
            node.vx *= 0.995;
            node.vy *= 0.995;
        });
        
        // Clear temporary edges and recalculate
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
        
        // Draw proximity edges
        edges.forEach(edge => {
            const opacity = 0.3 * (1 - edge.dist / maxDistance);
            ctx.strokeStyle = `rgba(245, 213, 71, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(edge.from.x, edge.from.y);
            ctx.lineTo(edge.to.x, edge.to.y);
            ctx.stroke();
        });
        
        // Draw nodes
        nodes.forEach(node => {
            ctx.fillStyle = node.color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Add a subtle border to nodes
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        });
    }
    
    function animate() {
        update();
        draw();
        requestAnimationFrame(animate);
    }
    
    // Initialize and start animation
    init();
    animate();
    
    // Reinitialize when window is resized
    window.addEventListener('resize', () => {
        resizeCanvas();
        init();
    });

    // Update any text rendering functions to use white
    function renderGraphLabels(ctx, graph) {
        ctx.fillStyle = 'white'; // Changed to white
        ctx.font = '12px Arial';
        
        // Rest of the function
        // ...
    }

    // Update any other text rendering in this file
    function renderGraphInfo(ctx, data) {
        ctx.fillStyle = 'white'; // Changed to white
        ctx.font = '14px Arial';
        // ...
    }
})(); 