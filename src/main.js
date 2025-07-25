const noteInput = document.getElementById('note-input');
const searchButton = document.getElementById('search-button');
const notesList = document.getElementById('notes-list');
const sortMethodSelect = document.getElementById('sort-method');
const controlsContainer = document.getElementById('controls-container');
const customPlaceholder = document.getElementById('custom-placeholder');

const noteTimestamps = {};
let draggedItem = null;

let undoStack = [];
let redoStack = [];
const HISTORY_LIMIT = 50;

// ================================
// === History Management ===
// ================================

function getCurrentState() {
  const noteData = [];
  notesList.querySelectorAll('.note-item').forEach(noteItem => {
    noteData.push({
      text: noteItem.querySelector('.note-text').textContent,
      id: noteItem.dataset.id,
      timestamp: noteTimestamps[noteItem.dataset.id]
    });
  });
  return noteData;
}

function saveStateAndNotes() {
  const currentState = getCurrentState();
  const lastState = undoStack[undoStack.length - 1];
  if (JSON.stringify(lastState) === JSON.stringify(currentState)) {
    return;
  }
  undoStack.push(currentState);
  if (undoStack.length > HISTORY_LIMIT) {
    undoStack.shift();
  }
  redoStack = [];
  localStorage.setItem('notes', JSON.stringify(currentState));
}

// MODIFIED: This function now identifies restored notes and triggers the animation.
function renderState(stateToRender, previousState) {
  notesList.innerHTML = '';
  Object.keys(noteTimestamps).forEach(key => delete noteTimestamps[key]);
  
  stateToRender.forEach(noteData => {
    buildNote(noteData.text, noteData); 
  });
  
  // --- NEW: Animation logic ---
  // Find which notes were restored by comparing the new state to the previous one.
  const previousIds = new Set(previousState.map(note => note.id));
  const restoredNotes = stateToRender.filter(note => !previousIds.has(note.id));

  restoredNotes.forEach(note => {
    const noteElement = notesList.querySelector(`.note-item[data-id="${note.id}"]`);
    if (noteElement) {
      const noteContent = noteElement.querySelector('.note-content');
      // Use requestAnimationFrame to ensure the animation plays smoothly after rendering.
      requestAnimationFrame(() => {
        noteContent.classList.add('reappearing');
        // Clean up the class after the animation finishes.
        noteContent.addEventListener('animationend', () => {
          noteContent.classList.remove('reappearing');
        }, { once: true });
      });
    }
  });

  localStorage.setItem('notes', JSON.stringify(stateToRender));
}

// ================================
// === Core Note Functions ===
// ================================

const buildNote = (text, noteDataObject = null) => {
  const noteItem = document.createElement('li');
  noteItem.className = 'note-item';
  noteItem.draggable = true;
  const noteContent = document.createElement('div');
  noteContent.className = 'note-content';
  const textSpan = document.createElement('span');
  textSpan.className = 'note-text';
  textSpan.textContent = DOMPurify.sanitize(text);

  let noteId, timestamp;
  if (noteDataObject) {
    noteId = noteDataObject.id;
    timestamp = noteDataObject.timestamp;
  } else {
    noteId = 'note-' + Date.now();
    timestamp = Date.now();
  }

  noteItem.dataset.id = noteId;
  noteTimestamps[noteId] = timestamp;
  
  const deleteButton = document.createElement('button');
  deleteButton.textContent = '🗑️';
  deleteButton.className = "delete-btn";

  deleteButton.addEventListener('click', (e) => {
    e.stopPropagation();
    noteContent.classList.add('deleting');
    noteContent.addEventListener('animationend', () => {
      noteItem.remove();
      delete noteTimestamps[noteId];
      saveStateAndNotes();
    });
  });

  noteContent.addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn') || noteContent.classList.contains('editing')) return;
    saveStateAndNotes();
    textSpan.innerHTML = textSpan.textContent;
    noteContent.classList.add('editing');
    textSpan.contentEditable = true;
    textSpan.focus();
  });

  textSpan.addEventListener('blur', () => {
    noteContent.classList.remove('editing');
    textSpan.contentEditable = false;
    if (textSpan.textContent.trim() === "") {
      noteItem.remove();
      delete noteTimestamps[noteId];
    }
    saveStateAndNotes();
    filterNotes();
  });

  noteItem.addEventListener('dragstart', handleDragStart);
  noteItem.addEventListener('dragend', handleDragEnd);
  noteContent.appendChild(textSpan);
  noteContent.appendChild(deleteButton);
  noteItem.appendChild(noteContent);
  notesList.appendChild(noteItem);
};

// ================================
// === Drag & Drop Handlers ===
// ================================

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
  if (e.target.isContentEditable) { e.preventDefault(); return; }
  saveStateAndNotes();
  draggedItem = this;
  setTimeout(() => this.classList.add('dragging'), 0);
  e.dataTransfer.setData('text/plain', this.dataset.id);
}

function handleDragEnd() {
  if (!draggedItem) return;
  draggedItem.classList.remove('dragging');
  const indicator = document.querySelector('.drop-indicator');
  if (indicator) indicator.remove();
  draggedItem = null;
}

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
    saveStateAndNotes();
  }
  if (indicator) indicator.remove();
});

// ================================
// === Search, Sort & Init ===
// ================================

function filterNotes() {
  const searchTerm = noteInput.value.toLowerCase();
  const notes = notesList.querySelectorAll('.note-item');
  notes.forEach(noteItem => {
    const textSpan = noteItem.querySelector('.note-text');
    const noteText = textSpan.textContent.toLowerCase();
    const isMatch = noteText.includes(searchTerm);
    noteItem.classList.toggle('hidden', !isMatch);
    if (isMatch && searchTerm) {
      const regex = new RegExp(searchTerm, 'gi');
      textSpan.innerHTML = textSpan.textContent.replace(regex, match => `<mark>${match}</mark>`);
    } else {
      textSpan.innerHTML = textSpan.textContent;
    }
  });
}

function sortNotes() {
  saveStateAndNotes();
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
  notes.forEach(note => notesList.appendChild(note));
  saveStateAndNotes();
}

function addNote() {
  const userText = noteInput.value.trim();
  if (userText === "") return;
  buildNote(userText);
  saveStateAndNotes();
  noteInput.value = "";
  customPlaceholder.style.opacity = '1';
}

function enterSearchMode() {
  controlsContainer.classList.add('search-active');
  customPlaceholder.textContent = "Type to search...";
  noteInput.focus();
  filterNotes();
}

function exitSearchMode() {
  controlsContainer.classList.remove('search-active');
  customPlaceholder.textContent = "Press Enter to add...";
  noteInput.value = "";
  filterNotes();
}

noteInput.addEventListener('keydown', (e) => {
  if (!controlsContainer.classList.contains('search-active') && e.key === 'Enter') {
    e.preventDefault();
    addNote();
  }
});

noteInput.addEventListener('input', () => {
  customPlaceholder.style.opacity = noteInput.value ? '0' : '1';
  if (controlsContainer.classList.contains('search-active')) {
    filterNotes();
  }
});

searchButton.addEventListener('click', () => {
  if (controlsContainer.classList.contains('search-active')) {
    exitSearchMode();
  } else {
    enterSearchMode();
  }
});

function applySavedTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('theme-toggle').textContent = '🌙';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applySavedTheme();
  const savedNotes = JSON.parse(localStorage.getItem('notes') || '[]');
  savedNotes.forEach(noteData => {
    buildNote(noteData.text, noteData);
  });
  
  undoStack = [getCurrentState()];
  
  document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.getElementById('theme-toggle').textContent = isDarkMode ? '🌙' : '☀️';
  });

  sortMethodSelect.addEventListener('change', sortNotes);
  
  document.addEventListener('keydown', (e) => {
    if (e.target.isContentEditable || e.target.tagName === 'INPUT') {
        return;
    }
      
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'z' && !e.shiftKey;
    const isRedo = (isMac ? e.metaKey : e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey));

    if (isUndo) {
      e.preventDefault();
      if (undoStack.length > 1) {
        const previousState = undoStack.pop();
        redoStack.push(previousState);
        const stateToRender = undoStack[undoStack.length - 1];
        renderState(stateToRender, previousState); // Pass both states
      }
    } else if (isRedo) {
      e.preventDefault();
      if (redoStack.length > 0) {
        const previousState = getCurrentState();
        const stateToRender = redoStack.pop();
        undoStack.push(stateToRender);
        renderState(stateToRender, previousState); // Pass both states
      }
    } else if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      if (controlsContainer.classList.contains('search-active')) {
        exitSearchMode();
      } else {
        enterSearchMode();
      }
    }
  });
});
