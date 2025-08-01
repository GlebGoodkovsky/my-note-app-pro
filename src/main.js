// ================================
// === DOM Element Definitions ===
// ================================
const themeToggleButton = document.getElementById('theme-toggle');

// Containers
const listViewContainer = document.getElementById('list-view-container');
const editorViewContainer = document.getElementById('editor-view-container');
const controlsContainer = document.getElementById('controls-container');

// Note List View
const notesList = document.getElementById('notes-list');
const sortMethodSelect = document.getElementById('sort-method');
const addButton = document.getElementById('add-button');
const searchButton = document.getElementById('search-button');
const exportButton = document.getElementById('export-button');
const importButton = document.getElementById('import-button');

// Note Editor View
const backButton = document.getElementById('back-button');
const noteEditorTitle = document.getElementById('note-editor-title');
const noteEditorContent = document.getElementById('note-editor-content');

// Spotlight Modal
const spotlightOverlay = document.getElementById('spotlight-overlay');
const spotlightModal = document.getElementById('spotlight-modal');
const spotlightInput = document.getElementById('spotlight-input');
const spotlightPlaceholder = document.getElementById('spotlight-placeholder');
const spotlightResults = document.getElementById('spotlight-results');
const spotlightModeText = document.getElementById('spotlight-mode-text');

// ================================
// === Global State Management ===
// ================================
let notes = []; // Single source of truth for all notes
let currentEditingNoteId = null; // Tracks the note open in the editor
const pinnedNotes = new Set();
let draggedItem = null;
let activeTags = new Set();

// Spotlight variables
let spotlightMode = 'add';
let selectedResultIndex = -1;
let filteredResults = [];
let searchTimeout = null;

// ================================
// === View & State Switching ===
// ================================

function showListView() {
  listViewContainer.classList.remove('hidden');
  editorViewContainer.classList.add('hidden');
  currentEditingNoteId = null;
  renderNotesList(); // Re-render to ensure list is up-to-date
}

function showEditorView(noteId) {
  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  currentEditingNoteId = noteId;

  // Populate editor fields
  noteEditorTitle.value = note.title;
  noteEditorContent.value = note.content;
  
  listViewContainer.classList.add('hidden');
  editorViewContainer.classList.remove('hidden');
  noteEditorTitle.focus();
}

// ================================
// === Data Persistence (Saving & Loading) ===
// ================================

function saveNotes() {
  // Update the currently editing note before saving the whole array
  if (currentEditingNoteId) {
    const note = notes.find(n => n.id === currentEditingNoteId);
    if (note) {
      note.title = noteEditorTitle.value || "Untitled Note";
      note.content = noteEditorContent.value;
    }
  }
  
  localStorage.setItem('notes', JSON.stringify(notes));
  const pinnedIds = notes.filter(n => n.pinned).map(n => n.id);
  localStorage.setItem('pinnedNotes', JSON.stringify(pinnedIds));
}

function loadNotes() {
  let savedNotes = JSON.parse(localStorage.getItem('notes') || '[]');
  const savedPinned = JSON.parse(localStorage.getItem('pinnedNotes') || '[]');
  
  // === ONE-TIME MIGRATION LOGIC ===
  // If notes are in the old format (string or object with 'text'), convert them.
  if (savedNotes.length > 0 && (typeof savedNotes[0] === 'string' || savedNotes[0].text)) {
      savedNotes = savedNotes.map(oldNote => {
          const text = oldNote.text || oldNote;
          const lines = text.split('\n');
          const title = lines[0] || 'Untitled Note';
          const content = lines.slice(1).join('\n');
          const id = oldNote.id || `note-${Date.now()}`;
          return {
              id: id,
              title: title,
              content: content,
              timestamp: oldNote.timestamp || Date.now(),
              pinned: savedPinned.includes(id),
          };
      });
  }

  notes = savedNotes;
  notes.forEach(note => {
      if (note.pinned) {
          pinnedNotes.add(note.id);
      }
  });

  renderNotesList();
}


// ================================
// === Core Note Functions ===
// ================================

// Creates a single note item for the list view
function createNoteListItem(note) {
  const noteItem = document.createElement('li');
  noteItem.className = 'note-item';
  noteItem.dataset.id = note.id;
  noteItem.draggable = true;

  if (note.pinned) {
    noteItem.classList.add('pinned');
  }

  const noteContent = document.createElement('div');
  noteContent.className = 'note-content';

  const textSpan = document.createElement('span');
  textSpan.className = 'note-text';
  textSpan.textContent = note.title; // Display title only

  // --- Buttons ---
  const pinButton = document.createElement('button');
  pinButton.textContent = note.pinned ? '📌' : '📍';
  pinButton.className = "pin-btn";
  pinButton.title = note.pinned ? 'Unpin note' : 'Pin note';
  pinButton.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePin(note.id);
  });

  const deleteButton = document.createElement('button');
  deleteButton.textContent = '🗑️';
  deleteButton.className = "delete-btn";
  deleteButton.addEventListener('click', (e) => {
    e.stopPropagation();
    noteContent.classList.add('deleting');
    noteContent.addEventListener('animationend', () => {
        notes = notes.filter(n => n.id !== note.id);
        saveNotes();
        renderNotesList();
    });
  });

  // --- Event Listeners ---
  noteItem.addEventListener('click', () => showEditorView(note.id));
  noteItem.addEventListener('dragstart', handleDragStart);
  noteItem.addEventListener('dragend', handleDragEnd);

  noteContent.appendChild(textSpan);
  noteContent.appendChild(pinButton);
  noteContent.appendChild(deleteButton);
  noteItem.appendChild(noteContent);
  notesList.appendChild(noteItem);
}

// Renders the entire list of notes from the global 'notes' array
function renderNotesList() {
    sortNotes(); // Sort the array first
    notesList.innerHTML = ''; // Clear the current list
    notes.forEach(note => createNoteListItem(note));
    updateActiveTagsAndDropdown();
}

function addNewNote(title) {
  const newNote = {
    id: 'note-' + Date.now(),
    title: title || "Untitled Note",
    content: "",
    timestamp: Date.now(),
    pinned: false,
  };
  notes.unshift(newNote); // Add to the top
  saveNotes();
  showEditorView(newNote.id); // Go directly to the editor for the new note
}

// ================================
// === Feature Implementations ===
// ================================

function togglePin(noteId) {
  const note = notes.find(n => n.id === noteId);
  if (note) {
    note.pinned = !note.pinned;
    if (note.pinned) {
      pinnedNotes.add(noteId);
    } else {
      pinnedNotes.delete(noteId);
    }
  }
  saveNotes();
  renderNotesList();
}

function sortNotes() {
    const method = sortMethodSelect.value;
    
    const sortFunction = (a, b) => {
      const aText = a.title.toLowerCase();  
      const bText = b.title.toLowerCase();
      switch (method) {
        case 'newest': return b.timestamp - a.timestamp;
        case 'oldest': return a.timestamp - b.timestamp;
        case 'a-z': return aText.localeCompare(bText);
        case 'z-a': return bText.localeCompare(aText);
        default: return 0;
      }
    };
  
    // Separate, sort, then recombine
    const pinned = notes.filter(n => n.pinned).sort(sortFunction);
    const unpinned = notes.filter(n => !n.pinned).sort(sortFunction);
    notes = [...pinned, ...unpinned];
}

function updateActiveTagsAndDropdown() {
    const newActiveTags = new Set();
    const tagRegex = /#([a-zA-Z0-9_]+)/g;
    notes.forEach(note => {
        const fullText = `${note.title} ${note.content}`;
        const matches = fullText.match(tagRegex);
        if (matches) {
            matches.forEach(tag => newActiveTags.add(tag.toLowerCase()));
        }
    });
    activeTags = newActiveTags;
    
    // Update dropdown (not implemented in detail for brevity, your old code is fine)
}

// ================================
// === Spotlight Implementation ===
// ================================

function openSpotlight(mode) {
  spotlightMode = mode;
  spotlightInput.value = '';
  spotlightResults.innerHTML = '';
  selectedResultIndex = -1;

  if (mode === 'add') {
    spotlightPlaceholder.textContent = 'Enter title for new note...';
    spotlightModeText.textContent = 'Add Mode';
  } else {
    spotlightPlaceholder.textContent = 'Search your notes...';
    spotlightModeText.textContent = 'Search Mode';
    renderSearchResults(notes, ''); // Show all notes initially
  }
  
  spotlightOverlay.classList.add('show');
  setTimeout(() => spotlightInput.focus(), 150);
}

function closeSpotlight() {
  spotlightOverlay.classList.remove('show');
}

function handleSpotlightInput() {
  const query = spotlightInput.value.toLowerCase().trim();
  if (spotlightMode === 'search') {
    const filtered = notes.filter(note => 
      note.title.toLowerCase().includes(query) || 
      note.content.toLowerCase().includes(query)
    );
    filteredResults = filtered;
    renderSearchResults(filtered, query);
  }
}

function renderSearchResults(results, searchTerm) {
  spotlightResults.innerHTML = '';
  if (results.length === 0 && searchTerm) {
      spotlightResults.innerHTML = `<div class="spotlight-result-item">... No results</div>`;
      return;
  }
  results.forEach((note, index) => {
    const resultItem = document.createElement('div');
    resultItem.className = 'spotlight-result-item';
    resultItem.dataset.id = note.id;
    resultItem.innerHTML = `
      <div class="spotlight-result-icon">${note.pinned ? '📌' : '📝'}</div>
      <div class="spotlight-result-text">${note.title}</div>
    `;
    resultItem.addEventListener('click', () => {
      selectSearchResult(note.id);
    });
    spotlightResults.appendChild(resultItem);
  });
}

function selectSearchResult(noteId) {
    closeSpotlight();
    showEditorView(noteId);
}

function handleSpotlightKeydown(e) {
  if (e.key === 'Escape') {
    closeSpotlight();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (spotlightMode === 'add') {
      const title = spotlightInput.value.trim();
      if (title) {
        closeSpotlight();
        addNewNote(title);
      }
    } else { // Search mode
        const results = spotlightResults.querySelectorAll('.spotlight-result-item');
        const selected = results[selectedResultIndex >= 0 ? selectedResultIndex : 0];
        if (selected) {
            selectSearchResult(selected.dataset.id);
        }
    }
  }
  // Arrow key navigation can be added here if desired
}

// ================================
// === Drag & Drop (Largely Unchanged) ===
// ================================
function handleDragStart(e) {
  draggedItem = this;
  setTimeout(() => this.classList.add('dragging'), 0);
}
function handleDragEnd() {
  if (!draggedItem) return;
  draggedItem.classList.remove('dragging');
  draggedItem = null;
  
  // Update the notes array order based on DOM order
  const newOrderedIds = [...notesList.querySelectorAll('.note-item')].map(item => item.dataset.id);
  notes.sort((a, b) => newOrderedIds.indexOf(a.id) - newOrderedIds.indexOf(b.id));
  saveNotes();
}
function getElementAfterDrag(container, y) {
  const draggableElements = [...container.querySelectorAll('.note-item:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else { return closest; }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}
notesList.addEventListener('dragover', e => {
  e.preventDefault();
  const afterElement = getElementAfterDrag(notesList, e.clientY);
  if (afterElement == null) {
    notesList.appendChild(draggedItem);
  } else {
    notesList.insertBefore(draggedItem, afterElement);
  }
});

// ================================
// === Initialization & Event Listeners ===
// ================================
document.addEventListener('DOMContentLoaded', () => {
    // Load theme first
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme === 'dark' ? 'dark-mode' : '';
    themeToggleButton.textContent = savedTheme === 'dark' ? '🌙' : '☀️';

    loadNotes(); // Load all notes and render the list
    showListView(); // Ensure we start on the list view

    // --- Event Listeners ---
    themeToggleButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        themeToggleButton.textContent = isDarkMode ? '🌙' : '☀️';
    });

    backButton.addEventListener('click', () => {
        saveNotes(); // Save changes before going back
        showListView();
    });

    sortMethodSelect.addEventListener('change', renderNotesList);
    
    addButton.addEventListener('click', () => openSpotlight('add'));
    searchButton.addEventListener('click', () => openSpotlight('search'));

    spotlightInput.addEventListener('input', handleSpotlightInput);
    spotlightInput.addEventListener('keydown', handleSpotlightKeydown);
    spotlightOverlay.addEventListener('click', (e) => {
        if (e.target === spotlightOverlay) closeSpotlight();
    });
    
    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        const isEditorFocused = document.activeElement === noteEditorTitle || document.activeElement === noteEditorContent;
        if (isEditorFocused) return; // Don't trigger shortcuts when typing in editor

        if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
            e.preventDefault();
            openSpotlight('add');
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
            e.preventDefault();
            openSpotlight('search');
        }
    });

    // Import/Export (you can integrate this with the new `notes` array)
    exportButton.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'notes.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    importButton.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const imported = JSON.parse(e.target.result);
                        // Basic validation
                        if (Array.isArray(imported) && imported.every(n => n.id && n.title)) {
                            notes = imported;
                            saveNotes();
                            renderNotesList();
                        } else {
                           alert('Invalid note format in JSON file.');
                        }
                    } catch {
                        alert('Invalid JSON file.');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    });
});
