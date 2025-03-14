// WebGL Triangles Animation
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
    
    // Create triangles with movement
    function initBuffers(gl) {
        const numTriangles = 50;
        const triangles = [];
        
        for (let i = 0; i < numTriangles; i++) {
            const size = Math.random() * 0.5 + 0.5;
            const position = [
                Math.random() * 20 - 10,
                Math.random() * 20 - 10,
                Math.random() * -15 - 5
            ];
            const velocity = [
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                0
            ];
            const color = [
                Math.random() * 0.3 + 0.2,
                Math.random() * 0.3 + 0.2,
                Math.random() * 0.8 + 0.2,
                0.7
            ];
            
            triangles.push({ position, velocity, size, color });
        }
        
        return triangles;
    }
    
    // Draw the scene
    function drawScene(gl, programInfo, triangles, deltaTime) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
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
        
        triangles.forEach(triangle => {
            // Update position
            for (let i = 0; i < 3; i++) {
                triangle.position[i] += triangle.velocity[i] * deltaTime;
                
                // Bounce off edges
                if (triangle.position[i] > 10 || triangle.position[i] < -10) {
                    triangle.velocity[i] *= -1;
                }
            }
            
            // Set drawing position to the "identity" point
            const modelViewMatrix = mat4.create();
            
            // Move the drawing position
            mat4.translate(modelViewMatrix, modelViewMatrix, triangle.position);
            
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
            
            // Tell WebGL how to pull out the colors from the color buffer
            const colors = [
                ...triangle.color,
                ...triangle.color,
                ...triangle.color
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
    }
    
    // Animation variables
    let then = 0;
    
    // Initialize triangles
    const triangles = initBuffers(gl);
    
    // Draw the scene repeatedly
    function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;
        
        drawScene(gl, programInfo, triangles, deltaTime);
        
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
})(); 