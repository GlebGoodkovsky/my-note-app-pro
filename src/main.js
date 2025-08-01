// ================================
// === DOM Element Definitions ===
// ================================
const themeToggleButton = document.getElementById('theme-toggle');
const appContainer = document.getElementById('app-container');

// --- Sidebar Elements ---
const sidebar = document.getElementById('sidebar');
const notesList = document.getElementById('notes-list');
const sortMethodSelect = document.getElementById('sort-method');
const addNoteSidebarBtn = document.getElementById('add-note-sidebar'); // THE FIX IS HERE
const searchButton = document.getElementById('search-button');

// --- Main Content Elements ---
const mainContent = document.getElementById('main-content');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const noteEditorTitle = document.getElementById('note-editor-title');
const noteEditorContent = document.getElementById('note-editor-content');
const exportButton = document.getElementById('export-button');
const importButton = document.getElementById('import-button');

// --- Spotlight Modal Elements ---
const spotlightOverlay = document.getElementById('spotlight-overlay');
const spotlightInput = document.getElementById('spotlight-input');
const spotlightPlaceholder = document.getElementById('spotlight-placeholder');
const spotlightResults = document.getElementById('spotlight-results');
const spotlightModeText = document.getElementById('spotlight-mode-text');

// ================================
// === Global State & Variables ===
// ================================
let notes = []; // The single source of truth for all notes
let currentEditingNoteId = null;
let saveTimeout = null; // Used for debouncing saves
let draggedItem = null;
let activeTags = new Set();
let spotlightMode = 'add';
let selectedResultIndex = -1;

// ================================
// === Core App Logic ===
// ================================

/**
 * Populates the main editor view with the content of a specific note.
 * @param {string | null} noteId The ID of the note to display, or null to clear the editor.
 */
function populateEditor(noteId) {
    const note = notes.find(n => n.id === noteId);

    // Visually mark the selected note in the sidebar
    document.querySelectorAll('#notes-list .note-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === noteId);
    });

    if (!note) {
        currentEditingNoteId = null;
        noteEditorTitle.value = "";
        noteEditorContent.value = "";
        noteEditorTitle.placeholder = "Select a note or create a new one...";
        noteEditorContent.placeholder = "";
        noteEditorTitle.disabled = true;
        noteEditorContent.disabled = true;
        return;
    }

    currentEditingNoteId = noteId;
    noteEditorTitle.value = note.title;
    noteEditorContent.value = note.content;
    noteEditorTitle.disabled = false;
    noteEditorContent.disabled = false;
    noteEditorTitle.placeholder = "Your Title Here...";
    
    // On mobile, automatically hide the sidebar after selecting a note for a better UX
    if (window.innerWidth <= 768 && !document.body.classList.contains('sidebar-collapsed')) {
        document.body.classList.add('sidebar-collapsed');
    }
}

/**
 * Saves the currently active note to the global `notes` array and triggers a debounced save to localStorage.
 */
function saveCurrentNote() {
    if (!currentEditingNoteId) return;

    const note = notes.find(n => n.id === currentEditingNoteId);
    if (note) {
        note.title = noteEditorTitle.value || "Untitled Note";
        note.content = noteEditorContent.value;
        note.timestamp = Date.now(); // Update timestamp on edit

        // Update the title in the sidebar list in real-time
        const noteListItem = notesList.querySelector(`.note-item[data-id="${currentEditingNoteId}"] .note-text`);
        if (noteListItem) noteListItem.textContent = note.title;

        // Debounce saving to localStorage to avoid performance issues
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveNotesToStorage, 500);
    }
}

/**
 * Renders the entire list of notes in the sidebar based on the global `notes` array.
 */
function renderNotesList() {
    sortNotes(); // Ensure the notes array is sorted before rendering
    notesList.innerHTML = ''; // Clear the current list
    notes.forEach(note => createNoteListItem(note));
    updateActiveTagsAndDropdown();

    // Re-apply the active class to the selected note
    if (currentEditingNoteId) {
        const activeItem = notesList.querySelector(`.note-item[data-id="${currentEditingNoteId}"]`);
        if (activeItem) activeItem.classList.add('active');
    }
}

/**
 * Creates a single note list item element for the sidebar.
 * @param {object} note The note object to create an item for.
 */
function createNoteListItem(note) {
    const noteItem = document.createElement('li');
    noteItem.className = 'note-item';
    noteItem.dataset.id = note.id;
    noteItem.draggable = true;
    if (note.pinned) noteItem.classList.add('pinned');

    const noteContent = document.createElement('div');
    noteContent.className = 'note-content';

    const textSpan = document.createElement('span');
    textSpan.className = 'note-text';
    textSpan.textContent = note.title;

    const pinButton = document.createElement('button');
    pinButton.className = "pin-btn";
    pinButton.innerHTML = '📍';
    pinButton.title = 'Pin note';

    const deleteButton = document.createElement('button');
    deleteButton.className = "delete-btn";
    deleteButton.innerHTML = '🗑️';
    deleteButton.title = 'Delete note';

    // --- Event Listeners ---
    noteItem.addEventListener('click', () => populateEditor(note.id));
    pinButton.addEventListener('click', e => { e.stopPropagation(); togglePin(note.id); });
    deleteButton.addEventListener('click', e => { e.stopPropagation(); deleteNote(note.id, noteContent); });
    noteItem.addEventListener('dragstart', handleDragStart);
    noteItem.addEventListener('dragend', handleDragEnd);

    noteContent.appendChild(textSpan);
    noteContent.appendChild(pinButton);
    noteContent.appendChild(deleteButton);
    noteItem.appendChild(noteContent);
    notesList.appendChild(noteItem);
}

// ================================
// === Feature Implementations ===
// ================================

function addNewNote(title) {
    const newNote = {
        id: 'note-' + Date.now(),
        title: title || "Untitled Note",
        content: "",
        timestamp: Date.now(),
        pinned: false,
    };
    notes.unshift(newNote); // Add to the top of the array
    renderNotesList(); // Re-render the list to show the new note
    populateEditor(newNote.id); // Open the new note in the editor
    noteEditorContent.focus(); // Focus the content area
    saveNotesToStorage();
}

function deleteNote(noteId, noteElement) {
    noteElement.classList.add('deleting');
    noteElement.addEventListener('animationend', () => {
        notes = notes.filter(n => n.id !== noteId);
        if (currentEditingNoteId === noteId) {
            populateEditor(notes[0]?.id || null); // Open first available note or clear editor
        }
        renderNotesList();
        saveNotesToStorage();
    });
}

function togglePin(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        note.pinned = !note.pinned;
        note.timestamp = Date.now();
    }
    renderNotesList();
    saveNotesToStorage();
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
    const pinned = notes.filter(n => n.pinned).sort(sortFunction);
    const unpinned = notes.filter(n => !n.pinned).sort(sortFunction);
    notes = [...pinned, ...unpinned];
}

function updateActiveTagsAndDropdown() {
    // This function can be expanded later if tag filtering is re-introduced
}

// ================================
// === Data Persistence ===
// ================================

function saveNotesToStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

function loadNotesFromStorage() {
    let savedNotes = JSON.parse(localStorage.getItem('notes') || '[]');
    // Simple migration for old format. Can be removed later.
    if (savedNotes.length > 0 && typeof savedNotes[0] === 'object' && savedNotes[0].hasOwnProperty('text')) {
        savedNotes = savedNotes.map(oldNote => ({
            id: oldNote.id,
            title: oldNote.text.split('\n')[0] || 'Untitled Note',
            content: oldNote.text.split('\n').slice(1).join('\n'),
            timestamp: oldNote.timestamp,
            pinned: oldNote.pinned || false,
        }));
    }
    notes = savedNotes;
    renderNotesList();
}

// ================================
// === Spotlight & Search ===
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
        renderSearchResults(notes, '');
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
        renderSearchResults(filtered, query);
    }
}

function renderSearchResults(results, searchTerm) {
    spotlightResults.innerHTML = '';
    if (results.length === 0 && searchTerm) {
        spotlightResults.innerHTML = `<div class="spotlight-result-item">No notes found for "${searchTerm}"</div>`;
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
        resultItem.addEventListener('click', () => selectSearchResult(note.id));
        spotlightResults.appendChild(resultItem);
    });
}

function selectSearchResult(noteId) {
    closeSpotlight();
    populateEditor(noteId);
    noteEditorContent.focus();
}

function handleSpotlightKeydown(e) {
    if (e.key === 'Escape') closeSpotlight();
    else if (e.key === 'Enter') {
        e.preventDefault();
        if (spotlightMode === 'add') {
            const title = spotlightInput.value.trim();
            if (title) {
                closeSpotlight();
                addNewNote(title);
            }
        } else {
            const selected = spotlightResults.querySelector('.selected') || spotlightResults.querySelector('.spotlight-result-item');
            if (selected) selectSearchResult(selected.dataset.id);
        }
    }
    // Arrow key navigation can be added here
}


// ================================
// === Drag & Drop ===
// ================================

function handleDragStart(e) {
    draggedItem = this;
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragEnd() {
    if (!draggedItem) return;
    draggedItem.classList.remove('dragging');
    draggedItem = null;

    const newOrderedIds = [...notesList.querySelectorAll('.note-item')].map(item => item.dataset.id);
    notes.sort((a, b) => newOrderedIds.indexOf(a.id) - newOrderedIds.indexOf(b.id));
    saveNotesToStorage();
}

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

// ================================
// === Initialization ===
// ================================

function init() {
    // --- Load Theme ---
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme === 'dark' ? 'dark-mode' : '';
    themeToggleButton.textContent = savedTheme === 'dark' ? '🌙' : '☀️';

    // --- Setup Sidebar Collapse ---
    if (window.innerWidth <= 768) {
        document.body.classList.add('sidebar-collapsed');
    }

    // --- Load Data & Setup Editor ---
    loadNotesFromStorage();
    populateEditor(notes.find(n => n.pinned)?.id || notes[0]?.id || null); // Open first pinned/regular note or nothing

    // --- Add Event Listeners ---
    themeToggleButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        themeToggleButton.textContent = isDarkMode ? '🌙' : '☀️';
    });

    sidebarToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed');
    });

    addNoteSidebarBtn.addEventListener('click', () => openSpotlight('add'));
    searchButton.addEventListener('click', () => openSpotlight('search'));

    sortMethodSelect.addEventListener('change', renderNotesList);

    noteEditorTitle.addEventListener('input', saveCurrentNote);
    noteEditorContent.addEventListener('input', saveCurrentNote);

    spotlightInput.addEventListener('input', handleSpotlightInput);
    spotlightInput.addEventListener('keydown', handleSpotlightKeydown);
    spotlightOverlay.addEventListener('click', (e) => {
        if (e.target === spotlightOverlay) closeSpotlight();
    });

    notesList.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getElementAfterDrag(notesList, e.clientY);
        if (afterElement) {
            notesList.insertBefore(draggedItem, afterElement);
        } else {
            notesList.appendChild(draggedItem);
        }
    });

    exportButton.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'notes.json';
        a.click();
        URL.revokeObjectURL(a.href);
    });
    
    importButton.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const imported = JSON.parse(e.target.result);
                    if (Array.isArray(imported) && imported.every(n => n.id && n.title !== undefined)) {
                        notes = imported;
                        saveNotesToStorage();
                        renderNotesList();
                        populateEditor(notes[0]?.id || null);
                    } else {
                       alert('Invalid note format in JSON file.');
                    }
                } catch {
                    alert('Invalid JSON file.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });
}

// Kick off the application
document.addEventListener('DOMContentLoaded', init);
