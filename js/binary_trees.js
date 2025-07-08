// Binary Trees - 90-Degree Growth Visualization 
(function() {
    // Create a namespace for this visualization
    window.BinaryTrees = {
        active: false,
        animationId: null,
        init: init,
        stop: stopAnimation,
        clearMemory: clearMemory
    };

    const canvas = document.getElementById('binary-trees-canvas');
    if (!canvas) {
        console.error("Binary trees canvas not found!");
        return;
    }

    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        const isDesktop = window.innerWidth > 768 && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isDesktop) {
            // Full screen canvas for desktop
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // Set canvas position for full screen
            canvas.style.position = 'fixed';
            canvas.style.left = '0';
            canvas.style.top = '0';
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            canvas.style.transform = 'none';
            canvas.style.transformOrigin = 'center';
            canvas.style.display = 'block';
            canvas.style.zIndex = '-1';
            canvas.style.pointerEvents = 'none';
        } else {
            // Mobile - hide canvas completely
            canvas.style.display = 'none';
            if (window.BinaryTrees.active) {
                stopAnimation();
                clearMemory();
            }
            return;
        }
        
        // Update collision areas after resize
        setTimeout(updateCollisionAreas, 100);
        
        // Reinitialize trees if active
        if (window.BinaryTrees.active) {
            updateTreeSettings();
            
            // Reset existing trees to grow toward updated app positions
            activeTrees.forEach(tree => tree.reset());
        }
    }

    // Add a resize event listener with debounce for better performance
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 150);
    });

    // Also handle orientation changes on mobile
    window.addEventListener('orientationchange', function() {
        setTimeout(resizeCanvas, 300);
    });
    
    // Handle mobile viewport changes (address bar hiding/showing)
    window.addEventListener('scroll', function() {
        if (window.innerWidth <= 768) return; // Skip on mobile
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 50);
    });
    
    // Handle mobile visual viewport changes
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', function() {
            if (window.innerWidth <= 768) return; // Skip on mobile
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resizeCanvas, 50);
        });
    }
    
    // Force initial resize after a short delay to ensure DOM is ready
    setTimeout(resizeCanvas, 100);

    // Black and white color palette for minimal design
    const COLORS = {
        background: '#ffffff', // White background
        branchColor: '#000000'  // Black for branches
    };

    // Binary tree settings - More trees for full screen
    let MAX_TREES = 20; // Increased from 15 to better fill the screen
    let MIN_HORIZONTAL_SPACING = 70; // Reduced to fit more trees
    
    // App target positions for growth attraction
    let appTargets = [];
    
    // Detect mobile and adjust tree settings
    function isMobile() {
        return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    function updateTreeSettings() {
        if (isMobile()) {
            // On mobile, don't run at all
            if (window.BinaryTrees.active) {
                stopAnimation();
                clearMemory();
            }
            return;
        } else {
            MAX_TREES = 20; // More trees for better coverage
            MIN_HORIZONTAL_SPACING = 70; // Tighter spacing for better fill
        }
    }
    
    // Get positions of all desktop apps for attraction-based growth
    function updateAppTargets() {
        appTargets = [];
        const desktopApps = document.querySelectorAll('.desktop-app');
        desktopApps.forEach((app, index) => {
            if (window.getComputedStyle(app).display !== 'none') {
                const rect = app.getBoundingClientRect();
                appTargets.push({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                    width: rect.width,
                    height: rect.height,
                    appIndex: index
                });
            }
        });
    }
    
    // Calculate optimal spacing based on canvas width and device type
    function calculateSpacing() {
        updateTreeSettings();
        const spacing = Math.max(MIN_HORIZONTAL_SPACING, canvas.width / (MAX_TREES + 1));
        return spacing;
    }
    
    let activeTrees = [];
    let time = 0;
    let frameCount = 0;
    
    // Upward growth directions - up, left, right (never down toward root)
    const DIRECTIONS = [
        { dx: 0, dy: -1 }, // up (primary direction)
        { dx: -1, dy: 0 }, // left
        { dx: 1, dy: 0 }   // right
    ];
    
    // Growth state tracking
    let totalGrowthPerSecond = 0;
    let lastGrowthCheck = 0;
    let growthPulseTimer = 0;
    
    // Collision detection areas
    let collisionAreas = [];
    
    function updateCollisionAreas() {
        collisionAreas = [];
        
        // Update app targets for growth attraction
        updateAppTargets();
        
        // Add small collision areas around desktop apps so trees grow AROUND them
        const desktopApps = document.querySelectorAll('.desktop-app');
        desktopApps.forEach((app, index) => {
            if (window.getComputedStyle(app).display !== 'none') {
                const rect = app.getBoundingClientRect();
                // Add collision area around the app with small padding
                collisionAreas.push({
                    x: rect.left - 15, // Small padding around the app
                    y: rect.top - 15,
                    width: rect.width + 30,
                    height: rect.height + 30,
                    type: `desktop-app-${index}`
                });
            }
        });
        
        // Add intro container area
        let introContainer = document.querySelector('.desktop-intro-container');
        if (!introContainer || window.getComputedStyle(introContainer).display === 'none') {
            introContainer = document.querySelector('.mobile-intro-container');
        }
        if (!introContainer) {
            introContainer = document.querySelector('.intro-container');
        }
        if (!introContainer) {
            // Fallback - look for any visible intro element
            const introElements = document.querySelectorAll('[class*="intro"]');
            for (const element of introElements) {
                if (window.getComputedStyle(element).display !== 'none') {
                    introContainer = element;
                    break;
                }
            }
        }
        
        if (introContainer && window.getComputedStyle(introContainer).display !== 'none') {
            const rect = introContainer.getBoundingClientRect();
            collisionAreas.push({
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
                type: 'intro-container'
            });
        }
        
        // Add header container area
        const headerContainer = document.querySelector('.header-container');
        if (headerContainer && window.getComputedStyle(headerContainer).display !== 'none') {
            const rect = headerContainer.getBoundingClientRect();
            collisionAreas.push({
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
                type: 'header-container'
            });
        }
        
        // Add padding around remaining collision areas (not apps since they already have padding)
        collisionAreas = collisionAreas.map(area => {
            let padding = 0; // Default no additional padding
            
            // For intro container, use minimal padding so trees can reach the border
            if (area.type === 'intro-container') {
                padding = 5; // Very small padding - trees will hit the border
            }
            // For header, use normal padding
            else if (area.type === 'header-container') {
                padding = 25;
            }
            // Desktop apps already have padding applied above, so no additional padding
            
            return {
                ...area,
                x: area.x - padding,
                y: area.y - padding,
                width: area.width + (padding * 2),
                height: area.height + (padding * 2)
            };
        });
    }
    
    function checkCollision(x, y) {
        for (const area of collisionAreas) {
            if (x >= area.x && x <= area.x + area.width &&
                y >= area.y && y <= area.y + area.height) {
                return true;
            }
        }
        return false;
    }

    // Binary Tree class
    class BinaryTree {
        constructor(index) {
            this.index = index;
            this.reset();
        }
        
        reset() {
            // Position calculation - evenly space trees horizontally across full screen
            const spacing = calculateSpacing();
            const horizontalPos = spacing * (this.index + 1);
            
            // Start at the bottom of the canvas for upward growth
            this.x = horizontalPos;
            this.y = canvas.height - 50; // Start near bottom with some margin
            
            this.segments = [];
            this.activeSegments = new Set();
            this.terminalNodes = new Set();
            this.pendingSegments = [];
            
            // Growth parameters - optimized for lower branching
            this.growthSpeed = 2.0 + Math.random() * 4; // Slightly slower growth
            this.branchingChance = 0.35 + Math.random() * 0.2; // Reduced from 0.5-0.8 to 0.35-0.55
            this.upwardBias = 0.45 + Math.random() * 0.15; // More balanced upward vs lateral bias
            this.thickness = 0.5 + Math.random() * 0.5; // Branch thickness
            
            // Growth bursts
            this.burstMode = false;
            this.burstTimer = 0;
            this.burstDuration = 0;
            
            // Add initial segment
            this.addInitialSegment();
            
            return this;
        }
        
        addInitialSegment() {
            // Shorter initial upward segment to encourage lower branching
            const length = 30 + Math.random() * 40;
            
            // Create the main initial segment (trunk)
            this.segments.push({
                startX: this.x,
                startY: this.y,
                endX: this.x,
                endY: this.y - length, // Grow upward (negative Y)
                length: length,
                angle: -Math.PI/2, // Point upward
                direction: { dx: 0, dy: -1 }, // Upward direction
                branchCount: 0,
                depth: 0,
                progress: 0,
                age: 0,
                isGrowing: true,
                thickness: this.thickness,
                id: 0,
                blocked: false
            });
            
            this.activeSegments.add(0);
            
            // Create just 1 additional base segment for a more controlled look
            const numExtraRoots = 1; // Reduced from 2-3 to just 1
            
            // Queue these segments to be processed in the next update
            for (let i = 0; i < numExtraRoots; i++) {
                this.pendingSegments.push(0); // All branch from the first segment
            }
        }
        
        getNextDirection(parentDirection) {
            // Can't go back toward the root (downward)
            const invalidDirection = { dx: -parentDirection.dx, dy: -parentDirection.dy };
            
            // Filter valid directions (no downward growth)
            const validDirections = DIRECTIONS.filter(dir => 
                !(dir.dx === invalidDirection.dx && dir.dy === invalidDirection.dy)
            );
            
            // Find app targets to grow around (not directly to)
            let bestDirection = null;
            let shortestDistance = Infinity;
            
            if (appTargets.length > 0) {
                const currentX = this.segments[this.segments.length - 1]?.endX || this.x;
                const currentY = this.segments[this.segments.length - 1]?.endY || this.y;
                
                appTargets.forEach(target => {
                    const distance = Math.sqrt(
                        Math.pow(target.x - currentX, 2) + 
                        Math.pow(target.y - currentY, 2)
                    );
                    
                    // Create attraction zones around each app rather than direct attraction
                    if (distance < 200 && distance < shortestDistance) { // Within influence zone
                        shortestDistance = distance;
                        
                        const deltaX = target.x - currentX;
                        const deltaY = target.y - currentY;
                        
                        // Instead of growing directly toward the app, grow toward spaces around it
                        let preferredDirection = null;
                        
                        // If we're below the app, prefer growing upward and around it
                        if (currentY > target.y + 40) {
                            // Below the app - grow up and around
                            if (Math.abs(deltaX) > 60) {
                                // Far to the side - grow toward the app horizontally first
                                preferredDirection = deltaX > 0 ? { dx: 1, dy: 0 } : { dx: -1, dy: 0 };
                            } else {
                                // Close horizontally - grow upward
                                preferredDirection = { dx: 0, dy: -1 };
                            }
                        } 
                        // If we're to the side of the app, prefer growing around it
                        else if (Math.abs(deltaX) > 40) {
                            // To the side - grow around horizontally, but slightly toward it
                            if (Math.abs(deltaY) < 30) {
                                // At same level - grow toward it horizontally
                                preferredDirection = deltaX > 0 ? { dx: 1, dy: 0 } : { dx: -1, dy: 0 };
                            } else {
                                // Different level - prefer upward movement
                                preferredDirection = { dx: 0, dy: -1 };
                            }
                        }
                        // If we're close to the app, prefer growing away and around
                        else if (distance < 80) {
                            // Very close - grow away to go around
                            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                                preferredDirection = deltaX > 0 ? { dx: -1, dy: 0 } : { dx: 1, dy: 0 }; // Opposite direction
                            } else {
                                preferredDirection = { dx: 0, dy: -1 }; // Go up to go around
                            }
                        }
                        // If we're above the app, prefer lateral movement to go around
                        else {
                            // Above or at similar level - prefer lateral movement
                            if (Math.abs(deltaX) > 20) {
                                preferredDirection = deltaX > 0 ? { dx: 1, dy: 0 } : { dx: -1, dy: 0 };
                            } else {
                                preferredDirection = Math.random() < 0.5 ? { dx: 1, dy: 0 } : { dx: -1, dy: 0 };
                            }
                        }
                        
                        // Make sure preferred direction is valid (no downward growth)
                        if (preferredDirection && preferredDirection.dy === 1) {
                            preferredDirection = Math.random() < 0.5 ? { dx: 1, dy: 0 } : { dx: -1, dy: 0 };
                        }
                        
                        if (preferredDirection && validDirections.some(dir => dir.dx === preferredDirection.dx && dir.dy === preferredDirection.dy)) {
                            bestDirection = preferredDirection;
                        }
                    }
                });
            }
            
            // Randomly decide direction with bias toward flowing around apps
            const rand = Math.random();
            
            // Strong bias toward flowing around apps when in their influence zone
            if (bestDirection) {
                if (rand < 0.5) { // Reduced from 0.6 to 0.5 for more balanced branching
                    return bestDirection;
                }
            }
            
            // More balanced directional bias for natural-looking trees
            if (rand < this.upwardBias) {
                // Significantly reduced tendency to continue in same direction
                if (rand < this.upwardBias * 0.15) { // Reduced from 0.25 to 0.15
                    return parentDirection;
                }
                
                // Otherwise grow upward when possible
                const upwardDir = validDirections.find(dir => dir.dy === -1);
                if (upwardDir) {
                    return upwardDir;
                }
            }
            
            // More balanced random selection for lateral directions
            // This gives more even left/right distribution
            if (validDirections.length > 1) {
                // Filter out the parent direction to avoid continuing straight
                const nonParentDirections = validDirections.filter(dir => 
                    !(dir.dx === parentDirection.dx && dir.dy === parentDirection.dy)
                );
                
                if (nonParentDirections.length > 0) {
                    return nonParentDirections[Math.floor(Math.random() * nonParentDirections.length)];
                }
            }
            
            // Fallback to completely random direction if needed
            return validDirections[Math.floor(Math.random() * validDirections.length)];
        }
        
        addSegment(parentIndex) {
            const parent = this.segments[parentIndex];
            if (!parent) return;
            
            const lastX = parent.endX;
            const lastY = parent.endY;
            const depth = parent.depth + 1;
            
            // Get next direction
            const nextDirection = this.getNextDirection(parent.direction);
            
            // Much longer segments for better reach
            let baseLength = 40 + Math.random() * 60; // Increased from 15+25 to 40+60
            
            // Near the base, make segments shorter but more numerous for bushier appearance
            if (depth < 3) {
                baseLength = 25 + Math.random() * 40; // Shorter segments near base
            }
            
            // Make horizontal segments even longer to reach containers
            if (nextDirection.dx !== 0) {
                // Shorter horizontal segments near base, longer further out
                const lengthBonus = depth < 3 ? 
                    (10 + Math.random() * 25) : // Shorter but still substantial near base 
                    (20 + Math.random() * 40);  // Normal length further out
                baseLength += lengthBonus;
            }
            
            // Upward segments should be moderately long
            if (nextDirection.dy === -1) {
                baseLength += 15 + Math.random() * 25; // Boost upward growth
                
                // Less density-based adjustment - we want longer branches
                const nearbySegments = this.getNearbySegmentsCount(lastX, lastY, 150);
                const densityFactor = Math.max(0.9, 1.1 - (nearbySegments * 0.02));
                baseLength *= densityFactor;
            }
            
            // Reduced depth penalty to maintain length at deeper levels
            const depthReduction = Math.min(15, depth * (0.3 + Math.random() * 0.2)); // Less aggressive reduction
            const length = Math.max(15, baseLength - depthReduction); // Higher minimum length
            
            // Calculate endpoints
            const endX = lastX + (nextDirection.dx * length);
            const endY = lastY + (nextDirection.dy * length);
            
            // Check if the endpoint would collide with UI elements
            const wouldCollide = checkCollision(endX, endY);
            if (wouldCollide) {
                return null; // Don't add segment that would collide
            }
            
            // Calculate angle for drawing
            let angle = 0;
            if (nextDirection.dx === 1) angle = 0; // right
            else if (nextDirection.dx === -1) angle = Math.PI; // left
            else if (nextDirection.dy === 1) angle = Math.PI/2; // down
            else if (nextDirection.dy === -1) angle = -Math.PI/2; // up
            
            // Gentler thickness reduction to keep branches visible
            const thicknessFactor = Math.max(0.3, 1 - (depth * Math.random() * 0.04)); // Less aggressive thickness reduction
            
            // Create the new segment
            const segmentIndex = this.segments.length;
            const segmentId = segmentIndex;
            
            this.segments.push({
                startX: lastX,
                startY: lastY,
                endX: endX,
                endY: endY,
                length: length,
                angle: angle,
                direction: nextDirection,
                branchCount: 0,
                depth: depth,
                progress: 0,
                age: 0,
                isGrowing: true,
                thickness: this.thickness * thicknessFactor,
                id: segmentId,
                parentIndex: parentIndex,
                blocked: false
            });
            
            this.activeSegments.add(segmentIndex);
            parent.branchCount++;
            
            if (parent.branchCount === 1) {
                this.terminalNodes.delete(parentIndex);
            }
            
            return segmentIndex;
        }
        
        // Helper to count nearby segments for density awareness
        getNearbySegmentsCount(x, y, radius) {
            let count = 0;
            for (const segment of this.segments) {
                // Skip tiny or non-visible segments
                if (segment.progress < 0.5) continue;
                
                // Calculate distance from segment endpoints to the point
                const d1 = Math.sqrt(Math.pow(segment.startX - x, 2) + Math.pow(segment.startY - y, 2));
                const d2 = Math.sqrt(Math.pow(segment.endX - x, 2) + Math.pow(segment.endY - y, 2));
                
                // If either endpoint is within radius, count it
                if (d1 < radius || d2 < radius) {
                    count++;
                }
            }
            return count;
        }
        
        update() {
            this.processQueuedSegments();
            
            if (this.burstMode) {
                this.burstTimer++;
                if (this.burstTimer >= this.burstDuration) {
                    this.endGrowthBurst();
                }
            }
            
            // More frequent bursts for faster expansion
            if (!this.burstMode && Math.random() < 0.035) { // Increased from 0.025
                this.triggerGrowthBurst();
            }
            
            let newSegmentsThisFrame = 0;
            let completedSegmentsThisFrame = new Set();
            
            const activeSegmentsArray = Array.from(this.activeSegments);
            const maxSegmentsPerFrame = 100; // Increased from 80 for faster growth
            const segmentsToProcess = activeSegmentsArray.length <= maxSegmentsPerFrame ? 
                activeSegmentsArray : 
                activeSegmentsArray.slice(0, maxSegmentsPerFrame);
            
            // Update growing segments
            for (const segmentIndex of segmentsToProcess) {
                const segment = this.segments[segmentIndex];
                if (!segment || !segment.isGrowing) continue;
                
                segment.age++;
                
                if (segment.progress < 1) {
                    const speedFactor = this.burstMode ? 2 : (0.7 + Math.random() * 0.6);
                    segment.progress += (this.growthSpeed * speedFactor) / Math.max(20, segment.length);
                    
                    // Check collision as segment grows
                    const currentEndX = segment.startX + (segment.endX - segment.startX) * segment.progress;
                    const currentEndY = segment.startY + (segment.endY - segment.startY) * segment.progress;
                    
                    // Check if segment has reached an app target area (for visual feedback)
                    let reachedAppArea = false;
                    if (appTargets.length > 0) {
                        appTargets.forEach(target => {
                            const distanceToTarget = Math.sqrt(
                                Math.pow(currentEndX - target.x, 2) + 
                                Math.pow(currentEndY - target.y, 2)
                            );
                            // Consider app area reached if within 50 pixels of center (larger radius for flowing around)
                            if (distanceToTarget <= 50) {
                                reachedAppArea = true;
                                segment.nearApp = target.appIndex;
                            }
                        });
                    }
                    
                    if (checkCollision(currentEndX, currentEndY)) {
                        // Stop growing this segment
                        segment.blocked = true;
                        segment.isGrowing = false;
                        completedSegmentsThisFrame.add(segmentIndex);
                        this.terminalNodes.add(segmentIndex);
                    } else if (reachedAppArea) {
                        // Successfully reached an app - complete the segment
                        segment.progress = 1;
                        segment.isGrowing = false;
                        completedSegmentsThisFrame.add(segmentIndex);
                        this.terminalNodes.add(segmentIndex);
                    } else if (segment.progress >= 1) {
                        segment.progress = 1;
                        completedSegmentsThisFrame.add(segmentIndex);
                        this.terminalNodes.add(segmentIndex);
                    }
                }
            }
            
            let branchingAttempts = 0;
            const maxBranchingAttempts = 24; // Increased from 18 for more density
            
            // Process newly completed segments
            for (const segmentIndex of completedSegmentsThisFrame) {
                if (branchingAttempts >= maxBranchingAttempts) break;
                
                const segment = this.segments[segmentIndex];
                
                if (segment.branchCount === 0 && !segment.blocked) {
                    // Calculate branch density in this area for adaptive branching
                    const density = this.getNearbySegmentsCount(segment.endX, segment.endY, 120);
                    const densityFactor = Math.max(0.6, 1.2 - (density * 0.03));
                    
                    // Adjust branch chance based on density and depth
                    // Much higher branching near the base for bushier appearance
                    let depthFactor = 1.0;
                    if (segment.depth < 3) {
                        depthFactor = 1.1 - (segment.depth * 0.05); // Reduced from 1.4/1.3/1.2 to 1.1/1.05/1.0
                    } else if (segment.depth > 8) {
                        depthFactor = Math.max(0.5, 1.0 - ((segment.depth - 8) * 0.05)); // Gradually reduce at higher depths
                    }
                    
                    const adjustedBranchChance = this.branchingChance * densityFactor * depthFactor;
                    
                    const branchRoll = Math.random();
                    if (branchRoll < adjustedBranchChance) {
                        this.queueSegment(segmentIndex);
                        newSegmentsThisFrame++;
                        branchingAttempts++;
                        
                        // More even multi-branching with guaranteed second branch
                        if (branchRoll < adjustedBranchChance) {
                            this.queueSegment(segmentIndex);
                            newSegmentsThisFrame++;
                            branchingAttempts++;
                            
                            // Always add a second branch for more balanced trees, but with density awareness
                            // This guarantees binary branching for most completed segments
                            if (density < 10) { // Reduced from 15 to be more selective about second branches
                                this.queueSegment(segmentIndex);
                                newSegmentsThisFrame++;
                                branchingAttempts++;
                                
                                // More likely to add third branch near the base
                                const thirdBranchThreshold = segment.depth < 3 ? 
                                    (adjustedBranchChance * 0.3) : // Reduced from 0.6 to 0.3
                                    (adjustedBranchChance * 0.15); // Reduced from 0.25 to 0.15
                                
                                // Third branch more frequent at the base, but still density-aware
                                if ((segment.depth < 3 || density < 6) && branchRoll < thirdBranchThreshold) {
                                    this.queueSegment(segmentIndex);
                                    newSegmentsThisFrame++;
                                    branchingAttempts++;
                                    
                                    // Add occasional fourth branch at the very base for extremely bushy look
                                    if (segment.depth < 2 && density < 4 && branchRoll < adjustedBranchChance * 0.1) {
                                        this.queueSegment(segmentIndex);
                                        newSegmentsThisFrame++;
                                        branchingAttempts++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            for (const segmentIndex of completedSegmentsThisFrame) {
                this.activeSegments.delete(segmentIndex);
            }
            
            // Additional random branching for density (only non-blocked segments)
            if (branchingAttempts < maxBranchingAttempts) {
                const terminalNodesArray = Array.from(this.terminalNodes);
                const shuffledNodes = terminalNodesArray.sort(() => Math.random() - 0.5);
                const nodesToProcess = shuffledNodes.slice(0, maxBranchingAttempts - branchingAttempts);
                
                for (const nodeIndex of nodesToProcess) {
                    if (branchingAttempts >= maxBranchingAttempts) break;
                    
                    const segment = this.segments[nodeIndex];
                    
                    // Allow deeper branches but prioritize lower levels, skip blocked segments
                    if (!segment || segment.depth > 25 || segment.branchCount >= 3 || segment.blocked) continue;
                    
                    // Much higher branching chance for lower depths, but still controlled
                    let branchChance = this.branchingChance * (0.5 + Math.random() * 0.3);
                    
                    // More moderate bonus for lower depth segments
                    const lowDepthBonus = Math.max(1, 2 - (segment.depth * 0.15));
                    branchChance *= lowDepthBonus;
                    
                    if (segment.direction.dy === -1) {
                        // Moderate increase for upward segments
                        branchChance *= (1.0 + Math.random() * 0.25);
                    }
                    
                    // More reduction by depth to prevent overcrowding
                    branchChance *= Math.max(0.3, 1 - (segment.depth * 0.025));
                    
                    if (Math.random() < branchChance) {
                        this.queueSegment(nodeIndex);
                        newSegmentsThisFrame++;
                        branchingAttempts++;
                    }
                }
            }
            
            // More aggressive forced growth when stalled
            if (this.activeSegments.size === 0 && this.pendingSegments.length === 0) {
                const terminalNodesArray = Array.from(this.terminalNodes);
                const nonBlockedNodes = terminalNodesArray.filter(nodeIndex => !this.segments[nodeIndex].blocked);
                
                if (nonBlockedNodes.length > 0) {
                    // Find the highest nodes (smallest Y values)
                    let highestY = Infinity;
                    let highestNodes = [];
                    
                    nonBlockedNodes.forEach(nodeIndex => {
                        const segment = this.segments[nodeIndex];
                        if (segment.endY < highestY) {
                            highestY = segment.endY;
                            highestNodes = [nodeIndex];
                        } else if (segment.endY === highestY) {
                            highestNodes.push(nodeIndex);
                        }
                    });
                    
                    // Always grow from highest nodes to reach higher
                    if (highestNodes.length > 0) {
                        const randomHighestNode = highestNodes[Math.floor(Math.random() * highestNodes.length)];
                        this.queueSegment(randomHighestNode);
                    }
                    
                    // Also add some random nodes for general density
                    const numRandomNodes = Math.min(3, nonBlockedNodes.length);
                    for (let i = 0; i < numRandomNodes; i++) {
                        const randomIndex = Math.floor(Math.random() * nonBlockedNodes.length);
                        const randomNode = nonBlockedNodes[randomIndex];
                        this.queueSegment(randomNode);
                        nonBlockedNodes.splice(randomIndex, 1);
                        if (nonBlockedNodes.length === 0) break;
                    }
                }
            }
            
            return true;
        }
        
        draw(ctx) {
            // Skip drawing segments that are off-screen for performance
            const viewportMargin = 100;
            const minX = -viewportMargin;
            const maxX = canvas.width + viewportMargin;
            const minY = -viewportMargin;
            const maxY = canvas.height + viewportMargin;
            
            let drawnSegments = 0;
            
            // Draw segments
            for (let i = 0; i < this.segments.length; i++) {
                const segment = this.segments[i];
                
                // Skip segments that haven't started growing
                if (segment.progress <= 0) continue;
                
                // Calculate actual drawing endpoints based on progress
                const drawEndX = segment.startX + (segment.endX - segment.startX) * segment.progress;
                const drawEndY = segment.startY + (segment.endY - segment.startY) * segment.progress;
                
                // Skip off-screen segments
                if (
                    (segment.startX < minX && drawEndX < minX) || 
                    (segment.startX > maxX && drawEndX > maxX) || 
                    (segment.startY < minY && drawEndY < minY) || 
                    (segment.startY > maxY && drawEndY > maxY)
                ) {
                    continue;
                }
                
                // Set visual style based on whether segment reached an app area
                if (segment.nearApp !== undefined) {
                    // Segments that reached app areas get a slightly thicker line
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1.0;
                    ctx.lineCap = 'round';
                } else {
                    // Regular segments
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 0.5;
                    ctx.lineCap = 'butt';
                }
                
                // Draw the segment
                ctx.beginPath();
                ctx.moveTo(segment.startX, segment.startY);
                ctx.lineTo(drawEndX, drawEndY);
                ctx.stroke();
                
                drawnSegments++;
            }
        }

        // Queue a new segment to be added
        queueSegment(parentIndex) {
            this.pendingSegments.push(parentIndex);
        }
        
        // Process all queued segments
        processQueuedSegments() {
            // Process more segments per frame for faster growth
            const maxToProcess = Math.min(8, this.pendingSegments.length); // Increased from 6
            
            for (let i = 0; i < maxToProcess; i++) {
                if (this.pendingSegments.length === 0) break;
                const parentIndex = this.pendingSegments.shift();
                this.addSegment(parentIndex);
            }
        }

        // Trigger growth burst
        triggerGrowthBurst() {
            this.burstMode = true;
            this.burstTimer = 0;
            this.burstDuration = 60 + Math.floor(Math.random() * 40); // Longer bursts for more growth
        }
        
        endGrowthBurst() {
            this.burstMode = false;
            this.burstTimer = 0;
        }
    }

    function init() {
        // Don't initialize on mobile devices
        if (isMobile()) {
            console.log('Binary trees: Mobile detected, skipping initialization');
            return;
        }
        
        console.log('Binary trees: Initializing for desktop');
        
        // Force initial resize to ensure canvas is properly sized
        resizeCanvas();
        
        // Initialize tree settings
        updateTreeSettings();
        
        // Clear any existing state
        activeTrees.length = 0;
        time = 0;
        frameCount = 0;
        
        // Update collision areas
        updateCollisionAreas();
        
        // Create initial trees with better spacing
        const spacing = calculateSpacing();
        const startY = canvas.height - 50; // Start near bottom
        
        for (let i = 0; i < MAX_TREES; i++) {
            const x = spacing * (i + 1);
            if (x < canvas.width - 50) { // Leave some margin
                const tree = new BinaryTree(i);
                tree.x = x;
                tree.y = startY;
                activeTrees.push(tree);
            }
        }
        
        console.log(`Binary trees: Created ${activeTrees.length} trees`);
        
        // Start animation
        window.BinaryTrees.active = true;
        animate();
        
        // Stop animation after 20 seconds
        setTimeout(() => {
            console.log('Binary trees: 20 seconds elapsed, stopping animation');
            stopAnimation();
        }, 20000); // 20 seconds = 20000 milliseconds
    }

    function update() {
        time++;
        frameCount++;
        
        // Update collision areas periodically (every 2 seconds)
        if (frameCount % 120 === 0) {
            updateCollisionAreas();
        }
        
        // Update all active trees
        for (let i = 0; i < activeTrees.length; i++) {
            if (activeTrees[i]) {
                activeTrees[i].update();
            }
        }
        
        // Growth pulse tracking
        const now = performance.now();
        if (now - lastGrowthCheck >= 1000) {
            totalGrowthPerSecond = 0;
            lastGrowthCheck = now;
        }
        
        growthPulseTimer++;
    }

    function draw() {
        // Clear with solid white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Remove test rectangle - no longer needed
        
        // Ensure line color is set to pure black
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.5;
        ctx.lineCap = 'butt';
        
        // Draw all active trees
        for (let i = 0; i < activeTrees.length; i++) {
            if (activeTrees[i] && activeTrees[i].segments) {
                activeTrees[i].draw(ctx);
            }
        }
    }

    function animate() {
        if (!window.BinaryTrees.active) return;
        
        window.BinaryTrees.animationId = requestAnimationFrame(animate);
        
        update();
        draw();
    }

    function stopAnimation() {
        if (window.BinaryTrees.animationId) {
            cancelAnimationFrame(window.BinaryTrees.animationId);
            window.BinaryTrees.animationId = null;
        }
        window.BinaryTrees.active = false;
        console.log('Binary trees: Animation stopped');
    }
    
    function clearMemory() {
        // Clear all trees and reset state
        activeTrees.length = 0;
        collisionAreas.length = 0;
        appTargets.length = 0;
        time = 0;
        frameCount = 0;
        
        // Clear canvas
        if (ctx && canvas.width && canvas.height) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        console.log('Binary trees: Memory cleared');
    }

    // Auto-initialize if the canvas is active
    setTimeout(() => {
        if (window.innerWidth > 768) {
            init();
        }
    }, 500);

    // Add resize handler to reinitialize trees when switching between mobile/desktop
    let lastIsMobile = isMobile();
    window.addEventListener('resize', function() {
        const currentIsMobile = isMobile();
        if (currentIsMobile !== lastIsMobile) {
            lastIsMobile = currentIsMobile;
            // Reinitialize with new tree count
            if (window.BinaryTrees.active) {
                init();
            }
        }
    });
})(); 