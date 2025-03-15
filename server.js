const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Path to the glossary JSON file
const glossaryFilePath = path.join(dataDir, 'glossary.json');

// Initialize glossary file if it doesn't exist
if (!fs.existsSync(glossaryFilePath)) {
  fs.writeFileSync(glossaryFilePath, JSON.stringify([]));
}

// Get all glossary entries
app.get('/api/glossary', (req, res) => {
  try {
    const glossaryData = fs.readFileSync(glossaryFilePath, 'utf8');
    const glossary = JSON.parse(glossaryData);
    res.json(glossary);
  } catch (error) {
    console.error('Error reading glossary file:', error);
    res.status(500).json({ error: 'Failed to retrieve glossary entries' });
  }
});

// API proxy endpoint for generating glossary entries
app.post('/api/generate-glossary', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system", 
            content: "You are a helpful assistant that creates glossary entries. Extract important terms from the user's input and provide clear, concise definitions. Format your response as JSON with an array of objects, each with 'term' and 'definition' fields. Limit to 3 most important terms."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );
    
    // Parse the AI response to get glossary entries
    const aiResponseContent = response.data.choices[0].message.content;
    const newEntries = JSON.parse(aiResponseContent);
    
    // Read existing glossary
    const glossaryData = fs.readFileSync(glossaryFilePath, 'utf8');
    let glossary = JSON.parse(glossaryData);
    
    // Add new entries, updating existing ones if terms match
    newEntries.forEach(newEntry => {
      const existingIndex = glossary.findIndex(
        entry => entry.term.toLowerCase() === newEntry.term.toLowerCase()
      );
      
      if (existingIndex >= 0) {
        // Update existing entry
        glossary[existingIndex] = newEntry;
      } else {
        // Add new entry
        glossary.push(newEntry);
      }
    });
    
    // Sort alphabetically
    glossary.sort((a, b) => a.term.localeCompare(b.term));
    
    // Save updated glossary
    fs.writeFileSync(glossaryFilePath, JSON.stringify(glossary, null, 2));
    
    // Return the full response along with the updated glossary
    res.json({
      aiResponse: response.data,
      glossary: glossary
    });
  } catch (error) {
    console.error('Error calling OpenAI:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to generate glossary entries',
      details: error.response?.data || error.message
    });
  }
});

// Serve the main application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 