const noteInput = document.getElementById('note-input');
const addButton = document.getElementById('add-button');
const notesList = document.getElementById('notes-list');
const sortMethodSelect = document.getElementById('sort-method');

// REMOVED: The line `const sortButton = document.getElementById('sort-button');` was deleted.
// Since we removed the button from the HTML, we don't need to look for it in the JavaScript.

const noteTimestamps = {};

// MODIFIED: This is the magic for automatic sorting!
// We now listen for a 'change' on the dropdown menu instead of a 'click' on a button. 
// When you pick a new option, the `sortNotes` function runs instantly.
// This single line replaces the old code: `sortButton.addEventListener('click', sortNotes);`
sortMethodSelect.addEventListener('change', sortNotes); 

const saveNotes = () => {
  const noteData = Array.from(notesList.children).map(note => ({
    text: note.querySelector('span').textContent,
    id: note.dataset.id,
    timestamp: noteTimestamps[note.dataset.id]
  }));
  
  localStorage.setItem('notes', JSON.stringify(noteData));
};

const buildNote = (text) => {
    const newNote = document.createElement('li');
    const textSpan = document.createElement('span');
    textSpan.textContent = text;

    const noteId = 'note-' + Date.now();
    newNote.dataset.id = noteId;
    noteTimestamps[noteId] = Date.now();

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '🗑️';
    deleteButton.className = "delete-btn";
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        delete noteTimestamps[noteId];
        newNote.remove();
        saveNotes();
    });
    
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

// REMOVED: The line `sortButton.addEventListener('click', sortNotes);` was deleted from here
// because we replaced it with the 'change' event listener on the dropdown menu at the top of the file.

addButton.addEventListener('click', function() {
    const userText = noteInput.value.trim();
    if (userText === "") return;
    buildNote(userText);
    saveNotes(); 
    noteInput.value = "";
    
    // ADDED: We added `sortNotes();` here.
    // This makes sure that after you add a new note, the entire list automatically
    // re-sorts itself to put the new note in the correct place.
    sortNotes(); 
});

const savedNotes = JSON.parse(localStorage.getItem('notes') || '[]');
savedNotes.forEach(note => {
    buildNote(note.text);
    if (note.id) {
        noteTimestamps[note.id] = note.timestamp;
    }
});

// ADDED: We added `sortNotes();` here.
// This makes sure that when the page first loads, your notes are immediately
// sorted based on the setting in the dropdown.
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