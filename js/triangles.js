// WebGL Triangles Animation with K-Means Clustering
(function() {
    const canvas = document.getElementById('triangles-canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
        console.warn('WebGL not supported, falling back to canvas renderer');
        return;
    }
    
    // Resize canvas to fill window
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Vertex shader program
    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec4 aVertexColor;
        
        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        varying lowp vec4 vColor;
        
        void main(void) {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            vColor = aVertexColor;
        }
    `;
    
    // Fragment shader program
    const fsSource = `
        varying lowp vec4 vColor;
        
        void main(void) {
            gl_FragColor = vColor;
        }
    `;
    
    // Initialize a shader program
    function initShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        
        // Create the shader program
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        
        // If creating the shader program failed, alert
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        
        return shaderProgram;
    }
    
    // Creates a shader of the given type, uploads the source and compiles it
    function loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        
        // Send the source to the shader object
        gl.shaderSource(shader, source);
        
        // Compile the shader program
        gl.compileShader(shader);
        
        // See if it compiled successfully
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    // Initialize shader program
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    
    // Collect all the info needed to use the shader program
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };
    
    // K-means clustering parameters
    const K = 4; // Change back to 4 clusters
    let centroids = [];
    const clusterColors = [
        [0.2, 0.8, 0.4, 0.7],  // Green
        [0.3, 0.5, 0.9, 0.7],  // Blue
        [0.9, 0.4, 0.3, 0.7],  // Red-orange
        [0.8, 0.7, 0.1, 0.7]   // Gold/yellow
    ];
    
    // Initialize K-means centroids
    function initCentroids() {
        centroids = [];
        for (let i = 0; i < K; i++) {
            centroids.push({
                x: (Math.random() * 2 - 1) * 15,
                y: (Math.random() * 2 - 1) * 15
            });
        }
    }
    
    // Calculate Euclidean distance
    function distance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }
    
    // Assign triangles to nearest centroid
    function assignClusters(triangles) {
        triangles.forEach(triangle => {
            let minDist = Infinity;
            let clusterIndex = 0;
            
            for (let i = 0; i < K; i++) {
                const dist = distance(
                    { x: triangle.position[0], y: triangle.position[1] },
                    centroids[i]
                );
                
                if (dist < minDist) {
                    minDist = dist;
                    clusterIndex = i;
                }
            }
            
            triangle.cluster = clusterIndex;
            triangle.baseColor = clusterColors[clusterIndex];
        });
    }
    
    // Update centroids based on assigned triangles with a stronger adjustment
    function updateCentroids(triangles) {
        const clusterSums = Array(K).fill().map(() => ({ x: 0, y: 0, count: 0 }));
        
        triangles.forEach(triangle => {
            const cluster = triangle.cluster;
            clusterSums[cluster].x += triangle.position[0];
            clusterSums[cluster].y += triangle.position[1];
            clusterSums[cluster].count++;
        });
        
        // Calculate new centroid positions with much bigger jumps
        for (let i = 0; i < K; i++) {
            if (clusterSums[i].count > 0) {
                const avgX = clusterSums[i].x / clusterSums[i].count;
                const avgY = clusterSums[i].y / clusterSums[i].count;
                
                // Use a much stronger cheat factor for faster convergence
                const cheatFactor = 0.8; // 80% of the way to target for very quick convergence
                centroids[i].x = centroids[i].x * (1 - cheatFactor) + avgX * cheatFactor;
                centroids[i].y = centroids[i].y * (1 - cheatFactor) + avgY * cheatFactor;
            }
        }
        
        // Handle empty clusters by repositioning them
        for (let i = 0; i < K; i++) {
            if (clusterSums[i].count === 0) {
                // Find the most populated cluster
                let maxCount = 0;
                let maxCluster = 0;
                for (let j = 0; j < K; j++) {
                    if (clusterSums[j].count > maxCount) {
                        maxCount = clusterSums[j].count;
                        maxCluster = j;
                    }
                }
                
                // Split the most populated cluster with a bigger jump
                if (maxCount > 0) {
                    centroids[i].x = centroids[maxCluster].x + (Math.random() * 2 - 1) * 10; // Even bigger random offset
                    centroids[i].y = centroids[maxCluster].y + (Math.random() * 2 - 1) * 10;
                }
            }
        }
    }
    
    // Create triangles with mathematical patterns
    function initBuffers(gl) {
        const numTriangles = 120;
        const triangles = [];
        
        // Create triangles in a Fibonacci spiral pattern
        for (let i = 0; i < numTriangles; i++) {
            // Fibonacci spiral parameters
            const goldenRatio = 1.618033988749895;
            const angle = i * goldenRatio * Math.PI * 2;
            const radius = Math.sqrt(i) * 0.7;
            
            // Position based on spiral - wider distribution
            const x = Math.cos(angle) * radius * 1.5;
            const y = Math.sin(angle) * radius * 1.5;
            const z = -15 - (i * 0.05);
            
            // Size decreases as we move outward
            const size = 0.9 - (i / numTriangles) * 0.6;
            
            // Initial neutral color (will be updated by k-means)
            const alpha = 0.5; // Transparency
            
            // Velocity includes a circular component and a random component
            const vx = Math.cos(angle + Math.PI/2) * 0.05 + (Math.random() - 0.5) * 0.04;
            const vy = Math.sin(angle + Math.PI/2) * 0.05 + (Math.random() - 0.5) * 0.04;
            const vz = (Math.random() - 0.5) * 0.02;
            
            // Rotation speed
            const rotationSpeed = (Math.random() - 0.5) * 0.8;
            
            triangles.push({
                position: [x, y, z],
                velocity: [vx, vy, vz],
                size: size,
                color: [0.5, 0.5, 0.5, alpha], // Initial neutral color
                baseColor: [0.5, 0.5, 0.5, alpha], // Will be updated by k-means
                angle: Math.random() * Math.PI * 2,
                rotationSpeed: rotationSpeed,
                originalAngle: angle,
                originalRadius: radius,
                cluster: 0 // Initial cluster assignment
            });
        }
        
        return triangles;
    }
    
    // Function to draw a biologically inspired centroid marker
    function drawCentroid(gl, programInfo, projectionMatrix, centroid, color) {
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, modelViewMatrix, [centroid.x, centroid.y, -12]);
        
        // Parameters for the cell-like appearance
        const outerSize = 0.7; // Membrane size
        const innerSize = 0.3; // Nucleus size
        const segments = 32; // More segments for a smoother circle
        const vertices = [];
        const colors = [];
        
        // Draw the outer membrane
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * outerSize;
            const y = Math.sin(angle) * outerSize;
            
            vertices.push(x, y, 0);
            colors.push(color[0], color[1], color[2], 0.4); // More transparent for membrane
        }
        
        // Draw the nucleus
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * innerSize;
            const y = Math.sin(angle) * innerSize;
            
            vertices.push(x, y, 0);
            colors.push(color[0], color[1], color[2], 0.8); // Less transparent for nucleus
        }
        
        // Create position buffer
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            3,
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        
        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            4,
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
        
        gl.useProgram(programInfo.program);
        
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix
        );
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix
        );
        
        // Draw the outer membrane
        gl.drawArrays(gl.LINE_LOOP, 0, segments + 1);
        
        // Draw the nucleus
        gl.drawArrays(gl.TRIANGLE_FAN, segments + 1, segments + 1);
    }
    
    // Draw the scene
    function drawScene(gl, programInfo, triangles, deltaTime, elapsedTime) {
        gl.clearColor(0.04, 0.09, 0.18, 1.0); // Dark navy blue
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Clear the canvas
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // Create perspective matrix
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = mat4.create();
        
        mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
        
        // Mouse influence
        const mouseInfluence = {
            x: (mouseX / window.innerWidth) * 30 - 15,
            y: (mouseY / window.innerHeight) * 30 - 15,
            strength: 0.7
        };
        
        // Run k-means clustering every 5 frames (12 times per second at 60 FPS)
        // This gives much more frequent updates for better tracking
        if (Math.floor(elapsedTime * 60) % 5 === 0) {
            assignClusters(triangles);
            updateCentroids(triangles);
        }
        
        triangles.forEach((triangle, index) => {
            // Update position with a combination of velocity and mathematical pattern
            const oscillationFreq = 0.3;
            const oscillationAmp = 0.5;
            
            // Wave pattern
            const waveX = Math.sin(elapsedTime * oscillationFreq + triangle.originalAngle) * oscillationAmp;
            const waveY = Math.cos(elapsedTime * oscillationFreq + triangle.originalAngle) * oscillationAmp;
            
            // Update position with velocity and wave pattern
            triangle.position[0] += triangle.velocity[0] * deltaTime + waveX * deltaTime;
            triangle.position[1] += triangle.velocity[1] * deltaTime + waveY * deltaTime;
            triangle.position[2] += triangle.velocity[2] * deltaTime;
            
            // Mouse attraction/repulsion
            const dx = mouseInfluence.x - triangle.position[0];
            const dy = mouseInfluence.y - triangle.position[1];
            const distSq = dx*dx + dy*dy;
            if (distSq > 0.1) {
                const dist = Math.sqrt(distSq);
                const force = mouseInfluence.strength / (dist * dist);
                triangle.velocity[0] += (dx / dist) * force * deltaTime;
                triangle.velocity[1] += (dy / dist) * force * deltaTime;
            }
            
            // Apply some drag to prevent excessive speed
            triangle.velocity[0] *= 0.99;
            triangle.velocity[1] *= 0.99;
            triangle.velocity[2] *= 0.99;
            
            // Bounce off edges with some elasticity
            const bounds = 25;
            for (let i = 0; i < 2; i++) {
                if (triangle.position[i] > bounds || triangle.position[i] < -bounds) {
                    triangle.velocity[i] *= -0.8;
                    triangle.position[i] = Math.max(-bounds, Math.min(bounds, triangle.position[i]));
                }
            }
            
            // Z-axis bounds
            if (triangle.position[2] > -5 || triangle.position[2] < -30) {
                triangle.velocity[2] *= -0.8;
                triangle.position[2] = Math.max(-30, Math.min(-5, triangle.position[2]));
            }
            
            // Update rotation
            triangle.angle += triangle.rotationSpeed * deltaTime;
            
            // Set drawing position to the "identity" point
            const modelViewMatrix = mat4.create();
            
            // Move the drawing position
            mat4.translate(modelViewMatrix, modelViewMatrix, triangle.position);
            
            // Rotate the triangle
            mat4.rotateZ(modelViewMatrix, modelViewMatrix, triangle.angle);
            
            // Tell WebGL how to pull out the positions from the position buffer
            const positions = [
                0, triangle.size, 0,
                -triangle.size, -triangle.size, 0,
                triangle.size, -triangle.size, 0
            ];
            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
            
            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
            
            // Pulse the color based on time
            const pulseFreq = 0.2;
            const pulseAmp = 0.15;
            const pulse = Math.sin(elapsedTime * pulseFreq + index * 0.1) * pulseAmp + 1.0;
            
            // Use the cluster-assigned color
            const baseColor = triangle.baseColor;
            const colors = [
                baseColor[0] * pulse, baseColor[1] * pulse, baseColor[2] * pulse, baseColor[3],
                baseColor[0] * pulse, baseColor[1] * pulse, baseColor[2] * pulse, baseColor[3],
                baseColor[0] * pulse, baseColor[1] * pulse, baseColor[2] * pulse, baseColor[3]
            ];
            
            const colorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
            
            const numComponentsColor = 4;
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexColor,
                numComponentsColor,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
            
            // Tell WebGL to use our program when drawing
            gl.useProgram(programInfo.program);
            
            // Set the shader uniforms
            gl.uniformMatrix4fv(
                programInfo.uniformLocations.projectionMatrix,
                false,
                projectionMatrix);
            gl.uniformMatrix4fv(
                programInfo.uniformLocations.modelViewMatrix,
                false,
                modelViewMatrix);
            
            // Draw the triangles
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        });
        
        // Draw the centroids
        for (let i = 0; i < K; i++) {
            drawCentroid(gl, programInfo, projectionMatrix, centroids[i], clusterColors[i]);
        }
        
        // Draw text overlay explaining the algorithm
        const textCanvas = document.getElementById('text-overlay');
        if (textCanvas) {
            const ctx = textCanvas.getContext('2d');
            ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
            
            // Position in bottom right for less intrusion
            const rightEdge = textCanvas.width - 20;
            const bottomEdge = textCanvas.height - 20;
            
            ctx.font = '14px Arial';
            ctx.textAlign = 'right';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText('K-Means Clustering Visualization', rightEdge, bottomEdge - 30);
            
            ctx.font = '12px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillText('Move cursor to interact', rightEdge, bottomEdge - 10);
        }
    }
    
    // Track mouse position for interactive effects
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    
    document.addEventListener('mousemove', (event) => {
        mouseX = event.clientX;
        mouseY = event.clientY;
        
        // Force a cluster update on significant mouse movement
        const dx = mouseX - lastMouseX;
        const dy = mouseY - lastMouseY;
        if (Math.sqrt(dx*dx + dy*dy) > 50) {
            assignClusters(triangles);
            updateCentroids(triangles);
            lastMouseX = mouseX;
            lastMouseY = mouseY;
        }
    });
    
    // Animation variables
    let then = 0;
    let startTime = Date.now() * 0.001;
    
    // Initialize triangles and centroids
    initCentroids();
    const triangles = initBuffers(gl);
    assignClusters(triangles); // Initial cluster assignment
    
    // Create text overlay canvas if it doesn't exist
    if (!document.getElementById('text-overlay')) {
        const textCanvas = document.createElement('canvas');
        textCanvas.id = 'text-overlay';
        textCanvas.width = window.innerWidth;
        textCanvas.height = window.innerHeight;
        textCanvas.style.position = 'absolute';
        textCanvas.style.top = '0';
        textCanvas.style.left = '0';
        textCanvas.style.pointerEvents = 'none';
        document.body.appendChild(textCanvas);
        
        window.addEventListener('resize', () => {
            textCanvas.width = window.innerWidth;
            textCanvas.height = window.innerHeight;
        });
    }
    
    // Initialize mouse tracking variables
    let lastMouseX = window.innerWidth / 2;
    let lastMouseY = window.innerHeight / 2;
    
    // Draw the scene repeatedly
    function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        const elapsedTime = now - startTime;
        then = now;
        
        drawScene(gl, programInfo, triangles, deltaTime, elapsedTime);
        
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
})(); 