// Project data
const projects = [
    {
        title: "Web Application Framework",
        date: "Jan. 2024 - Present",
        links: [
            { text: "Details", url: "#details-1" },
            { text: "Website", url: "https://example.com/project1" },
            { text: "Source Code", url: "https://github.com/yourusername/project1" }
        ],
        description: "A full-stack web application framework built with React, Node.js, and MongoDB. Features include user authentication, real-time updates, and a responsive design."
    },
    {
        title: "Machine Learning Visualization Tool",
        date: "Oct. 2023 - Dec. 2023",
        links: [
            { text: "Website", url: "https://example.com/project2" },
            { text: "Source Code", url: "https://github.com/yourusername/project2" }
        ],
        description: "An interactive tool for visualizing machine learning algorithms. Users can upload datasets, select algorithms, and see the results in real-time with customizable visualizations."
    },
    {
        title: "Mobile App for Fitness Tracking",
        date: "Jul. 2023 - Sept. 2023",
        links: [
            { text: "Details", url: "#details-3" },
            { text: "Demo Video", url: "https://youtube.com/watch?v=example" }
        ],
        description: "A cross-platform mobile application built with Flutter for tracking fitness activities. Includes GPS tracking, workout planning, and progress visualization."
    },
    {
        title: "Browser Extension for Productivity",
        date: "May 2023 - Jun. 2023",
        links: [
            { text: "Chrome Store", url: "https://chrome.google.com/webstore/example" },
            { text: "Source Code", url: "https://github.com/yourusername/project4" }
        ],
        description: "A browser extension that helps users stay focused by blocking distracting websites and providing productivity metrics. Built with JavaScript and the Chrome Extension API."
    },
    {
        title: "Data Visualization Dashboard",
        date: "Feb. 2023 - Apr. 2023",
        links: [
            { text: "Website", url: "https://example.com/project5" },
            { text: "Source Code", url: "https://github.com/yourusername/project5" }
        ],
        description: "An interactive dashboard for visualizing complex datasets. Built with D3.js and React, it provides customizable charts, filters, and export options."
    }
];

// Function to render projects
function renderProjects() {
    const portfolioSection = document.querySelector('.portfolio');
    
    projects.forEach(project => {
        const projectElement = document.createElement('div');
        projectElement.className = 'project';
        
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
                linksElement.appendChild(linkElement);
            });
            
            projectElement.appendChild(linksElement);
        }
        
        // Create project description
        const descriptionElement = document.createElement('div');
        descriptionElement.className = 'project-description';
        descriptionElement.textContent = project.description;
        projectElement.appendChild(descriptionElement);
        
        // Add project to portfolio section
        portfolioSection.appendChild(projectElement);
    });
}

// Dark mode toggle
function setupDarkMode() {
    // Check for saved user preference
    const darkMode = localStorage.getItem('darkMode') === 'enabled';
    
    // Add dark mode toggle button to header
    const nav = document.querySelector('nav ul');
    const darkModeToggle = document.createElement('li');
    darkModeToggle.innerHTML = `<button id="dark-mode-toggle"><i class="fas fa-moon"></i></button>`;
    nav.appendChild(darkModeToggle);
    
    // Set initial state
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // Toggle dark mode
    document.getElementById('dark-mode-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
            document.getElementById('dark-mode-toggle').innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            localStorage.setItem('darkMode', 'disabled');
            document.getElementById('dark-mode-toggle').innerHTML = '<i class="fas fa-moon"></i>';
        }
    });
}

// Update the initialization
document.addEventListener('DOMContentLoaded', () => {
    renderProjects();
    setupDarkMode();
}); 