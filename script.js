// DOM Elements
const editor = document.getElementById('editor');
const documentTitle = document.getElementById('documentTitle');

// Toolbar Buttons
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const boldBtn = document.getElementById('boldBtn');
const italicBtn = document.getElementById('italicBtn');
const underlineBtn = document.getElementById('underlineBtn');
const strikeBtn = document.getElementById('strikeBtn');
const alignLeftBtn = document.getElementById('alignLeftBtn');
const alignCenterBtn = document.getElementById('alignCenterBtn');
const alignRightBtn = document.getElementById('alignRightBtn');
const alignJustifyBtn = document.getElementById('alignJustifyBtn');
const orderedListBtn = document.getElementById('orderedListBtn');
const unorderedListBtn = document.getElementById('unorderedListBtn');
const clearFormatBtn = document.getElementById('clearFormatBtn');

// Toolbar Selects
const fontFamily = document.getElementById('fontFamily');
const fontSize = document.getElementById('fontSize');
const lineSpacing = document.getElementById('lineSpacing');

// Color Inputs
const textColor = document.getElementById('textColor');
const textColorBtn = document.getElementById('textColorBtn');
const textColorIndicator = document.getElementById('textColorIndicator');
const highlightColor = document.getElementById('highlightColor');
const highlightBtn = document.getElementById('highlightBtn');
const highlightColorIndicator = document.getElementById('highlightColorIndicator');

// Action Buttons
const saveBtn = document.getElementById('saveBtn');
const exportBtn = document.getElementById('exportBtn');

// Status Elements
const wordCount = document.getElementById('wordCount');
const charCount = document.getElementById('charCount');
const lastSaved = document.getElementById('lastSaved');

// Initialize
let autoSaveTimer;

// Format Commands
function executeCommand(command, value = null) {
    document.execCommand(command, false, value);
    editor.focus();
    updateToolbarState();
}

// Toolbar Button Event Listeners
undoBtn.addEventListener('click', () => executeCommand('undo'));
redoBtn.addEventListener('click', () => executeCommand('redo'));
boldBtn.addEventListener('click', () => executeCommand('bold'));
italicBtn.addEventListener('click', () => executeCommand('italic'));
underlineBtn.addEventListener('click', () => executeCommand('underline'));
strikeBtn.addEventListener('click', () => executeCommand('strikeThrough'));
alignLeftBtn.addEventListener('click', () => executeCommand('justifyLeft'));
alignCenterBtn.addEventListener('click', () => executeCommand('justifyCenter'));
alignRightBtn.addEventListener('click', () => executeCommand('justifyRight'));
alignJustifyBtn.addEventListener('click', () => executeCommand('justifyFull'));
orderedListBtn.addEventListener('click', () => executeCommand('insertOrderedList'));
unorderedListBtn.addEventListener('click', () => executeCommand('insertUnorderedList'));
clearFormatBtn.addEventListener('click', () => executeCommand('removeFormat'));

// Font Family
fontFamily.addEventListener('change', (e) => {
    executeCommand('fontName', e.target.value);
});

// Font Size
fontSize.addEventListener('change', (e) => {
    executeCommand('fontSize', e.target.value);
});

// Line Spacing
lineSpacing.addEventListener('change', (e) => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const parentElement = range.commonAncestorContainer.parentElement;
        
        // Find the paragraph or parent block element
        let blockElement = parentElement;
        while (blockElement && blockElement !== editor && !['P', 'DIV', 'LI'].includes(blockElement.tagName)) {
            blockElement = blockElement.parentElement;
        }
        
        if (blockElement && blockElement !== editor) {
            blockElement.style.lineHeight = e.target.value;
        }
    }
    editor.focus();
});

// Text Color
textColorBtn.addEventListener('click', () => {
    textColor.click();
});

textColor.addEventListener('input', (e) => {
    executeCommand('foreColor', e.target.value);
    textColorIndicator.style.background = e.target.value;
});

// Highlight Color
highlightBtn.addEventListener('click', () => {
    highlightColor.click();
});

highlightColor.addEventListener('input', (e) => {
    executeCommand('backColor', e.target.value);
    highlightColorIndicator.style.background = e.target.value;
});

// Update Toolbar State
function updateToolbarState() {
    // Update button active states
    boldBtn.classList.toggle('active', document.queryCommandState('bold'));
    italicBtn.classList.toggle('active', document.queryCommandState('italic'));
    underlineBtn.classList.toggle('active', document.queryCommandState('underline'));
    strikeBtn.classList.toggle('active', document.queryCommandState('strikeThrough'));
    alignLeftBtn.classList.toggle('active', document.queryCommandState('justifyLeft'));
    alignCenterBtn.classList.toggle('active', document.queryCommandState('justifyCenter'));
    alignRightBtn.classList.toggle('active', document.queryCommandState('justifyRight'));
    alignJustifyBtn.classList.toggle('active', document.queryCommandState('justifyFull'));
    orderedListBtn.classList.toggle('active', document.queryCommandState('insertOrderedList'));
    unorderedListBtn.classList.toggle('active', document.queryCommandState('insertUnorderedList'));
    
    // Update font family
    const currentFont = document.queryCommandValue('fontName');
    if (currentFont) {
        fontFamily.value = currentFont.replace(/['"]/g, '');
    }
    
    // Update font size
    const currentSize = document.queryCommandValue('fontSize');
    if (currentSize) {
        fontSize.value = currentSize;
    }
}

// Word and Character Count
function updateCounts() {
    const text = editor.innerText || '';
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const chars = text.length;
    
    wordCount.textContent = `${words.length} word${words.length !== 1 ? 's' : ''}`;
    charCount.textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
}

// Editor Event Listeners
editor.addEventListener('input', () => {
    updateCounts();
    scheduleAutoSave();
});

editor.addEventListener('keyup', updateToolbarState);
editor.addEventListener('mouseup', updateToolbarState);

// Keyboard Shortcuts
editor.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + B for Bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        executeCommand('bold');
    }
    
    // Ctrl/Cmd + I for Italic
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        executeCommand('italic');
    }
    
    // Ctrl/Cmd + U for Underline
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        executeCommand('underline');
    }
    
    // Ctrl/Cmd + S for Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDocument();
    }
});

// Save Functionality
function saveDocument() {
    const documentData = {
        title: documentTitle.value,
        content: editor.innerHTML,
        timestamp: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem('flowDocument', JSON.stringify(documentData));
    
    // Update last saved time
    const now = new Date();
    lastSaved.textContent = `Last saved: ${now.toLocaleTimeString()}`;
    
    // Visual feedback
    saveBtn.textContent = '✓ Saved';
    setTimeout(() => {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
    }, 2000);
}

// Auto-save
function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveDocument();
    }, 3000); // Auto-save after 3 seconds of inactivity
}

saveBtn.addEventListener('click', saveDocument);

// Export Functionality
exportBtn.addEventListener('click', () => {
    const content = editor.innerHTML;
    const title = documentTitle.value || 'Untitled Document';
    
    // Create HTML document
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Inter', Arial, sans-serif;
            max-width: 850px;
            margin: 40px auto;
            padding: 60px 80px;
            line-height: 1.5;
            color: #212529;
        }
        p { margin-bottom: 12px; }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 16px;
            margin-bottom: 12px;
            font-weight: 600;
        }
        ul, ol { margin-left: 24px; margin-bottom: 12px; }
        li { margin-bottom: 4px; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${content}
</body>
</html>
    `;
    
    // Create and download file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    // Visual feedback
    exportBtn.innerHTML = '<i class="fas fa-check"></i> Exported';
    setTimeout(() => {
        exportBtn.innerHTML = '<i class="fas fa-download"></i> Export';
    }, 2000);
});

// Load saved document on page load
function loadDocument() {
    const savedData = localStorage.getItem('flowDocument');
    if (savedData) {
        const data = JSON.parse(savedData);
        documentTitle.value = data.title;
        editor.innerHTML = data.content;
        
        const savedTime = new Date(data.timestamp);
        lastSaved.textContent = `Last saved: ${savedTime.toLocaleString()}`;
    }
    updateCounts();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDocument();
    updateToolbarState();
    
    // Focus on editor
    editor.focus();
    
    // Welcome message for first-time users
    if (!localStorage.getItem('flowDocument')) {
        editor.innerHTML = '<p style="color: #6c757d; font-style: italic;">Welcome to Flow! Start typing your document here. All your formatting tools are in the toolbar above. Your work is automatically saved as you type. 📝</p>';
    }
});

// Prevent losing work on page close
window.addEventListener('beforeunload', (e) => {
    const savedData = localStorage.getItem('flowDocument');
    const currentContent = editor.innerHTML;
    
    if (savedData) {
        const saved = JSON.parse(savedData);
        if (saved.content !== currentContent) {
            e.preventDefault();
            e.returnValue = '';
        }
    }
});

// Handle paste to clean up formatting from external sources
editor.addEventListener('paste', (e) => {
    e.preventDefault();
    
    // Get plain text from clipboard
    const text = e.clipboardData.getData('text/plain');
    
    // Insert text at cursor position
    document.execCommand('insertText', false, text);
});
