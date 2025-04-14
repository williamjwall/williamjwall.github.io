// Simple manifest generator for GitHub Pages
const fs = require('fs');
const path = require('path');

// Configuration
const postsDir = path.join(__dirname, '../posts');
const outputFile = path.join(__dirname, '../manifest.json');

function generateManifest() {
    const posts = [];
    
    // Walk through the posts directory
    function walkDir(dir, baseDir = '') {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                // Process subdirectory
                walkDir(filePath, path.join(baseDir, file));
            } else if (file.endsWith('.md')) {
                // Process markdown file
                const relativePath = path.join(baseDir, file);
                
                // Get file creation date
                const date = new Date(stat.birthtime).toISOString().split('T')[0];
                
                // Extract title from filename
                const title = file
                    .replace('.md', '')
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                
                posts.push({
                    path: relativePath.replace(/\\/g, '/'),  // Convert to web path format
                    title: title,
                    date: date
                });
            }
        });
    }
    
    // Start the directory walk
    walkDir(postsDir);
    
    // Sort posts by date (newest first)
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Write the manifest
    fs.writeFileSync(outputFile, JSON.stringify({ posts }, null, 2));
    console.log(`Manifest generated with ${posts.length} posts at ${outputFile}`);
}

// Run the generator
generateManifest(); 