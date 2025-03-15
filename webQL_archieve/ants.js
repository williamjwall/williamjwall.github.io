(function() {
    // Initialize Three.js
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Pure black background
    
    const canvas = document.getElementById('ant-canvas');
    if (!canvas) return; // Exit gracefully if canvas doesn't exist
    
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    
    // Set initial size to match the window
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 100; // Move the camera further back to fit the whole scene
    
    // Create a grid for pheromones - now with separate channels for different colonies
    const gridSize = 100;
    const cellSize = 1;
    const numColonies = 2; // Reduced to 2 competing colonies
    
    // Initialize pheromone grids for each colony
    const pheromoneGrids = [];
    for (let i = 0; i < numColonies; i++) {
        pheromoneGrids.push(new Array(gridSize).fill(0).map(() => new Array(gridSize).fill(0)));
    }
    
    // Create a visual representation of the pheromone grid
    const pheromoneGeometry = new THREE.PlaneGeometry(gridSize * cellSize, gridSize * cellSize);
    
    // Remove the ground texture loader and ground mesh
    const pheromoneTexture = new THREE.DataTexture(
        new Uint8Array(gridSize * gridSize * 3),
        gridSize,
        gridSize,
        THREE.RGBFormat
    );
    pheromoneTexture.needsUpdate = true;
    
    // Modify pheromone material for better visibility
    const pheromoneMaterial = new THREE.MeshBasicMaterial({
        map: pheromoneTexture,
        transparent: true,
        opacity: 0.6, // Increased from 0.4 to 0.6
        blending: THREE.AdditiveBlending
    });
    
    const pheromonePlane = new THREE.Mesh(pheromoneGeometry, pheromoneMaterial);
    pheromonePlane.position.set(0, 0, -5);
    scene.add(pheromonePlane);
    
    // Food class
    class Food {
        constructor(x, y, amount) {
            this.position = new THREE.Vector3(x, y, 0);
            this.amount = amount;
            this.initialAmount = amount;
            
            // Create more natural food appearance
            const scale = 0.5 + (amount / 100) * 1.5;
            // Use more detailed geometry for food
            const geometry = new THREE.DodecahedronGeometry(scale, 0);
            // Dark green color for food
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x006400, 
                roughness: 0.8,
                metalness: 0.1,
                emissive: 0x003300,
                emissiveIntensity: 0.3
            });
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.copy(this.position);
            // Add random rotation for natural look
            this.mesh.rotation.set(
                Math.random() * Math.PI, 
                Math.random() * Math.PI, 
                Math.random() * Math.PI
            );
            scene.add(this.mesh);
        }
        
        takeFood(amount) {
            const taken = Math.min(this.amount, amount);
            this.amount -= taken;
            
            // Update visual size
            if (this.amount > 0) {
                const scale = 0.5 + (this.amount / this.initialAmount) * 1.5;
                this.mesh.scale.set(scale, scale, scale);
            } else {
                scene.remove(this.mesh);
                return -1; // Signal that food is depleted
            }
            
            return taken;
        }
    }
    
    // Colony class
    class Colony {
        constructor(id, x, y, color) {
            this.id = id;
            this.position = new THREE.Vector3(x, y, 0);
            this.color = color;
            this.ants = [];
            this.foodCollected = 0;
            this.pheromoneStrength = 5 + Math.random() * 5;
            
            // Create more natural nest appearance
            const nestGeometry = new THREE.Group();
            
            // Main mound
            const moundGeometry = new THREE.SphereGeometry(2, 16, 16);
            const moundMaterial = new THREE.MeshStandardMaterial({ 
                color: this.color,
                roughness: 0.9,
                metalness: 0.1
            });
            const mound = new THREE.Mesh(moundGeometry, moundMaterial);
            nestGeometry.add(mound);
            
            // Add entrance hole
            const entranceGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 16);
            const entranceMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
            const entrance = new THREE.Mesh(entranceGeometry, entranceMaterial);
            entrance.position.set(0, 0, 1.5);
            entrance.rotation.x = Math.PI / 2;
            nestGeometry.add(entrance);
            
            // Add small dirt piles around the nest
            for (let i = 0; i < 5; i++) {
                const pileGeometry = new THREE.SphereGeometry(0.5 + Math.random() * 0.5, 8, 8);
                const pileMaterial = new THREE.MeshStandardMaterial({ 
                    color: new THREE.Color(this.color).lerp(new THREE.Color(0x3a2a0a), 0.5),
                    roughness: 1.0,
                    metalness: 0.0
                });
                const pile = new THREE.Mesh(pileGeometry, pileMaterial);
                const angle = Math.random() * Math.PI * 2;
                const distance = 2 + Math.random() * 1.5;
                pile.position.set(
                    Math.cos(angle) * distance,
                    Math.sin(angle) * distance,
                    -0.5 - Math.random() * 0.5
                );
                pile.scale.z = 0.5;
                nestGeometry.add(pile);
            }
            
            this.mesh = nestGeometry;
            this.mesh.position.copy(this.position);
            scene.add(this.mesh);
        }
        
        createAnts(count) {
            for (let i = 0; i < count; i++) {
                this.ants.push(new Ant(this));
            }
        }
        
        depositFood(amount) {
            this.foodCollected += amount;
            
            // Update nest size based on food collected with natural logarithmic growth
            const scale = 1 + Math.log10(1 + this.foodCollected / 500);
            this.mesh.scale.set(scale, scale, scale);
            
            // Track food collection rate for colony health
            if (!this.foodHistory) this.foodHistory = [];
            this.foodHistory.push({amount, time: Date.now()});
            
            // Only keep last 5 minutes of history
            const fiveMinutesAgo = Date.now() - 300000;
            this.foodHistory = this.foodHistory.filter(entry => entry.time > fiveMinutesAgo);
        }
        
        // Calculate colony health based on food collection rate
        getColonyHealth() {
            if (!this.foodHistory || this.foodHistory.length === 0) return 50;
            
            // Calculate food collected in last minute
            const oneMinuteAgo = Date.now() - 60000;
            const recentFood = this.foodHistory
                .filter(entry => entry.time > oneMinuteAgo)
                .reduce((sum, entry) => sum + entry.amount, 0);
                
            // Health is based on food collection rate and colony size
            return Math.min(100, Math.max(10, recentFood / (this.ants.length * 0.1)));
        }
    }
    
    // Ant class
    class Ant {
        constructor(colony) {
            this.colony = colony;
            
            // Position in world space - start at colony position
            this.position = new THREE.Vector3(
                colony.position.x + (Math.random() - 0.5) * 2,
                colony.position.y + (Math.random() - 0.5) * 2,
                0
            );
            
            // Direction and movement
            this.direction = Math.random() * Math.PI * 2;
            this.speed = 0.2 + Math.random() * 0.2;
            this.turnRate = 0.1 + Math.random() * 0.3;
            
            // Pheromone parameters
            this.pheromoneStrength = colony.pheromoneStrength;
            this.pheromoneDecayRate = 0.995;
            this.sensorAngle = Math.PI / 4;
            this.sensorDistance = 2;
            
            // Create more detailed ant mesh
            const antGroup = new THREE.Group();
            
            // Body segments
            const headGeometry = new THREE.SphereGeometry(0.15, 8, 8);
            const thoraxGeometry = new THREE.SphereGeometry(0.2, 8, 8);
            const abdomenGeometry = new THREE.SphereGeometry(0.25, 8, 8);
            
            // Slightly vary the ant color for natural look
            const colorVariation = Math.random() * 0.2 - 0.1;
            const baseColor = new THREE.Color(colony.color);
            const antColor = new THREE.Color(
                Math.max(0, Math.min(1, baseColor.r + colorVariation)),
                Math.max(0, Math.min(1, baseColor.g + colorVariation)),
                Math.max(0, Math.min(1, baseColor.b + colorVariation))
            );
            
            const antMaterial = new THREE.MeshStandardMaterial({
                color: antColor,
                roughness: 0.8,
                metalness: 0.2
            });
            
            const head = new THREE.Mesh(headGeometry, antMaterial);
            head.position.set(0.35, 0, 0);
            
            const thorax = new THREE.Mesh(thoraxGeometry, antMaterial);
            thorax.position.set(0, 0, 0);
            
            const abdomen = new THREE.Mesh(abdomenGeometry, antMaterial);
            abdomen.position.set(-0.4, 0, 0);
            
            antGroup.add(head);
            antGroup.add(thorax);
            antGroup.add(abdomen);
            
            // Add antennae
            const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.01, 0.3, 4);
            const antenna1 = new THREE.Mesh(antennaGeometry, antMaterial);
            antenna1.position.set(0.45, 0.1, 0);
            antenna1.rotation.z = Math.PI / 4;
            
            const antenna2 = new THREE.Mesh(antennaGeometry, antMaterial);
            antenna2.position.set(0.45, -0.1, 0);
            antenna2.rotation.z = -Math.PI / 4;
            
            antGroup.add(antenna1);
            antGroup.add(antenna2);
            
            // Add legs
            for (let i = 0; i < 3; i++) {
                const legGeometry = new THREE.CylinderGeometry(0.02, 0.01, 0.4, 4);
                
                const legLeft = new THREE.Mesh(legGeometry, antMaterial);
                legLeft.position.set(-0.1 + i * 0.2, 0.25, 0);
                legLeft.rotation.z = -Math.PI / 3;
                
                const legRight = new THREE.Mesh(legGeometry, antMaterial);
                legRight.position.set(-0.1 + i * 0.2, -0.25, 0);
                legRight.rotation.z = Math.PI / 3;
                
                antGroup.add(legLeft);
                antGroup.add(legRight);
            }
            
            antGroup.scale.set(0.7, 0.7, 0.7);
            antGroup.rotation.x = Math.PI / 2;
            
            this.mesh = antGroup;
            scene.add(this.mesh);
            
            // State
            this.hasFood = false;
            this.foodAmount = 0;
            this.age = 0;
            this.health = 100;
            this.state = 'exploring';
            this.target = null;
            
            // Add subtle animation properties
            this.legAnimationPhase = Math.random() * Math.PI * 2;
            this.legAnimationSpeed = 0.2 + Math.random() * 0.1;
            
            // Add a subtle glow to the ants
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: colony.color,
                transparent: true,
                opacity: 0.3,
                blending: THREE.AdditiveBlending
            });
            const glowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), glowMaterial);
            antGroup.add(glowSphere);
            
            // Add subtle pulsing animation properties
            this.pulsePhase = Math.random() * Math.PI * 2;
            this.pulseSpeed = 0.05 + Math.random() * 0.03;
            
            // Add more natural behavior parameters
            this.hunger = 0; // Hunger level affects decisions
            this.restThreshold = 80 + Math.random() * 20; // When to rest
            this.explorationDrive = 0.2 + Math.random() * 0.6; // Individual exploration tendency
            this.memory = []; // Simple spatial memory
            this.lastFoodFound = 0; // Track when food was last found
            this.role = Math.random() < 0.8 ? 'forager' : 'scout'; // Different ant roles
        }
        
        update(foods, colonies) {
            this.age++;
            
            // Health regeneration
            this.health = Math.min(100, this.health + 0.01);
            this.health = Math.max(1, this.health);
            
            // Increase hunger over time
            this.hunger += 0.05;
            
            // Adjust state based on hunger
            if (this.hunger > 90 && this.state !== 'returningWithFood' && !this.hasFood) {
                this.state = 'returningToNest';
                this.target = this.colony.position.clone();
            }
            
            // Convert world position to grid position
            const gridX = Math.floor((this.position.x + gridSize * cellSize / 2) / cellSize);
            const gridY = Math.floor((this.position.y + gridSize * cellSize / 2) / cellSize);
            
            // Check if in bounds
            if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
                // Deposit pheromone based on state and role
                if (this.state === 'exploring') {
                    // Scouts leave stronger exploration pheromones
                    const strength = this.role === 'scout' ? 
                        this.pheromoneStrength * 0.2 : 
                        this.pheromoneStrength * 0.1;
                        
                    pheromoneGrids[this.colony.id][gridY][gridX] = 
                        Math.min(100, pheromoneGrids[this.colony.id][gridY][gridX] + strength);
                } else if (this.state === 'returningWithFood') {
                    // Food pheromone strength varies with food amount
                    const foodStrength = this.foodAmount / 10;
                    pheromoneGrids[this.colony.id][gridY][gridX] = 
                        Math.min(255, pheromoneGrids[this.colony.id][gridY][gridX] + this.pheromoneStrength + foodStrength);
                }
                
                // Sense pheromones from own colony
                const leftSensorX = Math.floor((this.position.x + Math.cos(this.direction - this.sensorAngle) * this.sensorDistance + gridSize * cellSize / 2) / cellSize);
                const leftSensorY = Math.floor((this.position.y + Math.sin(this.direction - this.sensorAngle) * this.sensorDistance + gridSize * cellSize / 2) / cellSize);
                
                const centerSensorX = Math.floor((this.position.x + Math.cos(this.direction) * this.sensorDistance + gridSize * cellSize / 2) / cellSize);
                const centerSensorY = Math.floor((this.position.y + Math.sin(this.direction) * this.sensorDistance + gridSize * cellSize / 2) / cellSize);
                
                const rightSensorX = Math.floor((this.position.x + Math.cos(this.direction + this.sensorAngle) * this.sensorDistance + gridSize * cellSize / 2) / cellSize);
                const rightSensorY = Math.floor((this.position.y + Math.sin(this.direction + this.sensorAngle) * this.sensorDistance + gridSize * cellSize / 2) / cellSize);
                
                let leftPheromone = 0;
                let centerPheromone = 0;
                let rightPheromone = 0;
                
                if (leftSensorX >= 0 && leftSensorX < gridSize && leftSensorY >= 0 && leftSensorY < gridSize) {
                    leftPheromone = pheromoneGrids[this.colony.id][leftSensorY][leftSensorX];
                }
                
                if (centerSensorX >= 0 && centerSensorX < gridSize && centerSensorY >= 0 && centerSensorY < gridSize) {
                    centerPheromone = pheromoneGrids[this.colony.id][centerSensorY][centerSensorX];
                }
                
                if (rightSensorX >= 0 && rightSensorX < gridSize && rightSensorY >= 0 && rightSensorY < gridSize) {
                    rightPheromone = pheromoneGrids[this.colony.id][rightSensorY][rightSensorX];
                }
                
                // Adjust direction based on state and pheromone gradient
                if (this.state === 'exploring') {
                    if (Math.random() < 0.8) { // More likely to follow pheromones
                        if (leftPheromone > centerPheromone && leftPheromone > rightPheromone) {
                            this.direction -= this.turnRate * 0.5;
                        } else if (rightPheromone > centerPheromone && rightPheromone > leftPheromone) {
                            this.direction += this.turnRate * 0.5;
                        } else if (centerPheromone > leftPheromone && centerPheromone > rightPheromone) {
                            // Continue straight
                        } else {
                            this.direction += (Math.random() - 0.5) * this.turnRate * 2;
                        }
                    } else {
                        this.direction += (Math.random() - 0.5) * this.turnRate * 3;
                    }
                } else if (this.state === 'returningWithFood') {
                    const toNest = new THREE.Vector2(
                        this.colony.position.x - this.position.x,
                        this.colony.position.y - this.position.y
                    );
                    
                    const angleToNest = Math.atan2(toNest.y, toNest.x);
                    const angleDiff = (angleToNest - this.direction + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
                    
                    this.direction += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turnRate);
                }
            }
            
            // Check for food interaction if exploring and not carrying food
            if (this.state === 'exploring' && !this.hasFood) {
                for (let i = 0; i < foods.length; i++) {
                    const food = foods[i];
                    const distance = this.position.distanceTo(food.position);
                    
                    if (distance < 1.5) {  // If close enough to food
                        const maxTakeAmount = Math.min(5, food.amount); // Take up to 5 units or the remaining amount
                        const takenAmount = Math.floor(Math.random() * maxTakeAmount) + 1; // Random amount taken
                        
                        const actualTaken = food.takeFood(takenAmount); // Try to take food
                        
                        if (actualTaken > 0) {
                            this.hasFood = true;
                            this.foodAmount = actualTaken;
                            this.state = 'returningWithFood';
                            
                            // Change abdomen color to indicate carrying food
                            if (this.mesh.children[2]) {
                                this.mesh.children[2].material.color.set(0x00aa00);  // Green abdomen when carrying food
                            }
                            
                            // Turn around to head back to nest
                            this.direction = (this.direction + Math.PI) % (2 * Math.PI);
                            break;
                        } else if (actualTaken === -1) {
                            // Food is depleted, remove it from the array
                            foods.splice(i, 1);
                            i--;  // Adjust index after removal
                        }
                    }
                }
            }
            
            // Movement behavior
            if (this.state === 'exploring') {
                // Introduce random wandering behavior
                if (Math.random() < 0.1) { // 10% chance to change direction
                    this.direction += (Math.random() - 0.5) * Math.PI * 0.5; // Random turn
                }
            }
            
            // Move forward
            const nextX = this.position.x + Math.cos(this.direction) * this.speed;
            const nextY = this.position.y + Math.sin(this.direction) * this.speed;
            
            const halfGridSize = gridSize * cellSize / 2;
            
            if (nextX < -halfGridSize || nextX > halfGridSize) {
                this.direction = Math.PI - this.direction;
                this.direction += (Math.random() - 0.5) * 0.2;
            } else {
                this.position.x = nextX;
            }
            
            if (nextY < -halfGridSize || nextY > halfGridSize) {
                this.direction = -this.direction;
                this.direction += (Math.random() - 0.5) * 0.2;
            } else {
                this.position.y = nextY;
            }
            
            this.direction = (this.direction + 2 * Math.PI) % (2 * Math.PI);
            
            // Update ant mesh position and rotation
            this.mesh.position.copy(this.position);
            this.mesh.rotation.z = this.direction;
            
            // Add subtle leg animation
            this.legAnimationPhase += this.legAnimationSpeed;
            
            // Add subtle pulsing animation for the glow
            this.pulsePhase += this.pulseSpeed;
            const glowIntensity = 0.2 + Math.sin(this.pulsePhase) * 0.1;
            if (this.mesh.children[10]) { // The glow sphere is the 11th child (index 10)
                this.mesh.children[10].material.opacity = glowIntensity;
                // Make glow more intense when carrying food
                if (this.hasFood) {
                    this.mesh.children[10].material.opacity = glowIntensity + 0.2;
                }
            }
            
            return true;
        }
    }
    
    // Create colonies with red and yellow colors
    const colonies = [];
    const colonyColors = [0xff3333, 0xffcc00]; // Bright red and yellow
    const colonyPositions = [
        {x: -gridSize * cellSize * 0.3, y: -gridSize * cellSize * 0.3},
        {x: gridSize * cellSize * 0.3, y: gridSize * cellSize * 0.3}
    ];
    
    for (let i = 0; i < numColonies; i++) {
        colonies.push(new Colony(i, colonyPositions[i].x, colonyPositions[i].y, colonyColors[i]));
        // Start with more ants
        colonies[i].createAnts(200); // Increased from 100 to 200
    }
    
    // Create more initial food
    const foods = [];
    for (let i = 0; i < 15; i++) { // Increased from 10 to 15
        const foodAmount = 60 + Math.random() * 60; // Increased from 40-80 to 60-120
        foods.push(new Food(
            (Math.random() - 0.5) * gridSize * cellSize * 0.8,
            (Math.random() - 0.5) * gridSize * cellSize * 0.8,
            foodAmount
        ));
    }
    
    // Update food spawning logic to be more natural
    setInterval(() => {
        // Dynamically adjust food spawn rate based on colony sizes
        const totalAnts = colonies.reduce((sum, colony) => sum + colony.ants.length, 0);
        const targetFoodCount = Math.max(15, Math.min(30, Math.floor(totalAnts / 10)));
        
        // Spawn food if below target
        if (foods.length < targetFoodCount && Math.random() < 0.2) {
            // Decide whether to add to existing cluster or create new food
            if (foods.length > 0 && Math.random() < 0.7) {
                // Add near existing food (like plants growing near each other)
                const randomFood = foods[Math.floor(Math.random() * foods.length)];
                const angle = Math.random() * Math.PI * 2;
                const distance = 3 + Math.random() * 5;
                
                const x = randomFood.position.x + Math.cos(angle) * distance;
                const y = randomFood.position.y + Math.sin(angle) * distance;
                
                // Keep within bounds
                const halfGridSize = gridSize * cellSize / 2;
                const boundedX = Math.max(-halfGridSize * 0.8, Math.min(halfGridSize * 0.8, x));
                const boundedY = Math.max(-halfGridSize * 0.8, Math.min(halfGridSize * 0.8, y));
                
                foods.push(new Food(boundedX, boundedY, 40 + Math.random() * 60));
            } else {
                // Create new isolated food
                foods.push(new Food(
                    (Math.random() - 0.5) * gridSize * cellSize * 0.8,
                    (Math.random() - 0.5) * gridSize * cellSize * 0.8,
                    40 + Math.random() * 60
                ));
            }
        }
    }, 3000);
    
    // Update pheromone texture with enhanced visibility
    function updatePheromoneTexture() {
        const data = pheromoneTexture.image.data;
        
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const index = (y * gridSize + x) * 3;
                
                // Amplify pheromone values to make them more visible
                // Red colony - more intense red
                data[index] = Math.min(255, pheromoneGrids[0][y][x] * 1.5); 
                // Yellow colony - more vibrant green+red channels
                data[index + 1] = Math.min(255, pheromoneGrids[1][y][x] * 1.2); 
                data[index + 2] = 0; // No blue
                
                // Occasionally add sparkle effects to even weaker pheromone trails
                const pheromoneStrength = Math.max(pheromoneGrids[0][y][x], pheromoneGrids[1][y][x]);
                if (pheromoneStrength > 100 && Math.random() < 0.002) { // Lower threshold, higher frequency
                    // Create a brighter sparkle particle
                    const worldX = (x - gridSize/2) * cellSize;
                    const worldY = (y - gridSize/2) * cellSize;
                    
                    const sparkle = new THREE.Mesh(
                        new THREE.SphereGeometry(0.15, 4, 4), // Larger sparkles
                        new THREE.MeshBasicMaterial({
                            color: pheromoneGrids[0][y][x] > pheromoneGrids[1][y][x] ? 0xff7777 : 0xffffaa, // Brighter colors
                            transparent: true,
                            opacity: 0.9, // More opaque
                            blending: THREE.AdditiveBlending
                        })
                    );
                    sparkle.position.set(worldX, worldY, 0.1);
                    scene.add(sparkle);
                    
                    // Animate with longer duration
                    const startTime = Date.now();
                    const animate = () => {
                        const elapsed = Date.now() - startTime;
                        if (elapsed > 800) { // Longer duration
                            scene.remove(sparkle);
                            return;
                        }
                        const scale = 1 - (elapsed / 800);
                        sparkle.scale.set(scale, scale, scale);
                        sparkle.material.opacity = scale * 0.9;
                        requestAnimationFrame(animate);
                    };
                    animate();
                }
                
                // Reduce noise for cleaner trails
                if (Math.random() < 0.03) { // Less random noise
                    data[index] = Math.min(255, data[index] + Math.random() * 30);
                    data[index + 1] = Math.min(255, data[index + 1] + Math.random() * 30);
                }
                
                // Slower pheromone decay for more persistent trails
                for (let i = 0; i < numColonies; i++) {
                    pheromoneGrids[i][y][x] *= 0.993 - Math.random() * 0.005; // Slower decay
                }
            }
        }
        
        pheromoneTexture.needsUpdate = true;
    }
    
    // Animation loop without predator updates
    function animate() {
        requestAnimationFrame(animate);
        
        const alwaysRender = true;
        
        if (alwaysRender) {
            // Update colonies and ants
            for (let i = 0; i < colonies.length; i++) {
                const colony = colonies[i];
                
                // Filter out dead ants (no predator parameter)
                colony.ants = colony.ants.filter(ant => ant.update(foods, colonies));
                
                // Calculate sustainable colony size - increased for more ants
                const sustainableSize = Math.min(200, 100 + Math.floor(colony.foodCollected / 400)); // Increased cap and base size
                
                // Spawn new ants with adjusted logic
                if (colony.foodCollected >= 40 && colony.ants.length < sustainableSize) {
                    // More food = higher spawn chance
                    const spawnChance = 0.01 + (colony.foodCollected / 12000); // Adjusted spawn chance
                    if (Math.random() < spawnChance) {
                        colony.createAnts(1);
                        colony.foodCollected -= 30; // Adjusted cost for new ants
                        
                        // Add visual birth effect
                        createBirthEffect(colony.position, colony.color);
                    }
                }
                
                // Faster food decay
                colony.foodCollected *= 0.9998;
            }
            
            // Update pheromone texture
            updatePheromoneTexture();
            
            // Render scene
            renderer.render(scene, camera);
        }
    }
    
    animate();
    
    // Add more natural lighting
    scene.add(new THREE.AmbientLight(0x404040));
    
    // Add warm directional light like sunlight
    const sunLight = new THREE.DirectionalLight(0xffd6aa, 0.8);
    sunLight.position.set(1, 1, 1);
    scene.add(sunLight);
    
    // Add subtle point lights for atmosphere
    const pointLight1 = new THREE.PointLight(0xffaa44, 0.5, 50);
    pointLight1.position.set(20, -20, 15);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x44aaff, 0.3, 50);
    pointLight2.position.set(-20, 20, 15);
    scene.add(pointLight2);
    
    // Make camera look at the center of the scene
    camera.lookAt(scene.position);

    // Update the drawPheromone function to make pheromones more visible
    function drawPheromone(ctx, x, y, strength) {
        // Increase opacity based on pheromone strength
        const alpha = Math.min(0.8, strength * 0.2); // Increased from typical values
        
        // Use a yellow color for better visibility
        ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`; // Bright yellow color
        
        // Make pheromone slightly larger
        const size = 3 + strength * 2; // Increased size
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Optional: Add a subtle glow effect
        ctx.shadowColor = 'rgba(255, 255, 0, 0.5)';
        ctx.shadowBlur = 5;
        
        // Draw and then reset shadow to avoid affecting other elements
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Update the resize function to maintain aspect ratio in the blog
    function resizeRenderer() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(window.devicePixelRatio);
    }

    // Add event listener to resize the renderer and camera on window resize
    window.addEventListener('resize', resizeRenderer);

    // Add a more dynamic birth effect when new ants spawn
    function createBirthEffect(position, color) {
        // Create multiple particles expanding from center
        for (let i = 0; i < 8; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 6, 6),
                new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.7,
                    blending: THREE.AdditiveBlending
                })
            );
            
            // Position at colony center
            particle.position.copy(position);
            scene.add(particle);
            
            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.05 + Math.random() * 0.05;
            const dx = Math.cos(angle) * speed;
            const dy = Math.sin(angle) * speed;
            
            // Animate
            const startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                if (elapsed > 700) {
                    scene.remove(particle);
                    return;
                }
                
                // Move outward
                particle.position.x += dx;
                particle.position.y += dy;
                
                // Fade out
                const progress = elapsed / 700;
                particle.material.opacity = 0.7 * (1 - progress);
                
                requestAnimationFrame(animate);
            };
            
            animate();
        }
    }
})(); 