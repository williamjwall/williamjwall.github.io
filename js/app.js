// Drag and reorder functionality for desktop apps
document.addEventListener('DOMContentLoaded', function() {
    // Get the desktop icons container
    const desktopIcons = document.querySelector('.desktop-icons');
    
    if (!desktopIcons) return;
    
    let draggedApp = null;
    let apps = Array.from(desktopIcons.querySelectorAll('.desktop-app'));
    let appPositions = [];
    let gridPositions = [
        ['grid-pos-1-1', 'grid-pos-2-1', 'grid-pos-3-1'],
        ['grid-pos-1-2', 'grid-pos-2-2', 'grid-pos-3-2']
    ];
    
    // Initialize grid position map
    function initializeGridPositions() {
        // Remove existing grid position classes and assign new ones based on position
        apps.forEach((app, index) => {
            // Remove all grid position classes
            app.classList.forEach(className => {
                if (className.startsWith('grid-pos-')) {
                    app.classList.remove(className);
                }
            });
            
            // Calculate row and column
            const row = Math.floor(index / 3);
            const col = index % 3;
            
            // Ensure we don't exceed grid boundaries
            if (row < gridPositions.length && col < gridPositions[0].length) {
                app.classList.add(gridPositions[row][col]);
            }
        });
    }
    
    // Save initial positions of apps
    function saveAppPositions() {
        appPositions = [];
        apps.forEach(app => {
            const rect = app.getBoundingClientRect();
            appPositions.push({
                app: app,
                center: {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                }
            });
        });
    }
    
    // Function to start dragging
    function handleDragStart(e) {
        // Prevent default behavior to avoid text selection or other issues
        e.preventDefault();
        
        // Get the app element
        const app = e.currentTarget;
        
        // Add dragging class for visual feedback
        app.classList.add('dragging');
        
        // Set the dragged app
        draggedApp = app;
        
        // Save app positions for swapping
        saveAppPositions();
        
        // Set initial drag position
        const rect = app.getBoundingClientRect();
        const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        
        app.dragOffset = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
        
        // Start tracking mouse/touch movement
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        
        // Set up event listeners for drag end
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchend', handleDragEnd);
    }
    
    // Function to handle drag movement
    function handleDragMove(e) {
        if (!draggedApp) return;
        
        // Prevent default to avoid scrolling on touch devices
        e.preventDefault();
        
        // Get the client coordinates
        const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        
        // Position the dragged app
        draggedApp.style.position = 'fixed';
        draggedApp.style.zIndex = '1000';
        draggedApp.style.top = (clientY - draggedApp.dragOffset.y) + 'px';
        draggedApp.style.left = (clientX - draggedApp.dragOffset.x) + 'px';
        
        // Find the closest app to potentially swap with
        const draggedCenter = {
            x: clientX,
            y: clientY
        };
        
        let closestApp = null;
        let shortestDistance = Infinity;
        
        appPositions.forEach(position => {
            if (position.app === draggedApp) return;
            
            const distance = Math.sqrt(
                Math.pow(draggedCenter.x - position.center.x, 2) +
                Math.pow(draggedCenter.y - position.center.y, 2)
            );
            
            if (distance < shortestDistance) {
                shortestDistance = distance;
                closestApp = position.app;
            }
        });
        
        // If we're close enough to an app, swap positions
        if (closestApp && shortestDistance < 100) {
            // Get the indices
            const draggedIndex = apps.indexOf(draggedApp);
            const closestIndex = apps.indexOf(closestApp);
            
            // Only proceed if they're different
            if (draggedIndex !== closestIndex) {
                // Swap the apps in the DOM
                if (draggedIndex < closestIndex) {
                    desktopIcons.insertBefore(draggedApp, closestApp.nextSibling);
                } else {
                    desktopIcons.insertBefore(draggedApp, closestApp);
                }
                
                // Update our apps array
                apps = Array.from(desktopIcons.querySelectorAll('.desktop-app'));
                
                // Save new positions
                saveAppPositions();
                
                // Update grid position classes after rearranging
                initializeGridPositions();
            }
        }
    }
    
    // Function to end dragging
    function handleDragEnd() {
        if (!draggedApp) return;
        
        // Reset dragged app styling
        draggedApp.style.position = '';
        draggedApp.style.zIndex = '';
        draggedApp.style.top = '';
        draggedApp.style.left = '';
        draggedApp.classList.remove('dragging');
        
        // Save the new order to localStorage
        saveAppOrder();
        
        // Clear dragged app
        draggedApp = null;
        
        // Remove event listeners
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('touchmove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchend', handleDragEnd);
    }
    
    // Save app order to localStorage
    function saveAppOrder() {
        const appOrder = Array.from(desktopIcons.querySelectorAll('.desktop-app')).map(app => {
            return app.getAttribute('data-app');
        });
        
        localStorage.setItem('appOrder', JSON.stringify(appOrder));
    }
    
    // Load app order from localStorage
    function loadAppOrder() {
        const savedOrder = localStorage.getItem('appOrder');
        
        if (savedOrder) {
            try {
                const appOrder = JSON.parse(savedOrder);
                
                // Reorder based on saved order
                appOrder.forEach(appId => {
                    const app = Array.from(desktopIcons.querySelectorAll('.desktop-app')).find(
                        app => app.getAttribute('data-app') === appId
                    );
                    
                    if (app) {
                        desktopIcons.appendChild(app);
                    }
                });
                
                // Update our apps array after reordering
                apps = Array.from(desktopIcons.querySelectorAll('.desktop-app'));
                
                // Update grid position classes after loading saved order
                initializeGridPositions();
            } catch (e) {
                console.error('Error loading saved app order:', e);
            }
        }
    }
    
    // Add event listeners to all desktop apps
    apps.forEach(app => {
        app.addEventListener('mousedown', handleDragStart);
        app.addEventListener('touchstart', handleDragStart, { passive: false });
    });
    
    // Initialize grid positions on page load
    initializeGridPositions();
    
    // Load saved app order on page load
    loadAppOrder();
}); 