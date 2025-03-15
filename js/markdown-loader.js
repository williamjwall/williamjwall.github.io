// Markdown parser library (using marked.js)
// You'll need to include the marked.js library in your project
// <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

function loadBlogPost(postPath, targetElementId) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', postPath, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      const content = xhr.responseText;
      const htmlContent = marked.parse(content);
      document.getElementById(targetElementId).innerHTML = htmlContent;
    } else if (xhr.readyState === 4) {
      console.error('Failed to load blog post:', postPath);
      document.getElementById(targetElementId).innerHTML = '<p>Failed to load blog post.</p>';
    }
  };
  xhr.send();
}

function loadBlogPosts() {
  // Fetch the posts index
  fetch('blog/posts-index.json')
    .then(response => response.json())
    .then(posts => {
      // Category mapping - adjust this to match your categories
      const categoryMapping = {
        'AI': 'AI/ML Related',
        'Deep Learning': 'AI/ML Related',
        'Machine Learning': 'AI/ML Related',
        'Bioinformatics': 'Bioinformatics',
        'Data Engineering': 'Articles/Reviews',
        'General': 'Articles/Reviews',
        'Hobbies': 'Random/Hobbies',
        'Photography': 'Random/Hobbies'
      };
      
      // Get all category sections
      const categoryElements = {};
      document.querySelectorAll('.blog-topics > ul > li').forEach(li => {
        const categoryTitle = li.querySelector('h3').textContent;
        const categoryList = li.querySelector('ul');
        categoryElements[categoryTitle] = categoryList;
      });
      
      // Process each post and add it to the right category
      posts.forEach(post => {
        // Determine which category this post belongs to
        let categoryName = 'Articles/Reviews'; // Default category
        
        for (const topic of post.topics) {
          if (categoryMapping[topic]) {
            categoryName = categoryMapping[topic];
            break;
          }
        }
        
        // Create list item for the post
        if (categoryElements[categoryName]) {
          const listItem = document.createElement('li');
          const link = document.createElement('a');
          link.href = `post.html?path=${encodeURIComponent(post.path)}`;
          link.textContent = post.title;
          listItem.appendChild(link);
          
          // Add the item to the appropriate category
          categoryElements[categoryName].appendChild(listItem);
        }
      });
    })
    .catch(error => {
      console.error('Error loading blog posts:', error);
    });
} 