// Project data
const projects = [
    {
        title: "Catalog Enrichment",
        company: "returnPro",
        date: "2024",
        links: [
            { text: "Details", url: "projects/catalog-enrichment.html" }
        ],
        description: "Developed automated pipelines leveraging RAG/LLMs for product taxonomy classification across multiple marketplaces. Designed and optimized ETL processes in Databricks, with Snowflake as the data warehouse, deployed on Azure for real-time processing.",
        technologies: ["Python", "Databricks", "Snowflake", "Azure", "LLMs"]
    },
    {
        title: "PersonalBlog",
        date: "2024",
        links: [
            { text: "Visit Blog", url: "blog/index.html" }
        ],
        description: "A personal blog where I share everything I enjoy learning and doing.",
        technologies: ["HTML", "CSS", "JavaScript"]
    },
    {
        title: "Hydroponic Farm",
        date: "2023",
        links: [
            { text: "View Project", url: "#" }
        ],
        description: "For a small hydroponic farm in Montreal. Cleaned two years of historical data to perform a regression on past water conditions and plant locations to predict weight and health. Designed an automated relational database and set up a MySQL instance on Google Cloud for future integration with AppSheet.",
        technologies: ["Python", "SKlearn", "Pandas", "Seaborn", "GCP", "MySQL"]
    }
    
];

// Function to render projects
function renderProjects() {
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
document.addEventListener('DOMContentLoaded', () => {
    renderProjects();
}); 