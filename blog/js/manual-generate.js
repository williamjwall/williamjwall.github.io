const generateManifest = require('./generate-manifest');
generateManifest();

const fs = require('fs');
const path = require('path');

// Create a simple index.html in the root that redirects to blog/index.html
const rootIndexContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url=blog/index.html">
    <title>Redirecting...</title>
</head>
<body>
    <p>If you are not redirected automatically, <a href="blog/index.html">click here</a>.</p>
</body>
</html>`;

// Write the file to the project root
fs.writeFileSync(path.join(__dirname, '../../index.html'), rootIndexContent);
console.log('Created root index.html with redirect to blog/index.html'); 