const noteInput = document.getElementById('note-input');
const addButton = document.getElementById('add-button');
const notesList = document.getElementById('notes-list');
const sortMethodSelect = document.getElementById('sort-method');

const noteTimestamps = {};
let draggedItem = null;

// ================================
// === Core Note Functions ===
// ================================

// MODIFIED: Selector changed to `.note-item` to match the new, more robust DOM structure.
const saveNotes = () => {
  const noteData = [];
  notesList.querySelectorAll('.note-item').forEach(noteItem => {
    noteData.push({
      text: noteItem.querySelector('.note-text').textContent,
      id: noteItem.dataset.id,
      timestamp: noteTimestamps[noteItem.dataset.id]
    });
  });
  localStorage.setItem('notes', JSON.stringify(noteData));
};

// --- REWRITTEN buildNote Function ---
// The old function was complex and created separate, problematic drag handles.
// This new version creates a single, unified `<li>` element that is clean and stable.
const buildNote = (text) => {
  // NEW: The main `<li>` is now the draggable container for the entire row.
  const noteItem = document.createElement('li');
  noteItem.className = 'note-item';
  noteItem.draggable = true;

  // NEW: A `div` to hold the visual content of the note.
  const noteContent = document.createElement('div');
  noteContent.className = 'note-content';

  const textSpan = document.createElement('span');
  textSpan.className = 'note-text';
  textSpan.textContent = DOMPurify.sanitize(text);

  const noteId = 'note-' + Date.now();
  noteItem.dataset.id = noteId;
  noteTimestamps[noteId] = Date.now();

  const deleteButton = document.createElement('button');
  deleteButton.textContent = '🗑️';
  deleteButton.className = "delete-btn";

  // --- Attach Event Listeners ---

  // MODIFIED: Delete logic now uses `animationend` for a clean removal,
  // and it removes the entire `noteItem` so no handles are left behind.
  deleteButton.addEventListener('click', (e) => {
    e.stopPropagation();
    noteContent.classList.add('deleting');
    noteContent.addEventListener('animationend', () => {
      noteItem.remove();
      delete noteTimestamps[noteId];
      saveNotes();
    });
  });

  // MODIFIED: Click listener is now on `noteContent` for better event targeting.
  noteContent.addEventListener('click', (e) => {
    // Prevents editing when the delete button is clicked.
    if (e.target.closest('.delete-btn')) return;
    if (noteContent.classList.contains('editing')) return;
    
    noteContent.classList.add('editing');
    textSpan.contentEditable = true;
    textSpan.focus();
  });

  textSpan.addEventListener('blur', () => {
    noteContent.classList.remove('editing');
    textSpan.contentEditable = false;
    saveNotes();
  });

  textSpan.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      textSpan.blur();
    }
  });

  // MODIFIED: Drag listeners are now on the main `noteItem`.
  noteItem.addEventListener('dragstart', handleDragStart);
  noteItem.addEventListener('dragend', handleDragEnd);

  // Assemble the note
  noteContent.appendChild(textSpan);
  noteContent.appendChild(deleteButton);
  noteItem.appendChild(noteContent); // The `noteContent` is inside the `noteItem`.
  
  // DELETED: All logic for creating a separate `.drag-handle` element has been removed.

  notesList.appendChild(noteItem);
};

// ===================================================
// === Drag & Drop Handlers (FINAL STABLE VERSION) ===
// ===================================================
// REWRITTEN: This entire section was rewritten for stability. It now uses a single
// drop indicator and attaches the main listeners to the parent `notesList`.

// NEW: A helper function to find the correct drop position.
function getElementAfterDrag(container, y) {
  const draggableElements = [...container.querySelectorAll('.note-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleDragStart(e) {
  // NEW: Prevents dragging when trying to select text for editing.
  if (e.target.isContentEditable) {
    e.preventDefault();
    return;
  }
  draggedItem = this;
  setTimeout(() => this.classList.add('dragging'), 0);
  e.dataTransfer.setData('text/plain', this.dataset.id);
}

function handleDragEnd() {
  if (!draggedItem) return;
  draggedItem.classList.remove('dragging');
  const indicator = document.querySelector('.drop-indicator');
  if (indicator) {
    indicator.remove();
  }
  draggedItem = null;
}

// NEW: Listeners are now on the parent `<ul>`. This is more performant and stable.
notesList.addEventListener('dragover', e => {
  e.preventDefault();
  
  const afterElement = getElementAfterDrag(notesList, e.clientY);
  
  const existingIndicator = document.querySelector('.drop-indicator');
  if (existingIndicator) existingIndicator.remove();

  const indicator = document.createElement('div');
  indicator.className = 'drop-indicator';

  if (afterElement == null) {
    notesList.appendChild(indicator);
  } else {
    notesList.insertBefore(indicator, afterElement);
  }
});

notesList.addEventListener('drop', e => {
  e.preventDefault();
  const indicator = document.querySelector('.drop-indicator');
  if (indicator && draggedItem) {
    notesList.insertBefore(draggedItem, indicator);
  }
  if (indicator) indicator.remove();
  saveNotes();
});

// ================================
// === Sorting & Initialization ===
// ================================

// FIXED: The old function sorted an array but never updated the screen.
// This version now correctly re-appends the sorted notes to the DOM.
function sortNotes() {
  const method = sortMethodSelect.value;
  const notes = Array.from(notesList.querySelectorAll('.note-item'));

  notes.sort((a, b) => {
    const aText = a.querySelector('.note-text').textContent.toLowerCase();
    const bText = b.querySelector('.note-text').textContent.toLowerCase();
    const aTime = noteTimestamps[a.dataset.id];
    const bTime = noteTimestamps[b.dataset.id];

    switch (method) {
      case 'newest': return bTime - aTime;
      case 'oldest': return aTime - bTime;
      case 'a-z': return aText.localeCompare(bText);
      case 'z-a': return bText.localeCompare(aText);
      default: return 0;
    }
  });

  // This line fixes the sorting by physically re-ordering the notes on the page.
  notes.forEach(note => notesList.appendChild(note));
  saveNotes();
}

// MODIFIED: No longer calls `sortNotes()` after adding a new note.
// New notes are simply added to the end, preserving any manual order.
addButton.addEventListener('click', () => {
  const userText = noteInput.value.trim();
  if (userText === "") return;
  buildNote(userText);
  saveNotes();
  noteInput.value = "";
});

function applySavedTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('theme-toggle').textContent = '🌙';
  }
}

// RESTRUCTURED: All initialization logic is now inside a `DOMContentLoaded`
// listener. This is best practice and ensures the script only runs after
// all HTML elements are ready.
document.addEventListener('DOMContentLoaded', () => {
  applySavedTheme();
  const savedNotes = JSON.parse(localStorage.getItem('notes') || '[]');
  savedNotes.forEach(note => buildNote(note.text));
  
  document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.getElementById('theme-toggle').textContent = isDarkMode ? '🌙' : '☀️';
  });

  sortMethodSelect.addEventListener('change', sortNotes);
});