(function() {
    // Simple markdown parser
    function parseMarkdown(markdown) {
        // Replace headers
        markdown = markdown.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        markdown = markdown.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        markdown = markdown.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        
        // Replace links
        markdown = markdown.replace(/\[([^\[]+)\]\(([^\)]+)\)/gm, '<a href="$2">$1</a>');
        
        // Replace images
        markdown = markdown.replace(/!\[([^\[]+)\]\(([^\)]+)\)/gm, '<img src="$2" alt="$1">');
        
        // Replace bold text
        markdown = markdown.replace(/\*\*(.*)\*\*/gm, '<strong>$1</strong>');
        
        // Replace italic text
        markdown = markdown.replace(/\*(.*)\*/gm, '<em>$1</em>');
        
        // Replace code blocks
        markdown = markdown.replace(/```([^`]+)```/gm, '<pre><code>$1</code></pre>');
        
        // Replace inline code
        markdown = markdown.replace(/`([^`]+)`/gm, '<code>$1</code>');
        
        // Replace paragraphs (must be last)
        markdown = markdown.replace(/^(?!<[a-z])(.*$)/gm, '<p>$1</p>');
        
        return markdown;
    }
    
    // Extract metadata from markdown file
    function extractMetadata(content) {
        const metadataRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
        const match = content.match(metadataRegex);
        
        if (!match) return { content };
        
        const metadataStr = match[1];
        const metadata = {};
        const lines = metadataStr.split('\n');
        
        lines.forEach(line => {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value) metadata[key] = value;
        });
        
        // Remove metadata section from content
        const cleanContent = content.replace(metadataRegex, '');
        
        return {
            metadata,
            content: cleanContent
        };
    }
    
    // Load blog post
    async function loadBlogPost(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Failed to load ${path}`);
            
            const content = await response.text();
            const { metadata, content: markdownContent } = extractMetadata(content);
            const htmlContent = parseMarkdown(markdownContent);
            
            return { metadata, htmlContent };
        } catch (error) {
            console.error('Error loading blog post:', error);
            return null;
        }
    }
    
    // Load blog posts for a topic
    async function loadTopicPosts(topic) {
        try {
            // In a real implementation, you would have an API endpoint or JSON file
            // that lists all posts for a topic. For now, we'll use a simple approach.
            const postsContainer = document.querySelector('.blog-posts');
            postsContainer.innerHTML = '<p>Loading posts...</p>';
            
            // This would be replaced with an actual API call in production
            const posts = await fetch(`/blog/posts/${topic}/index.json`)
                .then(res => res.json())
                .catch(() => {
                    // Fallback for demo purposes
                    return [
                        { 
                            title: 'Understanding AI', 
                            file: 'understanding-ai.md',
                            date: '2023-10-10'
                        },
                        { 
                            title: 'Deep Learning Guide', 
                            file: 'deep-learning.md',
                            date: '2023-11-15'
                        }
                    ];
                });
            
            postsContainer.innerHTML = '';
            
            for (const post of posts) {
                const postElement = document.createElement('article');
                postElement.className = 'blog-post';
                
                const titleElement = document.createElement('h2');
                titleElement.innerHTML = `<a href="/blog/post.html?topic=${topic}&post=${post.file}">${post.title}</a>`;
                
                const dateElement = document.createElement('div');
                dateElement.className = 'post-date';
                dateElement.textContent = new Date(post.date).toLocaleDateString();
                
                postElement.appendChild(titleElement);
                postElement.appendChild(dateElement);
                
                // Load a preview of the post
                const { htmlContent } = await loadBlogPost(`/blog/posts/${topic}/${post.file}`);
                const previewElement = document.createElement('div');
                previewElement.className = 'post-excerpt';
                previewElement.innerHTML = htmlContent.substring(0, 200) + '...';
                
                const readMoreLink = document.createElement('a');
                readMoreLink.href = `/blog/post.html?topic=${topic}&post=${post.file}`;
                readMoreLink.className = 'read-more';
                readMoreLink.textContent = 'Read more';
                
                postElement.appendChild(previewElement);
                postElement.appendChild(readMoreLink);
                
                postsContainer.appendChild(postElement);
            }
        } catch (error) {
            console.error('Error loading topic posts:', error);
        }
    }
    
    // Display a single blog post
    async function displayBlogPost(topic, postFile) {
        try {
            const postContainer = document.querySelector('.post-content');
            if (!postContainer) return;
            
            postContainer.innerHTML = '<p>Loading post...</p>';
            
            const { metadata, htmlContent } = await loadBlogPost(`/blog/posts/${topic}/${postFile}`);
            
            // Update page title
            document.title = metadata?.title || 'Blog Post';
            
            // Update post header
            const postHeader = document.querySelector('.post-header h1');
            if (postHeader) postHeader.textContent = metadata?.title || 'Blog Post';
            
            // Update post date
            const postDate = document.querySelector('.post-date');
            if (postDate && metadata?.date) {
                postDate.textContent = new Date(metadata.date).toLocaleDateString();
            }
            
            // Display post content
            postContainer.innerHTML = htmlContent;
        } catch (error) {
            console.error('Error displaying blog post:', error);
        }
    }
    
    // Initialize blog functionality
    function initBlog() {
        // Check if we're on a topic page
        const topicMatch = window.location.pathname.match(/\/blog\/topics\/([^\/]+)\.html/);
        if (topicMatch) {
            const topic = topicMatch[1];
            loadTopicPosts(topic);
            return;
        }
        
        // Check if we're on a post page
        const urlParams = new URLSearchParams(window.location.search);
        const topic = urlParams.get('topic');
        const post = urlParams.get('post');
        
        if (topic && post) {
            displayBlogPost(topic, post);
            return;
        }
    }
    
    // Run initialization when DOM is loaded
    document.addEventListener('DOMContentLoaded', initBlog);
})(); 