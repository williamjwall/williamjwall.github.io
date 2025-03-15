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
                cluster: 0, // Initial cluster assignment
                initialPosition: [x, y, z]
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
        
        // Run k-means clustering every 5 frames (12 times per second at 60 FPS)
        // This gives much more frequent updates for better tracking
        if (Math.floor(elapsedTime * 60) % 5 === 0) {
            assignClusters(triangles);
            updateCentroids(triangles);
        }
        
        // Check if one minute has passed to apply gravity reset - more gentle approach
        const minuteInterval = 60; // seconds
        const resetDuration = 5; // longer duration for gentler effect
        const timeInCurrentMinute = elapsedTime % minuteInterval;
        
        // Create a gentle pulse that peaks at 2.5 seconds
        let resetIntensity = 0;
        if (timeInCurrentMinute < resetDuration) {
            // Create a bell curve for intensity (peaks in the middle)
            const normalizedTime = timeInCurrentMinute / resetDuration;
            resetIntensity = Math.sin(normalizedTime * Math.PI) * 0.5; // Max 0.5 intensity
        }
        
        triangles.forEach((triangle, index) => {
            // Create subtle, coordinated motion while preserving shape
            const uniqueOffset = index * 0.17; // Prime-number-based offset for variety
            
            // Gentler flow parameters
            const noiseScale = 0.8; // Much smaller scale for subtle movement
            const uniqueFactor1 = (index % 5) * 0.2 + 0.8;
            const uniqueFactor2 = (index % 7) * 0.15 + 0.9;
            
            // Calculate phase-based motion - creates wave-like effects through the spiral
            const phase = triangle.originalAngle + (elapsedTime * 0.1);
            
            // Create gentle breathing effect based on distance from center
            const breathingAmount = 0.3 * Math.sin(elapsedTime * 0.4 + triangle.originalRadius * 0.5);
            const breathingX = Math.cos(triangle.originalAngle) * breathingAmount;
            const breathingY = Math.sin(triangle.originalAngle) * breathingAmount;
            
            // Create a subtle orbiting micro-motion that preserves shape
            const microOrbit = 0.15 * Math.sin(elapsedTime * 0.6 + uniqueOffset);
            const microOrbitX = Math.cos(triangle.originalAngle + Math.PI/2) * microOrbit;
            const microOrbitY = Math.sin(triangle.originalAngle + Math.PI/2) * microOrbit;
            
            // Combine breathing and micro-orbiting for gentle, interesting motion
            const flowX = breathingX + microOrbitX;
            const flowY = breathingY + microOrbitY;
            
            // Very minimal randomness - just enough to avoid perfect uniformity
            const randomX = (Math.random() - 0.5) * 0.05 * deltaTime;
            const randomY = (Math.random() - 0.5) * 0.05 * deltaTime;
            
            // Apply gentle flow
            triangle.velocity[0] += flowX * deltaTime * 0.6 + randomX;
            triangle.velocity[1] += flowY * deltaTime * 0.6 + randomY;
            
            // Calculate distance from original position
            const originalX = triangle.initialPosition[0];
            const originalY = triangle.initialPosition[1];
            const dx = originalX - triangle.position[0];
            const dy = originalY - triangle.position[1];
            const distFromOrigin = Math.sqrt(dx*dx + dy*dy);
            
            // Strong pull toward initial position when too far, gentle otherwise
            const baseAttractionFactor = 0.1; // Default attraction
            const maxDistBeforeStrongPull = 1.0;
            
            // Calculate attraction strength based on distance
            let attractionFactor;
            if (distFromOrigin > maxDistBeforeStrongPull) {
                // Strong exponential pull when too far
                attractionFactor = baseAttractionFactor + (distFromOrigin - maxDistBeforeStrongPull) * 0.1;
            } else {
                // Gentle pull when close to original position
                attractionFactor = baseAttractionFactor * (distFromOrigin / maxDistBeforeStrongPull);
            }
            
            // Apply position-maintaining force
            triangle.velocity[0] += dx * deltaTime * attractionFactor;
            triangle.velocity[1] += dy * deltaTime * attractionFactor;
            
            // Subtle Z-axis pulsing based on radius to create depth variation
            const zPulse = Math.sin(elapsedTime * 0.3 + triangle.originalRadius * 0.8) * 0.15; 
            triangle.velocity[2] += zPulse * deltaTime;
            
            // Apply velocity
            triangle.position[0] += triangle.velocity[0] * deltaTime;
            triangle.position[1] += triangle.velocity[1] * deltaTime;
            triangle.position[2] += triangle.velocity[2] * deltaTime;
            
            // Strong damping to prevent runaway motion
            const fluidDamping = 0.92;
            triangle.velocity[0] *= fluidDamping;
            triangle.velocity[1] *= fluidDamping;
            triangle.velocity[2] *= fluidDamping;
            
            // Very strong Z position maintenance
            const zTarget = triangle.initialPosition[2];
            const zDiff = zTarget - triangle.position[2];
            triangle.velocity[2] += zDiff * deltaTime * 0.15;
            
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