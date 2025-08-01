# My Note App Pro

A clean, feature-rich, and modern note-taking web application built with vanilla HTML, CSS, and JavaScript. It features a fluid, animated interface and saves all notes directly in your browser's local storage.

### [➡️ Live Demo ⬅️](https://glebgoodkovsky.github.io/my-note-app-pro/)

---

## ⚠️ Important User Information

### Data Security Warning

This application stores all note data directly in your browser's `localStorage`. The data is **not encrypted**. For your own security and privacy, please **do not** store sensitive information such as passwords, personal identification numbers, or private keys in this application.

---

## ✨ Features

This application goes beyond a simple notepad, offering a professional suite of features for a seamless user experience.

-   **Full Note Management**: Create, edit, and delete notes with ease through an intuitive two-pane interface.
-   **Rich Text Editor**: A dedicated editor pane allows for multi-line note content beyond just a simple title.
-   **Dark & Light Themes**: Toggle between a sleek dark mode and a clean light mode. Your preference is saved automatically.
-   **Powerful Organization**:
    -   **Pinning**: Pin your most important notes to the top of the list.
    -   **Drag & Drop Reordering**: Intuitively change the order of your notes by dragging them in the sidebar.
    -   **Advanced Sorting**: Instantly sort all notes by Newest, Oldest, Title (A-Z), or Title (Z-A).
-   **Undo & Redo History**: Never lose a change. Step backward and forward through your actions (note creation, deletion, edits, pins, and reorders) using `Ctrl/Cmd+Z` and `Ctrl/Cmd+Y`.
-   **Spotlight Command Palette**:
    -   **Quick Add**: Press the `➕` button to open a modal and quickly add a new note by title.
    -   **Quick Search**: Press the `🔍` button to search the titles and content of all your notes instantly.
-   **Data Portability**:
    -   **Export**: Save all your notes to a `notes.json` file as a backup.
    -   **Import**: Load notes from a previously exported JSON file.
-   **Polished & Responsive UI**:
    -   **Smooth Animations**: Enjoy fluid animations for deleting notes, undoing actions, and interacting with buttons.
    -   **Collapsible Sidebar**: The app is fully responsive and features a collapsible sidebar for an optimal experience on any screen size.

---

## 🛠️ How It Works (Tech Stack)

This project uses fundamental web technologies, enhanced by a modern build process for performance and reliability.

-   **HTML:** Structures the content and layout of the application.
-   **CSS:** Handles all styling, including the layout, light/dark themes, responsive design, and all animations.
-   **JavaScript (Vanilla JS):** Powers all the interactive logic, from note management and local storage persistence to the undo/redo history and drag-and-drop functionality.
-   **Vite:** Acts as a lightning-fast development server and bundles the code for production, automatically handling optimizations.
-   **GitHub Actions:** Provides a fully automated CI/CD pipeline to build and deploy the application to GitHub Pages on every push to the `main` branch.

---

## 🚀 How to Use

1.  **Open the [Live Demo](https://glebgoodkovsky.github.io/my-note-app-pro/).**
2.  **Add a Note:** Click the `➕` button, type a title in the pop-up modal, and press `Enter`.
3.  **Search for a Note:** Click the `🔍` button, type your query, and click a result to open it in the editor.
4.  **Edit a Note:** Select any note from the list on the left. The editor on the right will become active. Changes are saved automatically as you type.
5.  **Pin/Delete a Note:** Hover over a note in the list and click the `📌` (pin) or `🗑️` (delete) icon.
6.  **Reorder Notes:** Click and hold any note in the list, then drag it to a new position.
7.  **Change Theme:** Click the `☀️`/`🌙` icon in the top right.
8.  **Sort Notes:** Use the dropdown menu in the sidebar to re-sort the entire list.
9.  **Import/Export:** Use the "Import" and "Export" buttons in the main header to manage your data.

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
