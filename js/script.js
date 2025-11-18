// Desktop App System
let openWindows = new Set();
let windowZIndex = 1000;

// Draggable desktop apps functionality
let draggedApp = null;
let dragOffset = { x: 0, y: 0 };
let isDraggingApp = false;
let dragStartTime = 0;

const CLICK_GUARD_DELAY = 350;
const actionCooldowns = new Map();
let interactionLockUntil = 0;
const THEME_STORAGE_KEY = 'preferredTheme';
const DEFAULT_THEME = 'light';

document.documentElement.setAttribute('data-theme', DEFAULT_THEME);

function getStoredTheme() {
    try {
        return localStorage.getItem(THEME_STORAGE_KEY);
    } catch (error) {
        console.warn('Unable to access theme preference storage:', error);
        return null;
    }
}

function storeTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
        console.warn('Unable to persist theme preference:', error);
    }
}

function updateThemeToggle(theme) {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) {
        return;
    }

    const icon = toggle.querySelector('i');
    const isDark = theme === 'dark';

    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.setAttribute('data-theme', theme);

    if (icon) {
        icon.classList.remove('fa-moon', 'fa-sun');
        icon.classList.add(isDark ? 'fa-sun' : 'fa-moon');
    }
}

function applyTheme(theme, { persist = true } = {}) {
    // Force light mode only
    const normalizedTheme = 'light';
    const body = document.body;
    if (!body) {
        return;
    }

    body.classList.remove('light-theme', 'dark-theme');
    body.classList.add(`${normalizedTheme}-theme`);
    document.documentElement.setAttribute('data-theme', normalizedTheme);
    updateThemeToggle(normalizedTheme);

    if (persist) {
        storeTheme(normalizedTheme);
    }

    document.dispatchEvent(new CustomEvent('themechange', {
        detail: { theme: normalizedTheme }
    }));
}

function shouldThrottleAction(key, delay = CLICK_GUARD_DELAY) {
    const now = performance.now ? performance.now() : Date.now();
    const lastTime = actionCooldowns.get(key) || 0;
    if (now - lastTime < delay) {
        return true;
    }
    actionCooldowns.set(key, now);
    return false;
}

function addDoubleClickGuard(element) {
    if (!element || element.dataset.doubleClickGuard === 'true') {
        return;
    }

    let lastClickTime = 0;

    const handler = (event) => {
        const now = performance.now ? performance.now() : Date.now();
        if (now - lastClickTime < CLICK_GUARD_DELAY) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }
        lastClickTime = now;
    };

    element.addEventListener('click', handler, true);
    element.addEventListener('dblclick', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
    }, true);

    element.dataset.doubleClickGuard = 'true';
}

function lockInteractions(delay = CLICK_GUARD_DELAY) {
    const now = performance.now ? performance.now() : Date.now();
    interactionLockUntil = now + delay;
}

function isInteractionLocked() {
    const now = performance.now ? performance.now() : Date.now();
    return now < interactionLockUntil;
}

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
        if (app.dataset.draggableInitialized === 'true') {
            return;
        }

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
        
        // Simple tap handler as fallback for mobile
        let touchStartTime = 0;
        let touchMoved = false;
        
        app.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            touchMoved = false;
        }, { passive: true });
        
        app.addEventListener('touchmove', (e) => {
            touchMoved = true;
        }, { passive: true });
        
        app.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;
            
            // If it was a quick tap without movement, open the app
            if (!touchMoved && touchDuration < 300) {
                e.preventDefault();
                const appName = e.currentTarget.getAttribute('data-app');
                if (appName && !isInteractionLocked()) {
                    console.log('Simple tap opening app:', appName);
                    openApp(appName);
                }
            }
        }, { passive: false });

        addDoubleClickGuard(app);
        app.dataset.draggableInitialized = 'true';
    });
    
    document.addEventListener('mousemove', dragApp);
    document.addEventListener('mouseup', endDragApp);
}

function handleAppClick(e) {
    if (e.detail && e.detail > 1) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    if (isInteractionLocked()) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

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

function initializeButtonGuards() {
    const controlButtons = document.querySelectorAll('.window-controls button');
    controlButtons.forEach((button) => {
        addDoubleClickGuard(button);
    });
}

function resetAppStyle(app) {
    // Remove all inline styles
    app.style.cssText = '';
}

function openApp(appName) {
    if (!appName || shouldThrottleAction(`open:${appName}`)) {
        return;
    }

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
    if (!appName || shouldThrottleAction(`close:${appName}`)) {
        return;
    }

    const windowId = `${appName}-window`;
    const window = document.getElementById(windowId);
    
    if (window) {
        window.style.display = 'none';
        openWindows.delete(appName);
        removeFromTaskbar(appName);
        lockInteractions();
    }
}

function minimizeApp(appName) {
    if (!appName || shouldThrottleAction(`minimize:${appName}`)) {
        return;
    }

    const windowId = `${appName}-window`;
    const window = document.getElementById(windowId);
    
    if (window) {
        window.style.display = 'none';
        addToTaskbar(appName);
        lockInteractions();
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
        portfolio: 'Projects',
        experience: 'Experience',
        education: 'Education',
        skills: 'Skills',
        contact: 'Contact'
    };
    
    taskbarApp.innerHTML = `<img src="${icons[appName]}" alt="${titles[appName]}" class="taskbar-icon">${titles[appName]}`;
    taskbarApps.appendChild(taskbarApp);
    addDoubleClickGuard(taskbarApp);
}

function removeFromTaskbar(appName) {
    const taskbarApp = document.getElementById(`taskbar-${appName}`);
    if (taskbarApp) {
        taskbarApp.remove();
    }
}

function makeDraggable(windowElement) {
    if (!windowElement || windowElement.dataset.draggableInitialized === 'true') {
        return;
    }

    windowElement.dataset.draggableInitialized = 'true';
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
    
    // Add backdrop click handler to close windows
    document.addEventListener('click', (e) => {
        // Check if click is outside any open window
        const isInsideWindow = e.target.closest('.app-window');
        const isDesktopApp = e.target.closest('.desktop-app');
        const isTaskbarApp = e.target.closest('.taskbar-app');
        const isWindowControl = e.target.closest('.window-controls');
        
        // Only close if clicking outside and not on an app, taskbar, or window controls
        if (!isInsideWindow && !isDesktopApp && !isTaskbarApp && !isWindowControl && openWindows.size > 0) {
            console.log('Backdrop click detected, closing windows');
            // Close all open windows
            openWindows.forEach(appName => {
                closeApp(appName);
            });
        }
    });
    
    // Add touch handler for mobile devices (backdrop close only)
    document.addEventListener('touchstart', (e) => {
        // Store touch start for backdrop detection
        window.touchStartTarget = e.target;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
        // Only handle backdrop touches, don't interfere with app interactions
        const touchStartTarget = window.touchStartTarget;
        const touchEndTarget = e.target;
        
        // Only proceed if touch started and ended on the same non-interactive element
        if (touchStartTarget === touchEndTarget) {
            // Check if touch is outside any open window
            const isInsideWindow = touchEndTarget.closest('.app-window');
            const isDesktopApp = touchEndTarget.closest('.desktop-app');
            const isTaskbarApp = touchEndTarget.closest('.taskbar-app');
            const isWindowControl = touchEndTarget.closest('.window-controls');
            const isButton = touchEndTarget.closest('button');
            const isLink = touchEndTarget.closest('a');
            
            // Only close if touching backdrop (body or background elements)
            const isBackdrop = touchEndTarget === document.body || 
                              touchEndTarget.classList.contains('container') ||
                              touchEndTarget.classList.contains('intro') ||
                              touchEndTarget.classList.contains('desktop');
            
            if (isBackdrop && !isInsideWindow && !isDesktopApp && !isTaskbarApp && 
                !isWindowControl && !isButton && !isLink && openWindows.size > 0) {
                console.log('Backdrop touch detected, closing windows');
                // Small delay to ensure touch events complete
                setTimeout(() => {
                    openWindows.forEach(appName => {
                        closeApp(appName);
                    });
                }, 100);
            }
        }
        
        // Clear touch start target
        window.touchStartTarget = null;
    }, { passive: true });
    
    // Initialize draggable desktop apps
    initializeDraggableApps();
    initializeGridPositions();
    initializeButtonGuards();
    initializeProjects();
    // Theme toggle disabled - light mode only
    // initializeThemeToggle();
    applyTheme('light', { persist: false });
    initializeMobileSupport();
    initializeCanvasSwitching();
    initializeMobileNav();
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
        
        // Debug logging
        console.log('Projects data:', projectsData);
        console.log('Personal projects count:', projectsData.personalProjects ? projectsData.personalProjects.length : 0);
        
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
            console.log('Rendering personal projects section');
            
            // Create a single container for all personal projects
            const personalContainer = document.createElement('div');
            personalContainer.className = 'personal-projects-container';
            
            // Add the Projects header inside the container
            const projectsHeader = document.createElement('h2');
            projectsHeader.textContent = 'Projects';
            personalContainer.appendChild(projectsHeader);
            
            projectsData.personalProjects.forEach((project, index) => {
                console.log(`Processing project ${index}:`, project);
                if (project && typeof project === 'object') {
                    const projectEl = createProjectElement(project);
                    if (projectEl) {
                        console.log(`Created project element for: ${project.title}`);
                        // Remove the standalone project box styling for personal projects
                        projectEl.style.boxShadow = 'none';
                        projectEl.style.borderRadius = '0';
                        projectEl.style.backgroundColor = 'transparent';
                        personalContainer.appendChild(projectEl);
                    }
                }
            });
            
            console.log('Appending personal container to portfolio section');
            portfolioSection.appendChild(personalContainer);
        } else {
            console.log('No personal projects to render');
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
    // If we're dragging, handle the drag end
    if (draggedApp) {
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
        return;
    }
    
    // If not dragging, this might be a simple tap to open an app
    if (!isDraggingApp && (Date.now() - dragStartTime) <= 200) {
        const appName = e.currentTarget.getAttribute('data-app');
        if (appName && !isInteractionLocked()) {
            console.log('Touch end opening app:', appName);
            openApp(appName);
        }
    }
}

// Initialize mobile-specific functionality
function initializeMobileSupport() {
    // Handle orientation changes and resize events
    window.addEventListener('resize', debounce(adjustForOrientation, 250));
    window.addEventListener('orientationchange', () => {
        setTimeout(adjustForOrientation, 300);
    });
    
    // Add visual feedback for mobile app interactions
    const desktopApps = document.querySelectorAll('.desktop-app');
    desktopApps.forEach(app => {
        app.addEventListener('touchstart', function(e) {
            this.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
            this.style.transform = 'scale(0.95)';
        }, { passive: true });
        
        app.addEventListener('touchend', function(e) {
            setTimeout(() => {
                this.style.backgroundColor = '';
                this.style.transform = '';
            }, 150);
        }, { passive: true });
        
        // Prevent context menu on long touch
        app.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });
    });
    
    // Optimize viewport for mobile
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
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
    
    console.log('Initializing canvas switching...');
    console.log('Binary trees canvas found:', !!binaryTreesCanvas);
    console.log('Graph canvas found:', !!graphCanvas);
    console.log('Current window width:', window.innerWidth);
    
    function isMobileDevice() {
        return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    function switchCanvas() {
        const isMobile = isMobileDevice();
        console.log('Switching canvas - isMobile:', isMobile);
        
        if (isMobile) {
            // Mobile: Hide all canvas animations
            console.log('Mobile detected - disabling all canvas animations');
            
            if (binaryTreesCanvas) {
                binaryTreesCanvas.style.display = 'none';
                if (window.BinaryTrees && window.BinaryTrees.active) {
                    window.BinaryTrees.stop();
                    window.BinaryTrees.clearMemory();
                }
            }
            
            if (graphCanvas) {
                graphCanvas.style.display = 'none';
                if (window.Graph && window.Graph.active) {
                    window.Graph.stop();
                    window.Graph.clearMemory();
                }
            }
        } else {
            // Desktop: Show binary trees animation only
            console.log('Desktop detected - enabling binary trees animation');
            
            // Disable graph animation on desktop
            if (graphCanvas) {
                graphCanvas.style.display = 'none';
                if (window.Graph && window.Graph.active) {
                    window.Graph.stop();
                    window.Graph.clearMemory();
                }
            }
            
            // Enable binary trees animation
            if (binaryTreesCanvas) {
                console.log('Enabling binary trees canvas');
                binaryTreesCanvas.style.display = 'block';
                
                // Initialize binary trees if the script is loaded
                if (window.BinaryTrees) {
                    console.log('BinaryTrees object found, active status:', window.BinaryTrees.active);
                    if (!window.BinaryTrees.active) {
                        console.log('Initializing binary trees...');
                        try {
                            window.BinaryTrees.init();
                        } catch (error) {
                            console.error('Error initializing binary trees:', error);
                        }
                    }
                } else {
                    console.log('BinaryTrees object not available yet - will retry');
                    // Retry after a short delay
                    setTimeout(() => {
                        if (window.BinaryTrees && !window.BinaryTrees.active) {
                            try {
                                window.BinaryTrees.init();
                            } catch (error) {
                                console.error('Error initializing binary trees on retry:', error);
                            }
                        }
                    }, 1000);
                }
            }
        }
    }
    
    // Initial switch
    console.log('Performing initial canvas switch...');
    switchCanvas();
    
    // Additional initialization for desktop
    setTimeout(() => {
        console.log('Running delayed initialization check...');
        if (!isMobileDevice()) {
            if (binaryTreesCanvas && window.BinaryTrees && !window.BinaryTrees.active) {
                console.log('Desktop delayed initialization of binary trees...');
                try {
                    window.BinaryTrees.init();
                } catch (error) {
                    console.error('Error in delayed binary trees initialization:', error);
                }
            }
        }
    }, 1500);
    
    // Switch on resize with debounce
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            console.log('Resize detected, switching canvas...');
            switchCanvas();
        }, 300);
    });
    
    // Handle orientation change for mobile devices
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            console.log('Orientation change detected, switching canvas...');
            switchCanvas();
        }, 500);
    });
}

// Initialize theme toggle functionality
function initializeThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    const storedTheme = getStoredTheme();
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (prefersDark ? 'dark' : DEFAULT_THEME);

    applyTheme(initialTheme, { persist: false });

    if (!toggle) {
        return;
    }

    addDoubleClickGuard(toggle);

    toggle.addEventListener('click', () => {
        const nextTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
        applyTheme(nextTheme);
    });

    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const mediaListener = (event) => {
            if (!getStoredTheme()) {
                applyTheme(event.matches ? 'dark' : 'light', { persist: false });
            }
        };

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', mediaListener);
        } else if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(mediaListener);
        }
    }
}
