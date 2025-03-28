// Enhanced blog system that maintains original styling
const blogSystem = {
    config: {
        postsDirectory: '/blog/posts/',
        manifestPath: 'posts-index.json',
        categoriesOrder: ['tech', 'notes', 'articles', 'hobbies', 'projects']
    },
    
    posts: [],
    
    // Initialize the blog system
    init: async function() {
        try {
            console.log("Initializing blog system...");
            
            // If we're on a post page, render the single post
            const postPath = this.getPostPathFromUrl();
            if (postPath) {
                console.log("Rendering single post:", postPath);
                await this.renderSinglePost(postPath);
                return;
            }
            
            // Otherwise load all posts for the index
            await this.loadAllPosts();
            this.renderPostsList();
        } catch (error) {
            console.error('Blog system initialization failed:', error);
            const container = document.getElementById('blog-posts-list') || document.getElementById('blog-content');
            if (container) {
                container.innerHTML = '<div class="error">Failed to load blog content. Please try again later.</div>';
            }
        }
    },
    
    // Get post path from URL if we're on a single post page
    getPostPathFromUrl: function() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('path') || urlParams.get('file'); // Support both formats
    },
    
    // Extract category from file path
    getCategoryFromPath: function(path) {
        const parts = path.split('/');
        return parts.length > 1 ? parts[0] : 'uncategorized';
    },
    
    // Format title from slug
    formatTitle: function(slug) {
        return slug
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    },
    
    // Load all posts from manifest
    loadAllPosts: async function() {
        try {
            console.log("Loading posts from manifest:", this.config.manifestPath);
            
            // Try to fetch the manifest file
            try {
                const response = await fetch(this.config.manifestPath);
                
                if (response.ok) {
                    const manifest = await response.json();
                    console.log("Manifest loaded successfully");
                    
                    if (manifest.posts && Array.isArray(manifest.posts)) {
                        this.posts = manifest.posts;
                        console.log(`Loaded ${this.posts.length} posts from manifest`);
                    } else {
                        console.warn("Manifest format incorrect, no posts array found");
                        this.posts = [];
                    }
                } else {
                    console.warn(`Failed to load manifest: ${response.status} ${response.statusText}`);
                    this.posts = [];
                }
            } catch (error) {
                console.warn("Error loading manifest:", error);
                this.posts = [];
            }
            
            // If no posts loaded from manifest, use hardcoded fallback
            if (this.posts.length === 0) {
                console.log("No posts found in manifest, using fallback data");
                this.posts = this.getFallbackPosts();
            }
            
            // Sort posts by date (newest first)
            if (this.posts.length > 0) {
                this.posts.sort((a, b) => {
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    return new Date(b.date) - new Date(a.date);
                });
            }
        } catch (error) {
            console.error('Failed to load posts:', error);
            this.posts = this.getFallbackPosts();
        }
    },
    
    // Return hardcoded fallback posts if manifest loading fails
    getFallbackPosts: function() {
        return [
            {
                path: 'tech/understanding-ai.md',
                title: 'Understanding AI',
                date: '2023-01-15',
                excerpt: 'An introduction to artificial intelligence and its applications.'
            },
            {
                path: 'notes/computational-biology.md',
                title: 'Computational Biology',
                date: '2023-02-10',
                excerpt: 'How computational methods are revolutionizing biology research.'
            },
            {
                path: 'articles/etl-pipelines.md',
                title: 'ETL Pipelines',
                date: '2023-03-20',
                excerpt: 'Building efficient Extract, Transform, Load pipelines for data processing.'
            },
            {
                path: 'hobbies/bike-packing.md',
                title: 'Bike Packing Adventures',
                date: '2023-04-05',
                excerpt: 'Exploring the great outdoors on two wheels.'
            },
            {
                path: 'hobbies/trips.md',
                title: 'Recent Trips',
                date: '2023-05-10',
                excerpt: 'Sharing my experiences from recent travels.'
            },
            {
                path: 'projects/glossary-map.md',
                title: 'Glossary Map',
                date: '2023-06-01',
                excerpt: 'A comprehensive glossary of terms used in my projects.'
            }
        ];
    },
    
    // Render the posts list for the blog index
    renderPostsList: function() {
        const container = document.getElementById('blog-posts-list');
        
        if (!container) {
            console.error('Blog posts container not found');
            return;
        }
        
        if (!this.posts || this.posts.length === 0) {
            container.innerHTML = '<div class="no-posts">No blog posts found.</div>';
            return;
        }
        
        // Group posts by category
        const categories = {};
        this.posts.forEach(post => {
            const category = this.getCategoryFromPath(post.path);
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(post);
        });
        
        // Create HTML with original styling
        let html = '';
        
        // First render categories in preferred order
        this.config.categoriesOrder.forEach(category => {
            if (categories[category] && categories[category].length > 0) {
                html += this.renderCategorySection(category, categories[category]);
                delete categories[category]; // Remove to avoid duplicates
            }
        });
        
        // Then add any remaining categories
        Object.keys(categories).forEach(category => {
            if (categories[category].length > 0) {
                html += this.renderCategorySection(category, categories[category]);
            }
        });
        
        container.innerHTML = html;
    },
    
    // Render a category section
    renderCategorySection: function(category, posts) {
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ');
        
        let html = `
            <li>
                <h3>${categoryName}</h3>
                <ul>
        `;
        
        posts.forEach(post => {
            html += `
                <li>
                    <a href="post.html?path=${post.path}">${post.title}</a>
                </li>
            `;
        });
        
        html += `
                </ul>
            </li>
        `;
        
        return html;
    },
    
    // Render a single post
    renderSinglePost: async function(postPath) {
        try {
            console.log("Loading post content from:", this.config.postsDirectory + postPath);
            const response = await fetch(this.config.postsDirectory + postPath);
            if (!response.ok) {
                throw new Error(`Failed to load post: ${response.status} ${response.statusText}`);
            }
            
            const markdownText = await response.text();
            
            // Update page title based on file name
            const fileName = postPath.split('/').pop().replace('.md', '');
            const postTitle = this.formatTitle(fileName);
            document.title = `${postTitle} | Will Wall's Blog`;
            
            // Find the content container
            const contentContainer = document.getElementById('blog-post-content');
            
            if (!contentContainer) {
                console.error('Blog post content container not found');
                return;
            }
            
            // Process the markdown with enhanced styling
            if (window.marked) {
                // Configure marked.js for better styling
                marked.setOptions({
                    highlight: function(code, lang) {
                        if (window.hljs) {
                            try {
                                if (lang && hljs.getLanguage(lang)) {
                                    return hljs.highlight(lang, code).value;
                                } else {
                                    return hljs.highlightAuto(code).value;
                                }
                            } catch (e) {
                                console.error('Highlighting error:', e);
                            }
                        }
                        return code; // Fallback to plain code
                    },
                    breaks: true,
                    gfm: true
                });
                
                // Parse the front matter if it exists
                let title = postTitle;
                let date = null;
                let author = null;
                let tags = [];
                
                const frontMatterMatch = markdownText.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
                let contentToRender = markdownText;
                
                if (frontMatterMatch) {
                    const frontMatter = frontMatterMatch[1];
                    contentToRender = frontMatterMatch[2];
                    
                    // Extract metadata from front matter
                    const titleMatch = frontMatter.match(/title:\s*(.*)/);
                    if (titleMatch) title = titleMatch[1].trim();
                    
                    const dateMatch = frontMatter.match(/date:\s*(.*)/);
                    if (dateMatch) date = new Date(dateMatch[1].trim());
                    
                    const authorMatch = frontMatter.match(/author:\s*(.*)/);
                    if (authorMatch) author = authorMatch[1].trim();
                    
                    const tagsMatch = frontMatter.match(/tags:\s*\[(.*)\]/);
                    if (tagsMatch) {
                        tags = tagsMatch[1].split(',').map(tag => tag.trim());
                    }
                }
                
                // Create the post HTML with enhanced styling
                contentContainer.innerHTML = `
                    <article class="blog-post">
                        <h1>${title}</h1>
                        
                        <div class="post-meta">
                            ${date ? `<time datetime="${date.toISOString()}">${date.toLocaleDateString()}</time>` : ''}
                            ${author ? `<span class="author">by ${author}</span>` : ''}
                        </div>
                        
                        ${tags.length > 0 ? `
                        <div class="tags">
                            ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                        ` : ''}
                        
                        <div class="post-content">
                            ${marked.parse(contentToRender)}
                        </div>
                    </article>
                `;
                
                // Add syntax highlighting if available
                if (window.hljs) {
                    document.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightBlock(block);
                    });
                }
            } else {
                // Simple fallback if marked.js is not available
                contentContainer.innerHTML = `
                    <article class="blog-post">
                        <h1>${postTitle}</h1>
                        <div class="post-content">
                            <pre>${markdownText}</pre>
                        </div>
                    </article>
                `;
            }
            
            // Remove the entire canvas animation code section from renderSinglePost
            if (document.getElementById('graph-canvas')) {
                document.getElementById('graph-canvas').style.display = 'none';
            }
            
        } catch (error) {
            console.error('Failed to render post:', error);
            const contentContainer = document.getElementById('blog-post-content');
            
            if (contentContainer) {
                contentContainer.innerHTML = `
                    <div class="error">
                        <h2>Error Loading Post</h2>
                        <p>Failed to load the requested post: ${error.message}</p>
                        <p><a href="index.html">Return to blog index</a></p>
                    </div>
                `;
            }
        }
    }
};

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    blogSystem.init();
});