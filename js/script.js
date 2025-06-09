// Desktop App System
let openWindows = new Set();
let windowZIndex = 1000;

// Draggable desktop apps functionality
let draggedApp = null;
let dragOffset = { x: 0, y: 0 };
let isDraggingApp = false;
let dragStartTime = 0;

// Store the original positions for reset
const originalPositions = {
    'portfolio': { x: 0, y: 0 },
    'experience': { x: 0, y: 0 },
    'education': { x: 0, y: 0 },
    'skills': { x: 0, y: 0 },
    'contact': { x: 0, y: 0 }
};

// Initialize mobile navigation
function initializeMobileNav() {
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    mobileNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const appName = item.getAttribute('data-app');
            if (appName) {
                openApp(appName);
            }
        });
    });
}

// Mobile functionality is removed since we're not using the mobile menu

function initializeDraggableApps() {
    const apps = document.querySelectorAll('.draggable-app');
    
    // Store original positions from bounding rect
    apps.forEach(app => {
        const rect = app.getBoundingClientRect();
        const appName = app.getAttribute('data-app');
        originalPositions[appName] = { x: rect.left, y: rect.top };
        
        // Mouse events
        app.addEventListener('mousedown', startDragApp);
        app.addEventListener('dragstart', e => e.preventDefault()); // Prevent default drag
        app.addEventListener('click', handleAppClick);
        
        // Touch events for mobile
        app.addEventListener('touchstart', handleTouchStart);
        app.addEventListener('touchmove', handleTouchMove);
        app.addEventListener('touchend', handleTouchEnd);
    });
    
    document.addEventListener('mousemove', dragApp);
    document.addEventListener('mouseup', endDragApp);
}

function handleAppClick(e) {
    // Only open app if we weren't dragging
    if (isDraggingApp || (Date.now() - dragStartTime) > 200) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    
    // Get app name from data attribute
    const appName = e.currentTarget.getAttribute('data-app');
    if (appName) {
        openApp(appName);
    }
}

function startDragApp(e) {
    dragStartTime = Date.now();
    draggedApp = e.currentTarget;
    isDraggingApp = false;
    
    const rect = draggedApp.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    e.preventDefault();
    e.stopPropagation();
}

function dragApp(e) {
    if (!draggedApp) return;
    
    // Start dragging if mouse moved enough
    if (!isDraggingApp) {
        const moveDistance = Math.sqrt(
            Math.pow(e.clientX - (draggedApp.getBoundingClientRect().left + dragOffset.x), 2) +
            Math.pow(e.clientY - (draggedApp.getBoundingClientRect().top + dragOffset.y), 2)
        );
        
        if (moveDistance > 5) { // Start drag after 5px movement
            isDraggingApp = true;
            draggedApp.classList.add('dragging');
        }
    }
    
    // Visual feedback only, no actual position change during drag
    if (isDraggingApp) {
        // Just keep the app highlighted during drag, but don't change position
    }
}

function endDragApp(e) {
    if (!draggedApp) return;
    
    if (isDraggingApp) {
        const desktopIcons = document.querySelector('.desktop-icons');
        const apps = document.querySelectorAll('.draggable-app');
        
        // Get the closest app to swap with based on the mouse position
        let closestApp = null;
        let minDistance = Infinity;
        
        apps.forEach(app => {
            if (app !== draggedApp) {
                const rect = app.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const distance = Math.sqrt(
                    Math.pow(e.clientX - centerX, 2) + 
                    Math.pow(e.clientY - centerY, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestApp = app;
                }
            }
        });
        
        // If within a reasonable distance, swap the apps
        if (closestApp && minDistance < 150) {
            swapApps(draggedApp, closestApp);
        }
        
        draggedApp.classList.remove('dragging');
    }
    
    // Reset drag state
    setTimeout(() => {
        draggedApp = null;
        isDraggingApp = false;
    }, 100);
}

function swapApps(app1, app2) {
    // Get the parent
    const parent = app1.parentElement;
    
    // Get the grid positions
    const gridPos1 = getGridPosition(app1);
    const gridPos2 = getGridPosition(app2);
    
    // Remove existing grid position classes
    app1.className = app1.className.replace(/grid-pos-\d-\d/g, '').trim();
    app2.className = app2.className.replace(/grid-pos-\d-\d/g, '').trim();
    
    // Add swapped grid position classes
    app1.classList.add(`grid-pos-${gridPos2.col}-${gridPos2.row}`);
    app2.classList.add(`grid-pos-${gridPos1.col}-${gridPos1.row}`);
}

function getGridPosition(app) {
    const classNames = app.className.split(' ');
    const gridPosClass = classNames.find(cls => cls.startsWith('grid-pos-'));
    
    if (gridPosClass) {
        const [_, col, row] = gridPosClass.match(/grid-pos-(\d)-(\d)/);
        return { col: parseInt(col), row: parseInt(row) };
    }
    
    // Default position if not found
    return { col: 1, row: 1 };
}

// Ensure all apps have a grid position class
function initializeGridPositions() {
    const apps = document.querySelectorAll('.draggable-app');
    const positions = [
        { app: 'portfolio', col: 1, row: 1 },
        { app: 'experience', col: 2, row: 1 },
        { app: 'education', col: 3, row: 1 },
        { app: 'skills', col: 1, row: 2 },
        { app: 'contact', col: 2, row: 2 }
    ];
    
    positions.forEach(pos => {
        const app = document.querySelector(`.draggable-app[data-app="${pos.app}"]`);
        if (app) {
            app.classList.add(`grid-pos-${pos.col}-${pos.row}`);
        }
    });
}

function resetAppStyle(app) {
    // Remove all inline styles
    app.style.cssText = '';
}

function openApp(appName) {
    const windowId = `${appName}-window`;
    const window = document.getElementById(windowId);
    
    if (!window) {
        console.error(`Window ${windowId} not found`);
        return;
    }
    
    // Show the window
    window.style.display = 'block';
    window.style.zIndex = ++windowZIndex;
    
    // Add to open windows set
    openWindows.add(appName);
    
    // Remove from taskbar if it was minimized
    removeFromTaskbar(appName);
    
    // Make window draggable
    makeDraggable(window);
    
    // Focus the window
    focusWindow(window);
}

function closeApp(appName) {
    const windowId = `${appName}-window`;
    const window = document.getElementById(windowId);
    
    if (window) {
        window.style.display = 'none';
        openWindows.delete(appName);
        removeFromTaskbar(appName);
    }
}

function minimizeApp(appName) {
    const windowId = `${appName}-window`;
    const window = document.getElementById(windowId);
    
    if (window) {
        window.style.display = 'none';
        addToTaskbar(appName);
    }
}

function addToTaskbar(appName) {
    const taskbarApps = document.getElementById('taskbar-apps');
    
    // Check if already in taskbar
    if (document.getElementById(`taskbar-${appName}`)) {
        return;
    }
    
    const taskbarApp = document.createElement('div');
    taskbarApp.className = 'taskbar-app';
    taskbarApp.id = `taskbar-${appName}`;
    taskbarApp.onclick = () => openApp(appName);
    
    // Get icon and title
    const icons = {
        portfolio: 'images/icons/Screenshot from 2025-06-08 20-07-24.png',
        experience: 'images/icons/Screenshot from 2025-06-08 20-07-36.png',
        education: 'images/icons/Screenshot from 2025-06-08 20-07-50.png',
        skills: 'images/icons/Screenshot from 2025-06-08 20-08-00.png',
        contact: 'images/icons/Screenshot from 2025-06-08 20-08-23.png'
    };
    
    const titles = {
        portfolio: 'Portfolio',
        experience: 'Experience',
        education: 'Education',
        skills: 'Skills',
        contact: 'Contact'
    };
    
    taskbarApp.innerHTML = `<img src="${icons[appName]}" alt="${titles[appName]}" class="taskbar-icon">${titles[appName]}`;
    taskbarApps.appendChild(taskbarApp);
}

function removeFromTaskbar(appName) {
    const taskbarApp = document.getElementById(`taskbar-${appName}`);
    if (taskbarApp) {
        taskbarApp.remove();
    }
}

function makeDraggable(windowElement) {
    const header = windowElement.querySelector('.window-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    
    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        
        if (e.target === header || header.contains(e.target)) {
            isDragging = true;
            windowElement.classList.add('dragging');
        }
    }
    
    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            
            xOffset = currentX;
            yOffset = currentY;
            
            windowElement.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
    }
    
    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        windowElement.classList.remove('dragging');
    }
}

function focusWindow(windowElement) {
    // Remove focus from other windows
    document.querySelectorAll('.app-window').forEach(win => {
        win.classList.remove('focused');
    });
    
    // Add focus to current window
    windowElement.classList.add('focused');
    windowElement.style.zIndex = ++windowZIndex;
}

// Add click handlers to focus windows and initialize draggable apps
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.app-window').forEach(window => {
        window.addEventListener('mousedown', () => {
            focusWindow(window);
        });
    });
    
    // Initialize draggable desktop apps
    initializeDraggableApps();
    initializeGridPositions();
});

async function fetchProjects() {
    try {
        const response = await fetch('js/projects.json');
        if (!response.ok) throw new Error('Failed to load projects');
        return await response.json();
    } catch (error) {
        console.error('Error fetching projects:', error);
        return { professionalProjects: [], personalProjects: [] };
    }
}

// Function to create a project element
function createProjectElement(project) {
    const projectElement = document.createElement('div');
    projectElement.className = 'project animated container-underline';
    
    // Create project title
    const titleElement = document.createElement('h2');
    titleElement.textContent = project.title;
    projectElement.appendChild(titleElement);
    
    // Create project date
    const dateElement = document.createElement('div');
    dateElement.className = 'project-date';
    dateElement.textContent = project.date;
    projectElement.appendChild(dateElement);
    
    // Create project links
    if (project.links && project.links.length > 0) {
        const linksElement = document.createElement('div');
        linksElement.className = 'project-links';
        
        project.links.forEach(link => {
            const linkElement = document.createElement('a');
            linkElement.href = link.url;
            linkElement.textContent = link.text;
            linkElement.target = "_blank";
            linkElement.rel = "noopener noreferrer"; // Security best practice
            linksElement.appendChild(linkElement);
        });
        
        projectElement.appendChild(linksElement);
    }
    
    // Create company tag if it exists
    if (project.company) {
        const companyTag = document.createElement('div');
        companyTag.className = 'company-tag';
        companyTag.textContent = project.company;
        projectElement.appendChild(companyTag);
    }
    
    // Create project description
    const descriptionElement = document.createElement('div');
    descriptionElement.className = 'project-description';
    descriptionElement.textContent = project.description;
    projectElement.appendChild(descriptionElement);
    
    // Create project technologies below description
    if (project.technologies && project.technologies.length > 0) {
        const techElement = document.createElement('div');
        techElement.className = 'project-tech';
        
        project.technologies.forEach(tech => {
            const techTag = document.createElement('span');
            techTag.className = 'tech-tag';
            techTag.textContent = tech;
            techElement.appendChild(techTag);
        });
        
        projectElement.appendChild(techElement);
    }
    
    return projectElement;
}

// Function to render projects
async function renderProjects() {
    try {
        const projectsData = await fetchProjects();
        const portfolioSection = document.getElementById('portfolio');
        
        if (!portfolioSection) {
            console.error('Portfolio section not found! Make sure there is an element with id="portfolio"');
            return;
        }
        
        // Ensure the element has the portfolio-section class
        portfolioSection.className = 'portfolio-section';
        
        // Clear existing content but don't add Projects header
        portfolioSection.innerHTML = '';
        
        // Create professional projects section
        if (projectsData.professionalProjects && projectsData.professionalProjects.length > 0) {
            const sectionHeader = document.createElement('div');
            sectionHeader.className = 'section-header container-underline';
            
            const profSectionTitle = document.createElement('h2');
            profSectionTitle.textContent = 'Projects';
            sectionHeader.appendChild(profSectionTitle);
            
            portfolioSection.appendChild(sectionHeader);
            
            const profPortfolio = document.createElement('div');
            profPortfolio.className = 'portfolio';
            
            projectsData.professionalProjects.forEach(project => {
                if (project && typeof project === 'object') {
                    const projectElement = createProjectElement(project);
                    if (projectElement) {
                        profPortfolio.appendChild(projectElement);
                    }
                }
            });
            
            portfolioSection.appendChild(profPortfolio);
        }
        
        // Create personal projects section as a single scrollable container
        if (projectsData.personalProjects && projectsData.personalProjects.length > 0) {
            // Create a single container for all personal projects
            const personalContainer = document.createElement('div');
            personalContainer.className = 'personal-projects-container';
            
            // Add the Projects header inside the container
            const projectsHeader = document.createElement('h2');
            projectsHeader.textContent = 'Projects';
            personalContainer.appendChild(projectsHeader);
            
            projectsData.personalProjects.forEach(project => {
                if (project && typeof project === 'object') {
                    const projectEl = createProjectElement(project);
                    if (projectEl) {
                        // Remove the standalone project box styling for personal projects
                        projectEl.style.boxShadow = 'none';
                        projectEl.style.borderRadius = '0';
                        projectEl.style.backgroundColor = 'transparent';
                        personalContainer.appendChild(projectEl);
                    }
                }
            });
            
            portfolioSection.appendChild(personalContainer);
        }
        
        // Apply staggered animation to project cards
        const animateElements = document.querySelectorAll('.animated');
        animateElements.forEach((element, index) => {
            if (element) {
                setTimeout(() => {
                    element.style.animationDelay = `${index * 0.1}s`;
                    element.style.opacity = 1;
                }, 100);
            }
        });
        
        // Set up underline animation on container interaction
        setupUnderlineAnimations();
    } catch (error) {
        console.error('Error rendering projects:', error);
    }
}

// Ensure DOM is fully loaded before running the script
function initializeProjects() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            renderProjects();
            applyUnderlineAnimationClass();
            setupUnderlineAnimations();
        });
    } else {
        // If DOMContentLoaded has already fired, run immediately
        renderProjects();
        applyUnderlineAnimationClass();
        setupUnderlineAnimations();
    }
}

// Function to apply underline animation class to containers
function applyUnderlineAnimationClass() {
    console.log('Applying container-underline class to containers');
    
    // Apply to intro container
    const introContainer = document.querySelector('.intro-container');
    if (introContainer) {
        introContainer.classList.add('container-underline');
        console.log('Added class to intro container');
    }
    
    // Apply to all project containers
    const projectContainers = document.querySelectorAll('.project');
    projectContainers.forEach((container, index) => {
        container.classList.add('container-underline');
        console.log('Added class to project container', index);
    });
    
    // Apply to experience items
    const experienceItems = document.querySelectorAll('.experience-item');
    experienceItems.forEach((item, index) => {
        item.classList.add('container-underline');
        console.log('Added class to experience item', index);
    });
    
    // Apply to education items
    const educationItems = document.querySelectorAll('.education');
    educationItems.forEach((item, index) => {
        item.classList.add('container-underline');
        console.log('Added class to education item', index);
    });
    
    // Apply to skill categories
    const skillCategories = document.querySelectorAll('.skill-category');
    skillCategories.forEach((category, index) => {
        category.classList.add('container-underline');
        console.log('Added class to skill category', index);
    });
    
    // Apply to personal projects container
    const personalContainer = document.querySelector('.personal-projects-container');
    if (personalContainer) {
        personalContainer.classList.add('container-underline');
        console.log('Added class to personal projects container');
    }
}

// Function to set up underline animations for containers
function setupUnderlineAnimations() {
    console.log('Setting up container underline animations');
    const containers = document.querySelectorAll('.container-underline');
    console.log('Found', containers.length, 'containers with container-underline class');
    
    // Add direct document event listeners to ensure we catch all interactions
    document.addEventListener('mouseover', function(event) {
        const container = event.target.closest('.container-underline');
        if (container) {
            console.log('Mouse over detected on container');
            container.classList.add('underline-active');
        }
    });
    
    document.addEventListener('mouseout', function(event) {
        const container = event.target.closest('.container-underline');
        if (container) {
            console.log('Mouse out detected on container');
            container.classList.remove('underline-active');
        }
    });
    
    // Also add individual element listeners for better reliability
    containers.forEach((container, index) => {
        console.log('Setting up container:', index);
        
        container.addEventListener('mouseenter', () => {
            console.log('Mouse enter on container:', index);
            container.classList.add('underline-active');
        });
        
        container.addEventListener('mouseleave', () => {
            console.log('Mouse leave on container:', index);
            container.classList.remove('underline-active');
        });
        
        // Add a visible marker to show the element has listeners
        container.dataset.hasUnderlineAnimation = 'true';
    });
    
    // Demonstrate the animation on the first container if available
    if (containers.length > 0) {
        const container = containers[0];
        setTimeout(() => {
            console.log('Demonstrating animation on first container');
            container.classList.add('underline-active');
            setTimeout(() => {
                container.classList.remove('underline-active');
            }, 1000);
        }, 1000);
    }
}

function handleTouchStart(e) {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    e.target.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
    if (!draggedApp) return;
    
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    document.dispatchEvent(mouseEvent);
    
    e.preventDefault(); // Prevent scrolling while dragging
}

function handleTouchEnd(e) {
    if (!draggedApp) return;
    
    let mouseEvent;
    if (e.changedTouches && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        mouseEvent = new MouseEvent('mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    } else {
        mouseEvent = new MouseEvent('mouseup', {});
    }
    
    document.dispatchEvent(mouseEvent);
}

// Initialize mobile-specific functionality
function initializeMobileSupport() {
    // Handle orientation changes
    window.addEventListener('resize', debounce(adjustForOrientation, 250));
    window.addEventListener('orientationchange', adjustForOrientation);
    
    // Add tap highlight for mobile
    const desktopApps = document.querySelectorAll('.desktop-app');
    desktopApps.forEach(app => {
        app.addEventListener('touchstart', function() {
            this.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
        });
        app.addEventListener('touchend', function() {
            setTimeout(() => {
                this.style.backgroundColor = '';
            }, 300);
        });
    });
    
    // Ensure WebGL canvas fits mobile screen
    adjustForOrientation();
}

// Helper function to handle resize/orientation changes
function adjustForOrientation() {
    // Close any open windows that might be positioned incorrectly
    const openAppWindows = document.querySelectorAll('.app-window[style*="display: block"]');
    
    if (window.innerWidth <= 480) {
        // On very small screens, ensure windows are properly sized
        openAppWindows.forEach(window => {
            window.style.width = '100%';
            window.style.maxHeight = '90vh';
            window.style.top = '5vh';
            window.style.left = '50%';
            window.style.transform = 'translateX(-50%)';
        });
    }
}

// Debounce function to limit rapid executions
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Canvas switching functionality for mobile vs desktop
function initializeCanvasSwitching() {
    const binaryTreesCanvas = document.getElementById('binary-trees-canvas');
    const graphCanvas = document.getElementById('graph-canvas');
    
    function switchCanvas() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Switch to graph canvas for mobile
            if (binaryTreesCanvas) {
                binaryTreesCanvas.classList.remove('active');
                if (window.BinaryTrees && window.BinaryTrees.active) {
                    window.BinaryTrees.stop();
                }
            }
            
            if (graphCanvas) {
                graphCanvas.classList.add('active');
                if (window.Graph && !window.Graph.active) {
                    window.Graph.init();
                }
            }
        } else {
            // Switch to binary trees canvas for desktop
            if (graphCanvas) {
                graphCanvas.classList.remove('active');
                if (window.Graph && window.Graph.active) {
                    window.Graph.stop();
                }
            }
            
            if (binaryTreesCanvas) {
                binaryTreesCanvas.classList.add('active');
                if (window.BinaryTrees && !window.BinaryTrees.active) {
                    window.BinaryTrees.init();
                }
            }
        }
    }
    
    // Initial switch
    switchCanvas();
    
    // Switch on resize with debounce
    window.addEventListener('resize', debounce(switchCanvas, 300));
}

// Initialize theme toggle functionality
function initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const moonIcon = '<i class="fas fa-moon"></i>';
    const sunIcon = '<i class="fas fa-sun"></i>';
    
    // Check if user preference is stored
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
        themeToggle.innerHTML = moonIcon;
    } else {
        body.classList.add('dark-mode');
        themeToggle.innerHTML = sunIcon;
    }
    
    // Handle toggle click
    themeToggle.addEventListener('click', () => {
        if (body.classList.contains('dark-mode')) {
            body.classList.remove('dark-mode');
            themeToggle.innerHTML = moonIcon;
            localStorage.setItem('theme', 'light');
        } else {
            body.classList.add('dark-mode');
            themeToggle.innerHTML = sunIcon;
            localStorage.setItem('theme', 'dark');
        }
    });
}

// Add simple theme switcher to mobile view - similar to Eric Chung's site
function initializeThemeSwitcher() {
    // Create theme switcher container
    const themeSwitcher = document.createElement('div');
    themeSwitcher.className = 'theme-switcher';
    
    // Create theme buttons
    const themes = ['light', 'dark', 'dusk', 'banana'];
    themes.forEach(theme => {
        const button = document.createElement('button');
        button.id = `theme-${theme}`;
        button.className = 'theme-btn';
        button.textContent = theme;
        button.addEventListener('click', () => switchTheme(theme));
        themeSwitcher.appendChild(button);
    });
    
    // Add to mobile intro container
    const mobileIntroContainer = document.querySelector('.mobile-intro-container');
    if (mobileIntroContainer) {
        mobileIntroContainer.appendChild(themeSwitcher);
    }
    
    // Check saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    switchTheme(savedTheme);
}

// Switch theme function
function switchTheme(theme) {
    const body = document.body;
    const themeButtons = document.querySelectorAll('.theme-btn');
    
    // Remove all theme classes
    body.classList.remove('light-theme', 'dark-theme', 'dusk-theme', 'banana-theme');
    
    // Remove active class from all buttons
    themeButtons.forEach(btn => btn.classList.remove('active'));
    
    // Set dark-mode class for backward compatibility
    if (theme === 'dark') {
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
    }
    
    // Add new theme class
    body.classList.add(`${theme}-theme`);
    
    // Set active button
    const activeButton = document.getElementById(`theme-${theme}`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Save preference
    localStorage.setItem('theme', theme);
}

// Initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDraggableApps();
    initializeGridPositions();
    initializeProjects();
    setupUnderlineAnimations();
    initializeMobileSupport();
    initializeCanvasSwitching();
    
    // Initialize the mobile navigation
    initializeMobileNav();
    
    // Initialize theme toggle
    initializeThemeToggle();
    
    // Add our new theme switcher
    initializeThemeSwitcher();
}); 