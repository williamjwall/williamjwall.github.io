const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    postsDir: path.join(__dirname, '../posts'),
    outputFile: path.join(__dirname, '../posts-index.json'),
    excerptLength: 150
};

// Function to walk through directories recursively
function walkSync(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            walkSync(filePath, fileList);
        } else if (file.endsWith('.md')) {
            // Get relative path from posts directory
            const relativePath = path.relative(config.postsDir, filePath);
            
            // Read the file to extract metadata if needed
            const content = fs.readFileSync(filePath, 'utf8');
            const titleMatch = content.match(/^# (.*)/m);
            const title = titleMatch ? titleMatch[1] : file.replace('.md', '');
            
            // Add to file list
            fileList.push({
                title,
                path: relativePath.replace(/\\/g, '/'),
                category: path.dirname(relativePath)
            });
        }
    });
    
    return fileList;
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
        const markdownFiles = walkSync(config.postsDir);
        console.log(`Found ${markdownFiles.length} markdown files`);
        
        // Parse each file and extract metadata
        const posts = markdownFiles.map(file => {
            const fullPath = path.join(config.postsDir, file.path);
            const content = fs.readFileSync(fullPath, 'utf8');
            const { metadata, content: postContent } = parseMarkdown(content);
            
            const filename = path.basename(file.path);
            
            // Generate an excerpt if not provided in front matter
            if (!metadata.excerpt) {
                metadata.excerpt = generateExcerpt(postContent, config.excerptLength);
            }
            
            // Return the post data
            return {
                path: file.path,
                title: metadata.title || formatTitle(filename),
                date: metadata.date || new Date().toISOString().split('T')[0],
                author: metadata.author || null,
                category: file.category
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
if (require.main === module) {
    generateManifest();
}

// Export the function for when you need to use it programmatically
module.exports = generateManifest; 