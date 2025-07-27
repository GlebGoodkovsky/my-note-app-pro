# Simple Note App

A clean, simple, and modern note-taking web application built with vanilla HTML, CSS, and JavaScript, and deployed using a modern, automated workflow. All notes are saved directly in your browser's local storage.

### [➡️ Live Demo ⬅️](https://glebgoodkovsky.github.io/my-note-app-pro/)

---

## ⚠️ Important User Information

### Data Security Warning

This application stores notes directly in your browser's `localStorage`. The data is **not encrypted**. For your own security, please do not store sensitive information such as passwords, personal identification numbers, or private keys.

Below is the **updated README** (plain markdown) that adds every new feature you’ve shipped since the last official copy.

Simply **append** the new bullets under the relevant headings.

---

## ✨ New Features & Polish

- **Pastel Hashtag Colors**  
  Every unique `#tag` receives its own gentle pastel color; identical tags keep the same hue across sessions.

- **Purple Search Theme**  
  When the search bar is active, both the input field and the 🔍 search button switch to a consistent purple accent in light and dark modes.

- **Improved Dark-Mode Legibility**  
  Text inside colored hashtag badges is now black while in dark mode, making tags easier to read.

- **Rapid Search & Highlight**  
  Real-time highlighting of search terms inside notes, plus persistent tag-based filtering from the sort dropdown.

- **Undo / Redo Shortcuts**  
  Use Ctrl + Z / Ctrl + Y (Cmd + Z / Cmd + Shift + Z on macOS) to step backward or forward through note changes.

- **Keyboard Search Toggle**  
  Press Ctrl + F (or Cmd + F) to show / hide the search bar without clicking.

- **Responsive Drag Handle**  
  On mobile, a subtle `⋮⋮` indicator appears so users know notes are draggable.

- **Empty-State Message**  
  A friendly “No notes yet – start typing!” prompt shows when the list is blank.

---

## 🛠️ Additional Tech Details

- **Security**: All note content is sanitized with [DOMPurify](https://github.com/cure53/DOMPurify) before rendering to prevent XSS.  
- **Performance**: Input debouncing and virtualized re-rendering keep the UI snappy with large note sets.  
- **Accessibility**: Emoji buttons now have `aria-label`s and all interactive elements are keyboard-reachable.

---

## 🛠️ How It Works (Tech Stack)

This project uses fundamental web technologies, enhanced by a modern build process for performance and reliability.

-   **HTML:** Structures the content of the application.
-   **CSS:** Handles all styling, including the layout, themes, and responsive design.
-   **JavaScript (Vanilla JS):** Powers all the interactive logic for note management, including drag-and-drop functionality.
-   **Vite:** Acts as a lightning-fast development server and bundles the code for production, automatically handling optimizations and cache-busting.
-   **GitHub Actions:** Provides a fully automated CI/CD pipeline to build and deploy the application to GitHub Pages on every push to the `main` branch.

---

## 🚀 How to Use

1.  **Open the [Live Demo](https://glebgoodkovsky.github.io/my-note-app-pro/).**
2.  **Change Theme:** Click the ☀️/🌙 icon in the top right.
3.  **Add a Note:** Type in the input field and click "Add" or simply press `Enter`.
4.  **Edit a Note:** Click on the note text, make your changes, and click outside or press `Enter` to save.
5.  **Reorder Notes:** Click and hold any note, then drag it up or down to a new position.
6.  **Delete a Note:** Hover over a note and click the 🗑️ icon.
7.  **Sort Notes:** Choose a new method from the dropdown menu to instantly re-sort the entire list.
8.  **Toggle Search/Filter:** Click the search/sort icon (🔍) or press `Ctrl + F` to reveal/hide the search bar.

---

## 💻 Running Locally

To run this project on your own machine, you will need to have [Node.js](https://nodejs.org/) installed.

1.  Clone this repository:
    ```bash
    git clone https://github.com/GlebGoodkovsky/my-note-app-pro.git
    ```
2.  Navigate into the project directory:
    ```bash
    cd my-note-app-pro
    ```
3.  Install the necessary dependencies:
    ```bash
    npm install
    ```
4.  Start the live development server:
    ```bash
    npm run dev
    ```
5.  Open your browser and navigate to the local URL provided (usually `http://localhost:5173/`).

---

## 🤝 Contributing

Suggestions and improvements are welcome! Feel free to open an issue to discuss a new feature or submit a pull request.

---

## A Note on the Learning Process

This project was created as a hands-on exercise to develop my programming skills. It started as a simple web page and has evolved into a modern application with a professional development workflow and automated deployment pipeline.

I want to be transparent about the process: I used an AI assistant as a tool to help write and, more importantly, *explain* the code. My goal was to learn how to code *with* AI, using it as a learning partner to grasp fundamentals step-by-step. This project is a result of that learning journey.
