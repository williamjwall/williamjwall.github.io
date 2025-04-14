const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Configuration
const config = {
    postsDir: path.join(__dirname, '../posts'),
    outputFile: path.join(__dirname, '../posts-index.json'),
    excerptLength: 150
};

// Only allow these specific categories
const allowedCategories = ['Notes', 'Random', 'Hobbies', 'Projects'];

// Function to recursively get all markdown files from a directory
function getAllMarkdownFiles(dir, baseDir = dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    let files = [];
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            // Recursively get files from subdirectories
            const nestedFiles = getAllMarkdownFiles(fullPath, baseDir);
            files = [...files, ...nestedFiles];
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            // Get relative path from the base directory
            const relativePath = path.relative(baseDir, fullPath);
            files.push({
                path: fullPath,
                relativePath: relativePath
            });
        }
    }
    
    return files;
}

// Function to create manifest from markdown files
function generateManifest() {
    const postsDir = path.join(__dirname, '../posts');
    const sections = fs.readdirSync(postsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    const manifest = {};
    
    for (const section of sections) {
        const sectionPath = path.join(postsDir, section);
        const markdownFiles = getAllMarkdownFiles(sectionPath);
        
        manifest[section] = markdownFiles.map(file => {
            const fileContent = fs.readFileSync(file.path, 'utf8');
            const { data } = matter(fileContent);
            
            // Create hierarchical structure based on the relative path
            const pathParts = file.relativePath.split(path.sep);
            const fileName = pathParts.pop();
            const slug = fileName.replace(/\.md$/, '');
            
            // If it's just a file in the section root, pathParts will be empty
            const nestedPath = pathParts.length ? pathParts.join('/') : '';
            
            return {
                title: data.title || slug,
                slug: slug,
                date: data.date || null,
                nestedPath: nestedPath, // Use this to know if it's in a subfolder and where
                // Include other metadata as needed
                ...data
            };
        });
    }
    
    return manifest;
}

// Write manifest to file
function writeManifest() {
    const manifest = generateManifest();
    fs.writeFileSync(
        path.join(__dirname, '../manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    console.log('Manifest generated successfully!');
}

// Execute the script
writeManifest();

// Run the generator if called directly
if (require.main === module) {
    generateManifest();
}

module.exports = generateManifest; 