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
let originalNoteOrder = [];
let activeTags = new Set();

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


// --- Tag color helper ---
const getTagColor = (() => {
  const cache = new Map();
  return (tag) => {
    if (!cache.has(tag)) {
      let hash = 0;
      for (let i = 0; i < tag.length; i++) {
        hash = ((hash << 5) - hash + tag.charCodeAt(i)) & 0xffffff;
      }
      const hue = hash % 360;          // 0-359
      const pastel = `hsl(${hue}, 70%, 80%)`;
      cache.set(tag, pastel);
    }
    return cache.get(tag);
  };
})();


function saveStateAndNotes() {
  const currentState = getCurrentState();
  const lastState = undoStack[undoStack.length - 1];
  if (JSON.stringify(lastState) === JSON.stringify(currentState)) return;
  undoStack.push(currentState);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
  localStorage.setItem('notes', JSON.stringify(currentState));
}

function renderState(stateToRender, previousState) {
  notesList.innerHTML = '';
  Object.keys(noteTimestamps).forEach(key => delete noteTimestamps[key]);
  stateToRender.forEach(noteData => buildNote(noteData.text, noteData));
  
  const previousIds = new Set(previousState.map(note => note.id));
  const restoredNotes = stateToRender.filter(note => !previousIds.has(note.id));

  restoredNotes.forEach(note => {
    const noteElement = notesList.querySelector(`.note-item[data-id="${note.id}"]`);
    if (noteElement) {
      const noteContent = noteElement.querySelector('.note-content');
      requestAnimationFrame(() => {
        noteContent.classList.add('reappearing');
        noteContent.addEventListener('animationend', () => {
          noteContent.classList.remove('reappearing');
        }, { once: true });
      });
    }
  });

  localStorage.setItem('notes', JSON.stringify(stateToRender));
  updateActiveTagsAndDropdown();
}

// ================================
// === Tag & Syntax Management ===
// ================================

// NEW: This is our smart, unified function for applying all text styling.
function applySyntaxHighlighting(textSpan, plainText, searchTerm) {
  const tagRegex = /#([a-zA-Z0-9_]+)/g;
  let html = plainText;

  // First, wrap hashtags
  
html = html.replace(tagRegex, (match) => {
    const color = getTagColor(match.toLowerCase());
    return `<span class="tag-highlight" style="background-color:${color};">${match}</span>`;
  });

  // Then, if a search term exists, wrap it in a mark tag
  if (searchTerm) {
    // We must be careful not to replace text inside the HTML tags we just added.
    // This regex looks for the search term but ignores any that are inside HTML tags.
    const searchRegex = new RegExp(searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
    
    // A temporary container to safely manipulate HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Walk through all text nodes and apply search highlighting
    const textNodes = Array.from(tempDiv.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    textNodes.forEach(node => {
      const parent = node.parentNode;
      const parts = node.textContent.split(searchRegex);
      if (parts.length > 1) {
        const matches = node.textContent.match(searchRegex);
        const fragment = document.createDocumentFragment();
        parts.forEach((part, index) => {
          fragment.appendChild(document.createTextNode(part));
          if (index < parts.length - 1) {
            const mark = document.createElement('mark');
            mark.textContent = matches[index];
            fragment.appendChild(mark);
          }
        });
        parent.replaceChild(fragment, node);
      }
    });
    html = tempDiv.innerHTML;
  }
  
  textSpan.innerHTML = html;
}

function updateActiveTagsAndDropdown() {
  const newActiveTags = new Set();
  const notes = notesList.querySelectorAll('.note-text');
  const tagRegex = /#([a-zA-Z0-9_]+)/g;
  notes.forEach(noteText => {
    const matches = noteText.textContent.match(tagRegex);
    if (matches) {
      matches.forEach(tag => newActiveTags.add(tag.toLowerCase()));
    }
  });
  activeTags = newActiveTags;
  updateTagDropdown();
}

function updateTagDropdown() {
  sortMethodSelect.querySelectorAll('.tag-option').forEach(option => option.remove());
  if (activeTags.size > 0) {
    const sortedTags = Array.from(activeTags).sort();
    sortedTags.forEach(tag => {
      const option = document.createElement('option');
      option.value = `tag:${tag}`;
      option.textContent = `Filter: ${tag}`;
      option.className = 'tag-option';
      sortMethodSelect.appendChild(option);
    });
  }
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
  
  // MODIFIED: Use the new highlighter on creation
  applySyntaxHighlighting(textSpan, DOMPurify.sanitize(text), '');

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
      updateActiveTagsAndDropdown();
    });
  });

  noteContent.addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn') || noteContent.classList.contains('editing')) return;
    saveStateAndNotes();
    textSpan.innerHTML = textSpan.textContent; // Remove highlights for editing
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
    updateActiveTagsAndDropdown();
    filterNotes(); // Re-apply highlights after editing
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
  const notes = Array.from(notesList.querySelectorAll('.note-item'));

  // Filter and sort notes: matching notes first, then non-matching notes
  notes.sort((a, b) => {
    const aText = a.querySelector('.note-text').textContent.toLowerCase();
    const bText = b.querySelector('.note-text').textContent.toLowerCase();
    const aMatches = aText.includes(searchTerm);
    const bMatches = bText.includes(searchTerm);
    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;
    return 0;
  });

  // Clear the current list
  notesList.innerHTML = '';

  // Re-add notes in the new order
  notes.forEach(note => {
    const textSpan = note.querySelector('.note-text');
    const noteText = textSpan.textContent;
    const isMatch = noteText.toLowerCase().includes(searchTerm);

    // Apply combined highlighting
    applySyntaxHighlighting(textSpan, noteText, searchTerm);

    // Toggle the 'hidden' class based on whether the note matches the search term
    note.classList.toggle('hidden', !isMatch);

    // Re-add the note to the list
    notesList.appendChild(note);
  });

  // Save the current state
  saveStateAndNotes();
}

function sortNotes() {
  const method = sortMethodSelect.value;
  notesList.querySelectorAll('.note-item.hidden').forEach(n => n.classList.remove('hidden'));
  const notes = Array.from(notesList.querySelectorAll('.note-item'));
  notes.forEach(note => notesList.appendChild(note));

  if (method.startsWith('tag:')) {
    const tag = method.substring(4);
    const taggedNotes = [];
    const otherNotes = [];
    notes.forEach(note => {
      if (note.querySelector('.note-text').textContent.toLowerCase().includes(tag)) {
        taggedNotes.push(note);
      } else {
        otherNotes.push(note);
      }
    });
    taggedNotes.forEach(note => notesList.appendChild(note));
    otherNotes.forEach(note => notesList.appendChild(note));
    otherNotes.forEach(note => note.classList.add('hidden'));
  } else {
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
  }
  saveStateAndNotes();
}

function addNote() {
  const userText = noteInput.value.trim();
  if (userText === "") return;
  buildNote(userText);
  saveStateAndNotes();
  updateActiveTagsAndDropdown();
  noteInput.value = "";
  customPlaceholder.style.opacity = '1';
}

function enterSearchMode() {
  originalNoteOrder = Array.from(notesList.querySelectorAll('.note-item')).map(item => item.dataset.id);
  controlsContainer.classList.add('search-active');
  customPlaceholder.textContent = "Type to search...";
  noteInput.focus();
  filterNotes();
}

function exitSearchMode() {
  controlsContainer.classList.remove('search-active');
  customPlaceholder.textContent = "Press Enter to add...";
  noteInput.value = "";
  
  const fragment = document.createDocumentFragment();
  originalNoteOrder.forEach(id => {
    const noteItem = notesList.querySelector(`.note-item[data-id="${id}"]`);
    if (noteItem) fragment.appendChild(noteItem);
  });
  notesList.appendChild(fragment);

  notesList.querySelectorAll('.hidden').forEach(note => note.classList.remove('hidden'));
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
  
  updateActiveTagsAndDropdown();
  undoStack = [getCurrentState()];
 



// Existing code

// --- Export Notes ---
document.getElementById('export-button').addEventListener('click', () => {
  const notes = JSON.parse(localStorage.getItem('notes') || '[]');
  const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'notes.json';
  a.click();
  URL.revokeObjectURL(url);
});

// --- Import Notes ---
document.getElementById('import-button').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedNotes = JSON.parse(e.target.result);
          // Clear existing notes
          localStorage.removeItem('notes');
          // Save imported notes
          localStorage.setItem('notes', JSON.stringify(importedNotes));
          // Reload the app to display the new notes
          location.reload();
        } catch (error) {
          alert('Invalid JSON file. Please try again.');
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
});

// Existing code



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
        renderState(stateToRender, previousState);
      }
    } else if (isRedo) {
      e.preventDefault();
      if (redoStack.length > 0) {
        const previousState = getCurrentState();
        const stateToRender = redoStack.pop();
        undoStack.push(stateToRender);
        renderState(stateToRender, previousState);
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
