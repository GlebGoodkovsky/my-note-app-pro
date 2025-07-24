const noteInput = document.getElementById('note-input');
const searchButton = document.getElementById('search-button');
const notesList = document.getElementById('notes-list');
const sortMethodSelect = document.getElementById('sort-method');
const controlsContainer = document.getElementById('controls-container');
const customPlaceholder = document.getElementById('custom-placeholder');

const noteTimestamps = {};
let draggedItem = null;

// ================================
// === Core Note Functions ===
// ================================

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

const buildNote = (text) => {
  const noteItem = document.createElement('li');
  noteItem.className = 'note-item';
  noteItem.draggable = true;
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

  deleteButton.addEventListener('click', (e) => {
    e.stopPropagation();
    noteContent.classList.add('deleting');
    noteContent.addEventListener('animationend', () => {
      noteItem.remove();
      delete noteTimestamps[noteId];
      saveNotes();
    });
  });

  noteContent.addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn')) return;
    if (noteContent.classList.contains('editing')) return;
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
    saveNotes();
    filterNotes();
  });

  // DELETED: The `textSpan.addEventListener('keydown', ...)` block was here.
  // By removing it, the 'Enter' key no longer saves the note and instead
  // performs its default action, which is to create a new line.

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
  }
  if (indicator) indicator.remove();
  saveNotes();
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
  saveNotes();
}

function addNote() {
  const userText = noteInput.value.trim();
  if (userText === "") return;
  buildNote(userText);
  saveNotes();
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
  savedNotes.forEach(note => buildNote(note.text));
  
  document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.getElementById('theme-toggle').textContent = isDarkMode ? '🌙' : '☀️';
  });

  sortMethodSelect.addEventListener('change', sortNotes);
  
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      if (controlsContainer.classList.contains('search-active')) {
        exitSearchMode();
      } else {
        enterSearchMode();
      }
    }
  });
});