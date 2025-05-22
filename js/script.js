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
    projectElement.className = 'project animated';
    
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
        
        // Clear existing content
        portfolioSection.innerHTML = '<h2>Projects</h2>';
        
        // Create professional projects section
        if (projectsData.professionalProjects && projectsData.professionalProjects.length > 0) {
            const profSectionTitle = document.createElement('h3');
            profSectionTitle.textContent = 'Professional Work';
            portfolioSection.appendChild(profSectionTitle);
            
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
            const personalSectionTitle = document.createElement('h3');
            personalSectionTitle.textContent = 'Personal Projects';
            portfolioSection.appendChild(personalSectionTitle);
            
            // Create a single container for all personal projects
            const personalContainer = document.createElement('div');
            personalContainer.className = 'personal-projects-container';
            
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
    } catch (error) {
        console.error('Error rendering projects:', error);
    }
}

// Ensure DOM is fully loaded before running the script
function initializeProjects() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderProjects);
    } else {
        // If DOMContentLoaded has already fired, run immediately
        renderProjects();
    }
}

// Initialize after a short delay to ensure all other scripts are loaded
setTimeout(initializeProjects, 100); 