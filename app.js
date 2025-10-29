/**
 * Main Application Logic for Flow Text Editor
 */

// Global state
let db;
let grammarChecker;
let currentProject = null;
let currentDocument = null;
let autoSaveTimeout = null;

// Initialize the application
async function initApp() {
    try {
        // Initialize database
        db = new FlowDB();
        await db.init();
        
        // Initialize grammar checker
        grammarChecker = new GrammarChecker();
        
        // Load projects
        await loadProjects();
        
        // Set up event listeners
        setupEventListeners();
        
        // Update status
        updateStatus('Offline Ready', true);
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        updateStatus('Error: Failed to initialize', false);
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Project management
    document.getElementById('newProjectBtn').addEventListener('click', openProjectModal);
    document.getElementById('projectSelect').addEventListener('change', handleProjectChange);
    
    // Document management
    document.getElementById('newDocBtn').addEventListener('click', createNewDocument);
    
    // Editor controls
    document.getElementById('documentTitle').addEventListener('input', handleTitleChange);
    document.getElementById('editor').addEventListener('input', handleEditorChange);
    document.getElementById('saveBtn').addEventListener('click', saveDocument);
    
    // Toolbar controls
    document.getElementById('boldBtn').addEventListener('click', () => execCommand('bold'));
    document.getElementById('italicBtn').addEventListener('click', () => execCommand('italic'));
    document.getElementById('underlineBtn').addEventListener('click', () => execCommand('underline'));
    document.getElementById('alignLeftBtn').addEventListener('click', () => execCommand('justifyLeft'));
    document.getElementById('alignCenterBtn').addEventListener('click', () => execCommand('justifyCenter'));
    document.getElementById('alignRightBtn').addEventListener('click', () => execCommand('justifyRight'));
    document.getElementById('indentBtn').addEventListener('click', () => execCommand('indent'));
    document.getElementById('outdentBtn').addEventListener('click', () => execCommand('outdent'));
    document.getElementById('bulletListBtn').addEventListener('click', () => execCommand('insertUnorderedList'));
    document.getElementById('numberListBtn').addEventListener('click', () => execCommand('insertOrderedList'));
    
    // Font controls
    document.getElementById('fontFamily').addEventListener('change', (e) => {
        execCommand('fontName', e.target.value);
    });
    
    document.getElementById('fontSize').addEventListener('change', (e) => {
        execCommand('fontSize', e.target.value);
    });
    
    document.getElementById('textColor').addEventListener('change', (e) => {
        execCommand('foreColor', e.target.value);
    });
    
    document.getElementById('bgColor').addEventListener('change', (e) => {
        execCommand('backColor', e.target.value);
    });
    
    // Grammar tools
    document.getElementById('instantCorrectBtn').addEventListener('click', instantCorrectAll);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                execCommand('bold');
                break;
            case 'i':
                e.preventDefault();
                execCommand('italic');
                break;
            case 'u':
                e.preventDefault();
                execCommand('underline');
                break;
            case 's':
                e.preventDefault();
                saveDocument();
                break;
        }
    }
}

// Execute formatting command
function execCommand(command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('editor').focus();
}

// Load all projects
async function loadProjects() {
    try {
        const projects = await db.getAllProjects();
        const projectSelect = document.getElementById('projectSelect');
        
        // Clear existing options (except the first one)
        projectSelect.innerHTML = '<option value="">Select Project</option>';
        
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectSelect.appendChild(option);
        });
        
        // If we have a current project, select it
        if (currentProject) {
            projectSelect.value = currentProject.id;
        }
    } catch (error) {
        console.error('Failed to load projects:', error);
    }
}

// Open project modal
function openProjectModal() {
    document.getElementById('projectModal').classList.add('show');
    document.getElementById('projectName').focus();
}

// Close project modal
function closeProjectModal() {
    document.getElementById('projectModal').classList.remove('show');
    document.getElementById('projectName').value = '';
}

// Create new project
async function createProject() {
    const projectName = document.getElementById('projectName').value.trim();
    
    if (!projectName) {
        alert('Please enter a project name');
        return;
    }
    
    try {
        const projectId = await db.createProject(projectName);
        await loadProjects();
        
        // Select the new project
        document.getElementById('projectSelect').value = projectId;
        await handleProjectChange();
        
        closeProjectModal();
    } catch (error) {
        console.error('Failed to create project:', error);
        alert('Failed to create project');
    }
}

// Handle project change
async function handleProjectChange() {
    const projectSelect = document.getElementById('projectSelect');
    const projectId = parseInt(projectSelect.value);
    
    if (!projectId) {
        currentProject = null;
        displayDocuments([]);
        return;
    }
    
    try {
        currentProject = await db.getProject(projectId);
        const documents = await db.getDocumentsByProject(projectId);
        displayDocuments(documents);
    } catch (error) {
        console.error('Failed to load project:', error);
    }
}

// Display documents in sidebar
function displayDocuments(documents) {
    const documentList = document.getElementById('documentList');
    
    if (documents.length === 0) {
        documentList.innerHTML = `
            <div class="empty-state">
                <p>No documents yet</p>
                <p class="text-muted">Click "+ New" to create a document</p>
            </div>
        `;
        return;
    }
    
    documentList.innerHTML = '';
    documents.forEach(doc => {
        const docItem = document.createElement('div');
        docItem.className = 'document-item';
        if (currentDocument && currentDocument.id === doc.id) {
            docItem.classList.add('active');
        }
        
        const date = new Date(doc.updatedAt).toLocaleDateString();
        docItem.innerHTML = `
            <div class="document-item-title">${doc.title}</div>
            <div class="document-item-date">${date}</div>
        `;
        
        docItem.addEventListener('click', () => loadDocument(doc.id));
        documentList.appendChild(docItem);
    });
}

// Create new document
async function createNewDocument() {
    if (!currentProject) {
        alert('Please select a project first');
        return;
    }
    
    try {
        const docId = await db.createDocument(currentProject.id, 'Untitled Document', '<p>Start typing...</p>');
        const documents = await db.getDocumentsByProject(currentProject.id);
        displayDocuments(documents);
        await loadDocument(docId);
    } catch (error) {
        console.error('Failed to create document:', error);
        alert('Failed to create document');
    }
}

// Load document into editor
async function loadDocument(docId) {
    try {
        const doc = await db.getDocument(docId);
        currentDocument = doc;
        
        // Update UI
        document.getElementById('documentTitle').value = doc.title;
        document.getElementById('editor').innerHTML = doc.content;
        
        // Update document list to show active document
        const documents = await db.getDocumentsByProject(currentProject.id);
        displayDocuments(documents);
        
        // Update grammar check
        updateGrammarCheck();
    } catch (error) {
        console.error('Failed to load document:', error);
        alert('Failed to load document');
    }
}

// Handle title change
function handleTitleChange() {
    if (currentDocument) {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            saveDocument(false);
        }, 1000);
    }
}

// Handle editor change
function handleEditorChange() {
    if (currentDocument) {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            saveDocument(false);
        }, 2000);
        
        // Update grammar check
        updateGrammarCheck();
    }
}

// Save document
async function saveDocument(showNotification = true) {
    if (!currentDocument) {
        return;
    }
    
    try {
        const title = document.getElementById('documentTitle').value.trim() || 'Untitled Document';
        const content = document.getElementById('editor').innerHTML;
        
        await db.updateDocument(currentDocument.id, {
            title: title,
            content: content
        });
        
        // Update current document
        currentDocument.title = title;
        currentDocument.content = content;
        
        // Refresh document list
        const documents = await db.getDocumentsByProject(currentProject.id);
        displayDocuments(documents);
        
        if (showNotification) {
            updateStatus('Document saved', true);
            setTimeout(() => {
                updateStatus('Offline Ready', true);
            }, 2000);
        }
    } catch (error) {
        console.error('Failed to save document:', error);
        updateStatus('Failed to save', false);
    }
}

// Update grammar check
function updateGrammarCheck() {
    const editor = document.getElementById('editor');
    const text = editor.innerText;
    
    // Update word count
    const wordCount = grammarChecker.countWords(text);
    document.getElementById('wordCount').textContent = wordCount;
    
    // Check grammar
    const issues = grammarChecker.checkGrammar(text);
    document.getElementById('issuesCount').textContent = issues.length;
    
    // Display suggestions
    displayGrammarSuggestions(issues);
}

// Display grammar suggestions
function displayGrammarSuggestions(issues) {
    const container = document.getElementById('grammarSuggestions');
    
    if (issues.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No grammar issues detected</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    issues.slice(0, 10).forEach(issue => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.innerHTML = `
            <div class="suggestion-text">${issue.description}</div>
            <div class="suggestion-fix">Suggestion: "${issue.suggestion}"</div>
        `;
        container.appendChild(suggestionItem);
    });
}

// Instant correct all grammar issues
function instantCorrectAll() {
    if (!currentDocument) {
        return;
    }
    
    const editor = document.getElementById('editor');
    const text = editor.innerText;
    
    const correctedText = grammarChecker.correctAll(text);
    
    // Replace text while preserving formatting
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editor.innerHTML;
    tempDiv.innerText = correctedText;
    editor.innerHTML = tempDiv.innerHTML;
    
    // Save and update
    saveDocument(false);
    updateGrammarCheck();
    
    updateStatus('Grammar corrections applied', true);
    setTimeout(() => {
        updateStatus('Offline Ready', true);
    }, 2000);
}

// Update status indicator
function updateStatus(message, isOnline) {
    document.getElementById('statusText').textContent = message;
    const statusDot = document.querySelector('.status-dot');
    statusDot.style.background = isOnline ? '#2ecc71' : '#e74c3c';
}

// Make functions globally available
window.closeProjectModal = closeProjectModal;
window.createProject = createProject;

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
