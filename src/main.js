const noteInput = document.getElementById('note-input');
const addButton = document.getElementById('add-button');
const notesList = document.getElementById('notes-list');
const sortMethodSelect = document.getElementById('sort-method');

const noteTimestamps = {};




//modified code start

// Helper function for delete animation
const createDeleteAnimation = (element) => {
    const rect = element.getBoundingClientRect();
    const animationContainer = document.getElementById('animation-container');
    
    const circle = document.createElement('div');
    circle.className = 'delete-animation';
    circle.style.width = `${rect.width}px`;
    circle.style.height = `${rect.height}px`;
    circle.style.left = `${rect.left}px`;
    circle.style.top = `${rect.top}px`;
    
    animationContainer.appendChild(circle);
    
    // Clean up after animation completes
    setTimeout(() => {
        circle.remove();
    }, 400);
};

//modified code end




sortMethodSelect.addEventListener('change', sortNotes); 





const saveNotes = () => {
  const noteData = Array.from(notesList.children).map(note => ({
    text: note.querySelector('span').textContent,
    id: note.dataset.id,
    timestamp: noteTimestamps[note.dataset.id]
  }));
  
  localStorage.setItem('notes', JSON.stringify(noteData));
};










//modified code start

const buildNote = (text) => {
    const newNote = document.createElement('li');
    const textSpan = document.createElement('span');

    // 🔒 SECURITY FIX: Sanitize text before displaying
    textSpan.textContent = DOMPurify.sanitize(text);

    const noteId = 'note-' + Date.now();
    newNote.dataset.id = noteId;
    noteTimestamps[noteId] = Date.now();

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '🗑️';
    deleteButton.className = "delete-btn";
    
// Remove the createDeleteAnimation() function completely

// Inside deleteButton event handler
deleteButton.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Add deleting class for animation
    newNote.classList.add('deleting');
    
    // Remove after animation completes
    setTimeout(() => {
      newNote.remove();
      delete noteTimestamps[noteId];
      saveNotes();
    }, 200); // Matches 0.2s animation
  });

//modeified code end








    
    newNote.appendChild(deleteButton);
    newNote.appendChild(textSpan);

    newNote.addEventListener('click', (e) => {
        if (!newNote.classList.contains('editing') && e.target !== deleteButton) {
            newNote.classList.add('editing');
            textSpan.contentEditable = true;
            textSpan.focus();
            
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(textSpan);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    });

    textSpan.addEventListener('blur', () => {
        newNote.classList.remove('editing');
        textSpan.contentEditable = false;

        // 🔒 SECURITY FIX: Sanitize after editing
        const cleanText = DOMPurify.sanitize(textSpan.textContent);
        textSpan.textContent = cleanText;

        saveNotes();
    });

    textSpan.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            textSpan.blur();
        }
    });
    notesList.appendChild(newNote);
};

function sortNotes() {
    const method = sortMethodSelect.value;
    const notes = Array.from(notesList.children);
    
    notes.sort((a, b) => {
        const aText = a.querySelector('span').textContent.toLowerCase();
        const bText = b.querySelector('span').textContent.toLowerCase();
        const aTime = noteTimestamps[a.dataset.id];
        const bTime = noteTimestamps[b.dataset.id];
        
        switch(method) {
            case 'newest': return bTime - aTime;
            case 'oldest': return aTime - bTime;
            case 'a-z': return aText.localeCompare(bText);
            case 'z-a': return bText.localeCompare(aText);
            default: return 0;
        }
    });
    
    notes.forEach(note => notesList.appendChild(note));
    saveNotes();
}

addButton.addEventListener('click', function() {
    const userText = noteInput.value.trim();
    if (userText === "") return;
    buildNote(userText);
    saveNotes(); 
    noteInput.value = "";
    sortNotes(); 
});

const savedNotes = JSON.parse(localStorage.getItem('notes') || '[]');
savedNotes.forEach(note => {

    // 🔒 SECURITY FIX: Sanitize loaded notes
    buildNote(DOMPurify.sanitize(note.text));

    if (note.id) {
        noteTimestamps[note.id] = note.timestamp;
    }
});


sortNotes();

const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    if (body.classList.contains('dark-mode')) {
        themeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    } else {
        themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'light');
    }
});

function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        themeToggle.textContent = '🌙';
    }
}

applySavedTheme();