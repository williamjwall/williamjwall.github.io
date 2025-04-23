// Simplified blog system
const blogSystem = {
    config: {
        postsDirectory: '/blog/posts/',
        manifestPath: '/blog/manifest.json',
        categoriesOrder: ['notes', 'random','projects'],
        baseUrl: '' // Will be dynamically set
    },
    
    posts: [],
    
    // Initialize the blog system
    init: async function() {
        console.log("Initializing blog system...");
        
        // Determine base URL for GitHub Pages
        this.setBaseUrl();
        
        try {
            // Check if we're on a post page or index page
            const postPath = this.getPostPathFromUrl();
            
            if (postPath) {
                await this.renderSinglePost(postPath);
            } else {
                await this.loadPosts();
                this.renderPostsList();
            }
        } catch (error) {
            console.error('Blog system error:', error);
            this.showError('Failed to load blog content. Please try again later.');
        }
    },
    
    // Set the base URL based on the current location
    setBaseUrl: function() {
        // For GitHub Pages, the format is typically username.github.io/repo-name/
        const pathSegments = window.location.pathname.split('/');
        
        // Check if we're on GitHub Pages (username.github.io/repo-name/)
        if (window.location.hostname.endsWith('github.io') && pathSegments.length > 1) {
            // The first segment after the domain will be the repository name
            const repoName = pathSegments[1];
            this.config.baseUrl = '/' + repoName;
            console.log(`Running on GitHub Pages with base URL: ${this.config.baseUrl}`);
            
            // Update paths to include the base URL - ensure lowercase for consistency
            if(repoName === 'blog') {
                this.config.postsDirectory = `${this.config.baseUrl}/posts/`.toLowerCase();
                this.config.manifestPath = `${this.config.baseUrl}/manifest.json`.toLowerCase();
            } else {
                this.config.postsDirectory = `${this.config.baseUrl}/blog/posts/`.toLowerCase();
                this.config.manifestPath = `${this.config.baseUrl}/blog/manifest.json`.toLowerCase();
            }
        } else {
            console.log('Running on standard server, using root-relative paths');
            this.config.baseUrl = '';
        }
    },
    
    // Show error message in appropriate container
    showError: function(message) {
        const container = document.getElementById('blog-posts-list') || 
                          document.getElementById('blog-post-content') || 
                          document.getElementById('blog-content');
        
        if (container) {
            container.innerHTML = `<div class="error">${message}</div>`;
        }
    },
    
    // Get post path from URL if we're on a single post page
    getPostPathFromUrl: function() {
        const postPath = new URLSearchParams(window.location.search).get('post');
        return postPath ? `${this.config.postsDirectory}${postPath}` : null;
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
    
    // Load posts from manifest with improved error handling
    loadPosts: async function() {
        console.log("Loading posts from manifest:", this.config.manifestPath);
        
        try {
            // Update possible paths to include base URL
            const possiblePaths = [
                this.config.manifestPath,
                'manifest.json',
                `${this.config.baseUrl}/manifest.json`,
                `${this.config.baseUrl}/blog/manifest.json`,
                'blog/manifest.json',
                '/blog/manifest.json',
                '/manifest.json',
                '../manifest.json',
                './manifest.json'
            ];
            
            // Log all possible paths we'll try
            console.log("Will try these manifest paths:", possiblePaths);
            
            // Try all possible paths
            let manifestData = null;
            let loadedPath = null;
            
            for (const path of possiblePaths) {
                try {
                    console.log(`Trying path: ${path}`);
                    const response = await fetch(path);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log(`Successfully found manifest at: ${path}`, data);
                        manifestData = data;
                        loadedPath = path;
                        break;
                    } else {
                        console.log(`Path ${path} returned status: ${response.status}`);
                    }
                } catch (e) {
                    console.log(`Error fetching from ${path}:`, e.message);
                }
            }
            
            if (manifestData && manifestData.posts && Array.isArray(manifestData.posts)) {
                this.posts = manifestData.posts;
                // Log the first few posts to verify their structure
                console.log(`Loaded ${this.posts.length} posts from manifest:`, 
                            this.posts.slice(0, 3));
            } else {
                console.warn("No valid posts found in manifest. Structure:", manifestData);
                this.posts = [];
            }
            
            // Sort posts by date (newest first)
            this.posts.sort((a, b) => {
                if (!a.date) return 1;
                if (!b.date) return -1;
                return new Date(b.date) - new Date(a.date);
            });
        } catch (error) {
            console.error('Failed to load posts:', error);
            this.posts = [];
        }
    },
    
    // Render the posts list for the blog index
    renderPostsList: function() {
        const container = document.getElementById('blog-posts-list');
        
        if (!container) {
            return console.error('Blog posts container not found');
        }
        
        if (this.posts.length === 0) {
            return container.innerHTML = '<div class="no-posts">No blog posts found here man.</div>';
        }
        
        // Create hierarchical structure for categories/subcategories
        const categoriesTree = this.buildCategoriesTree();
        
        // Build HTML for categories in order
        let html = '';
        
        // First render preferred categories
        this.config.categoriesOrder.forEach(category => {
            if (categoriesTree[category]) {
                html += this.renderCategorySection(category, categoriesTree[category]);
                delete categoriesTree[category];
            }
        });
        
        // Then render any remaining categories
        Object.entries(categoriesTree).forEach(([category, categoryData]) => {
            html += this.renderCategorySection(category, categoryData);
        });
        
        container.innerHTML = html;
        
        // Add event listeners for accordion functionality
        this.initAccordion();
    },
    
    // Build hierarchical category tree from post paths
    buildCategoriesTree: function() {
        const tree = {};
        
        this.posts.forEach(post => {
            // Split path into parts (e.g., "notes/math/linear algebra.md" -> ["notes", "math", "linear algebra.md"])
            const pathParts = post.path.split('/');
            const mainCategory = pathParts[0];
            
            // Initialize category if not exists
            if (!tree[mainCategory]) {
                tree[mainCategory] = {
                    subcategories: {},
                    posts: []
                };
            }
            
            // If there's a subcategory
            if (pathParts.length > 2) {
                // Handle subcategories, going as deep as needed
                let currentLevel = tree[mainCategory];
                
                // Process all parts except the first (main category) and last (filename)
                for (let i = 1; i < pathParts.length - 1; i++) {
                    const subcat = pathParts[i];
                    if (!currentLevel.subcategories[subcat]) {
                        currentLevel.subcategories[subcat] = {
                            subcategories: {},
                            posts: []
                        };
                    }
                    currentLevel = currentLevel.subcategories[subcat];
                }
                
                // Add post to the deepest level
                currentLevel.posts.push(post);
            } else {
                // No subcategory, add directly to main category
                tree[mainCategory].posts.push(post);
            }
        });
        
        return tree;
    },
    
    // Render a category section with support for subcategories
    renderCategorySection: function(category, categoryData) {
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ');
        let html = `
            <li class="category">
                <h3>${categoryName}</h3>
                <ul class="posts-list">
        `;
        
        // Add direct posts under this category
        if (categoryData.posts && categoryData.posts.length > 0) {
            html += categoryData.posts.map(post => `
                <li class="post-item" style="width: auto; display: inline-block; margin-right: 10px; margin-bottom: 8px;">
                    <a href="${this.config.baseUrl}/blog/post.html?post=${post.path.toLowerCase()}" class="post-link">${post.title}</a>
                </li>
            `).join('');
        }
        
        // Add subcategories with accordion style
        if (categoryData.subcategories && Object.keys(categoryData.subcategories).length > 0) {
            Object.entries(categoryData.subcategories).forEach(([subcat, subcatData]) => {
                const subcatName = subcat.charAt(0).toUpperCase() + subcat.slice(1).replace('-', ' ');
                
                html += `
                    <li class="subcategory">
                        <div class="subcategory-header" data-toggle="accordion">
                            <span class="toggle-indicator">▶</span> ${subcatName}
                        </div>
                        <ul class="subcategory-posts" style="display: none;">
                `;
                
                // Add posts in this subcategory
                html += subcatData.posts.map(post => `
                    <li class="post-item" style="width: auto; display: inline-block; margin-right: 10px; margin-bottom: 8px;">
                        <a href="${this.config.baseUrl}/blog/post.html?post=${post.path.toLowerCase()}" class="post-link">${post.title}</a>
                    </li>
                `).join('');
                
                // Recursively add nested subcategories if any
                if (Object.keys(subcatData.subcategories).length > 0) {
                    Object.entries(subcatData.subcategories).forEach(([nestedSubcat, nestedData]) => {
                        html += this.renderNestedSubcategory(nestedSubcat, nestedData);
                    });
                }
                
                html += `
                        </ul>
                    </li>
                `;
            });
        }
        
        html += `
                </ul>
            </li>
        `;
        
        return html;
    },
    
    // Render nested subcategories recursively
    renderNestedSubcategory: function(subcategory, subcatData, level = 1) {
        const subcatName = subcategory.charAt(0).toUpperCase() + subcategory.slice(1).replace('-', ' ');
        const padding = level * 10; // Increase padding for deeper levels
        
        let html = `
            <li class="subcategory nested-level-${level}">
                <div class="subcategory-header" data-toggle="accordion" style="padding-left: ${padding}px;">
                    <span class="toggle-indicator">▶</span> ${subcatName}
                </div>
                <ul class="subcategory-posts" style="display: none;">
        `;
        
        // Add posts
        html += subcatData.posts.map(post => `
            <li class="post-item" style="width: auto; display: inline-block; margin-right: 10px; margin-bottom: 8px;">
                <a href="${this.config.baseUrl}/blog/post.html?post=${post.path.toLowerCase()}" class="post-link">${post.title}</a>
            </li>
        `).join('');
        
        // Add nested subcategories recursively
        if (Object.keys(subcatData.subcategories).length > 0) {
            Object.entries(subcatData.subcategories).forEach(([nestedSubcat, nestedData]) => {
                html += this.renderNestedSubcategory(nestedSubcat, nestedData, level + 1);
            });
        }
        
        html += `
                </ul>
            </li>
        `;
        
        return html;
    },
    
    // Initialize accordion functionality
    initAccordion: function() {
        document.querySelectorAll('[data-toggle="accordion"]').forEach(header => {
            header.addEventListener('click', function() {
                // Toggle visibility of subcategory posts
                const subcategoryPosts = this.nextElementSibling;
                const isExpanded = subcategoryPosts.style.display !== 'none';
                
                // Update toggle indicator
                const indicator = this.querySelector('.toggle-indicator');
                indicator.textContent = isExpanded ? '▶' : '▼';
                
                // Toggle the subcategory content
                subcategoryPosts.style.display = isExpanded ? 'none' : 'block';
            });
        });
    },
    
    // Render a single post with improved container detection
    renderSinglePost: async function(postPath) {
        console.log("Loading post content from original path:", postPath);
        
        // Try multiple container IDs that might exist in post.html
        const contentContainer = 
            document.getElementById('blog-post-content') || 
            document.getElementById('post-content') || 
            document.getElementById('content') || 
            document.querySelector('.post-content') ||
            document.querySelector('.content') ||
            document.querySelector('main');
        
        if (!contentContainer) {
            console.error('No suitable blog post container found. Available elements:', 
                document.querySelectorAll('div, main, article, section'));
            
            // As a last resort, create a container
            const body = document.querySelector('body');
            if (body) {
                console.log('Creating fallback content container');
                const fallbackContainer = document.createElement('div');
                fallbackContainer.id = 'blog-post-content';
                body.appendChild(fallbackContainer);
                this.renderPostInContainer(fallbackContainer, postPath);
                return;
            } else {
                alert('Cannot display blog post: No suitable container found');
                return;
            }
        }
        
        this.renderPostInContainer(contentContainer, postPath);
    },
    
    // Separate method to render post in a specific container
    renderPostInContainer: async function(container, postPath) {
        try {
            // Extract the file name and its parts
            const pathParts = postPath.split('/');
            const fileName = pathParts[pathParts.length - 1];
            const category = pathParts.length > 2 ? pathParts[pathParts.length - 2] : '';
            
            // Add debug output for path parts
            console.log("Path parts:", {
                original: postPath,
                parts: pathParts,
                fileName: fileName, 
                category: category
            });
            
            // Create more comprehensive path variations with proper case handling
            const pathsToTry = [
                postPath,
                `${this.config.baseUrl}${postPath}`,
                postPath.toLowerCase(),
                `${this.config.baseUrl}${postPath.toLowerCase()}`,
                // Direct GitHub paths
                `${this.config.baseUrl}/blog/posts/${category}/${fileName}`,
                `${this.config.baseUrl}/blog/posts/${category.toLowerCase()}/${fileName.toLowerCase()}`,
                `${this.config.baseUrl}/posts/${category}/${fileName}`,
                `${this.config.baseUrl}/posts/${category.toLowerCase()}/${fileName.toLowerCase()}`,
                // Without category
                `${this.config.baseUrl}/blog/posts/${fileName}`,
                `${this.config.baseUrl}/blog/posts/${fileName.toLowerCase()}`,
                `${this.config.baseUrl}/posts/${fileName}`,
                `${this.config.baseUrl}/posts/${fileName.toLowerCase()}`,
                // Relative paths
                `blog/posts/${category}/${fileName}`,
                `blog/posts/${category.toLowerCase()}/${fileName.toLowerCase()}`,
                `posts/${category}/${fileName}`,
                `posts/${category.toLowerCase()}/${fileName.toLowerCase()}`,
                `${category}/${fileName}`,
                `${category.toLowerCase()}/${fileName.toLowerCase()}`,
                // Just filename
                fileName,
                fileName.toLowerCase(),
                // Raw GitHub content URL (if applicable)
                `https://raw.githubusercontent.com/${window.location.hostname.split('.')[0]}/${window.location.pathname.split('/')[1]}/main/${postPath}`
            ];
            
            // Log all paths we'll try
            console.log("Attempting to load post with these paths:", pathsToTry);
            
            let response = null;
            let successPath = null;
            
            for (const path of pathsToTry) {
                try {
                    console.log(`Trying: ${path}`);
                    const attemptResponse = await fetch(path);
                    if (attemptResponse.ok) {
                        response = attemptResponse;
                        successPath = path;
                        console.log(`✓ Success! Loaded from: ${path}`);
                        break;
                    } else {
                        console.log(`✗ Failed with status ${attemptResponse.status}: ${path}`);
                    }
                } catch (e) {
                    console.log(`✗ Error fetching: ${path}`, e.message);
                }
            }
            
            if (!response || !response.ok) {
                throw new Error(`Could not load post from any attempted path. Check your file paths and case sensitivity.`);
            }
            
            const markdownText = await response.text();
            console.log(`Loaded ${markdownText.length} bytes of markdown content`);
            
            // Update page title based on file name
            const postTitle = this.formatTitle(fileName);
            document.title = `${postTitle} | Will Wall's Blog`;
            
            // Process markdown content
            if (!window.marked) {
                return this.renderPlainPost(container, postTitle, markdownText);
            }
            
            // Configure marked.js
            marked.setOptions({
                highlight: this.highlightCode,
                breaks: true,
                gfm: true
            });
            
            // Parse front matter and content
            const { title, date, author, tags, content } = this.parseFrontMatter(markdownText, postTitle);
            
            // Render the post
            container.innerHTML = `
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
                        ${marked.parse(content)}
                    </div>
                </article>
            `;
            
            // Apply syntax highlighting
            if (window.hljs) {
                document.querySelectorAll('pre code').forEach(block => {
                    hljs.highlightBlock(block);
                });
            }
            
            // Hide canvas animation if present
            if (document.getElementById('graph-canvas')) {
                document.getElementById('graph-canvas').style.display = 'none';
            }
        } catch (error) {
            console.error('Failed to render post:', error);
            container.innerHTML = `
                <div class="error">
                    <h2>Error Loading Post</h2>
                    <p>Failed to load the requested post: ${error.message}</p>
                    <p>Path attempted: ${postPath}</p>
                    <p><a href="index.html">Return to blog index</a></p>
                </div>
            `;
        }
    },
    
    // Render plain text post when marked.js is not available
    renderPlainPost: function(container, title, text) {
        container.innerHTML = `
            <article class="blog-post">
                <h1>${title}</h1>
                <div class="post-content">
                    <pre>${text}</pre>
                </div>
            </article>
        `;
    },
    
    // Highlight code blocks
    highlightCode: function(code, lang) {
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
        return code;
    },
    
    // Parse front matter from markdown
    parseFrontMatter: function(markdownText, defaultTitle) {
        const frontMatterMatch = markdownText.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
        
        const result = {
            title: defaultTitle,
            date: null,
            author: null,
            tags: [],
            content: markdownText
        };
        
        if (!frontMatterMatch) {
            return result;
        }
        
        const frontMatter = frontMatterMatch[1];
        result.content = frontMatterMatch[2];
        
        // Extract metadata
        const titleMatch = frontMatter.match(/title:\s*(.*)/);
        if (titleMatch) result.title = titleMatch[1].trim();
        
        const dateMatch = frontMatter.match(/date:\s*(.*)/);
        if (dateMatch) result.date = new Date(dateMatch[1].trim());
        
        const authorMatch = frontMatter.match(/author:\s*(.*)/);
        if (authorMatch) result.author = authorMatch[1].trim();
        
        const tagsMatch = frontMatter.match(/tags:\s*\[(.*)\]/);
        if (tagsMatch) {
            result.tags = tagsMatch[1].split(',').map(tag => tag.trim());
        }
        
        return result;
    }
};

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    blogSystem.init();
});