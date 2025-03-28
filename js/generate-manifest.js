// This is just a simple redirector to the actual script
const path = require('path');
const actualScriptPath = path.join(__dirname, '../blog/js/generate-manifest.js');
require(actualScriptPath); 