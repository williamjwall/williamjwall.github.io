async function fetchProjects() {
    try {
        const response = await fetch('js/projects.json');
        if (!response.ok) throw new Error('Failed to load projects');
        return await response.json();
    } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
    }
}

// Function to render projects
async function renderProjects() {
    const projects = await fetchProjects();
    const portfolioSection = document.querySelector('.portfolio');
    
    projects.forEach(project => {
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
                linksElement.appendChild(linkElement);
            });
            
            projectElement.appendChild(linksElement);
        }
        
        // Create project description
        const descriptionElement = document.createElement('div');
        descriptionElement.className = 'project-description';
        descriptionElement.textContent = project.description;
        projectElement.appendChild(descriptionElement);
        
        // Create project technologies
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
        
        // Add project to portfolio section
        portfolioSection.appendChild(projectElement);
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    await renderProjects();
}); 