const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    postsDir: path.join(__dirname, '../posts'),
    outputFile: path.join(__dirname, '../posts-index.json'),
    excerptLength: 150
};

// Function to recursively find all markdown files
function findMarkdownFiles(dir, baseDir = dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            files.push(...findMarkdownFiles(fullPath, baseDir));
        } else if (entry.name.endsWith('.md')) {
            const relativePath = path.relative(baseDir, fullPath);
            files.push(relativePath.replace(/\\/g, '/'));
        }
    }
    
    return files;
}

// Parse front matter from markdown (if it exists)
function parseMarkdown(content) {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);
    
    if (!match) {
        return {
            metadata: { title: 'Untitled Post' },
            content: content
        };
    }
    
    const frontMatter = match[1];
    const postContent = match[2];
    
    // Parse YAML front matter
    const metadata = {};
    frontMatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
            let value = valueParts.join(':').trim();
            
            // Parse tags if they exist
            if (key.trim() === 'tags') {
                // Remove brackets and split by commas
                value = value.replace(/^\[|\]$/g, '').split(',').map(tag => tag.trim());
            }
            
            metadata[key.trim()] = value;
        }
    });
    
    return { metadata, content: postContent };
}

// Generate excerpt from content
function generateExcerpt(content, length) {
    // Remove markdown formatting for the excerpt
    let plainText = content
        .replace(/#+\s+(.*)\n/g, '') // Remove headers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just the text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/`(.*?)`/g, '$1') // Remove inline code
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .trim();
    
    // Get the excerpt
    if (plainText.length <= length) {
        return plainText;
    }
    
    return plainText.substring(0, length) + '...';
}

// Format title from filename
function formatTitle(filename) {
    return filename
        .replace('.md', '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

// Main function to generate the manifest
function generateManifest() {
    console.log('Generating blog manifest...');
    
    try {
        // Create posts directory if it doesn't exist
        if (!fs.existsSync(config.postsDir)) {
            fs.mkdirSync(config.postsDir, { recursive: true });
        }
        
        // Find all markdown files
        const markdownFiles = findMarkdownFiles(config.postsDir);
        console.log(`Found ${markdownFiles.length} markdown files`);
        
        // Parse each file and extract metadata
        const posts = markdownFiles.map(file => {
            const fullPath = path.join(config.postsDir, file);
            const content = fs.readFileSync(fullPath, 'utf8');
            const { metadata, content: postContent } = parseMarkdown(content);
            
            const filename = path.basename(file);
            
            // Generate an excerpt if not provided in front matter
            if (!metadata.excerpt) {
                metadata.excerpt = generateExcerpt(postContent, config.excerptLength);
            }
            
            // Return the post data
            return {
                path: file,
                title: metadata.title || formatTitle(filename),
                date: metadata.date || new Date().toISOString().split('T')[0],
                author: metadata.author || null,
                tags: metadata.tags || [],
                excerpt: metadata.excerpt
            };
        });
        
        // Create the manifest
        const manifest = {
            generatedAt: new Date().toISOString(),
            count: posts.length,
            posts: posts
        };
        
        // Write the manifest file
        fs.writeFileSync(config.outputFile, JSON.stringify(manifest, null, 2));
        console.log(`Manifest generated at ${config.outputFile}`);
        
    } catch (error) {
        console.error('Error generating manifest:', error);
    }
}

// Run the generator
generateManifest(); 