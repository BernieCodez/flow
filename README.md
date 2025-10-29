# Flow - Fast Offline Text Editor

Flow is a fast, offline-capable text editor designed for document editing with rich formatting tools, project management, and grammar checking capabilities.

## Features

### 📝 Rich Text Editing
- **Fast Loading**: Optimized for quick file loading and responsive editing
- **Offline First**: All documents stored in IndexedDB for offline access
- **Rich Formatting Tools**:
  - Font family and size selection
  - Text styling (bold, italic, underline)
  - Text and background colors
  - Text alignment (left, center, right)
  - Indentation controls
  - Bullet and numbered lists

### 📁 Project Management
- **Group Documents**: Organize documents into projects
- **Easy Navigation**: Switch between documents within a project seamlessly
- **Fast Search**: Quickly find and access documents

### ✍️ Grammar Tools
- **Real-time Checking**: Grammar issues highlighted in right sidebar
- **Instant Correct**: Fix all grammar mistakes with one click
- **Word Counter**: Track document statistics
- **Common Misspellings**: Auto-detect and correct common errors

### 🔄 Sync Ready
- **Sync Configuration**: Structure in place for cross-device document syncing
- **Future Ready**: Database designed to support sync functionality
- **Offline Storage**: All data stored locally in IndexedDB

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/BernieCodez/flow.git
cd flow
```

2. Open the editor:
Simply open `index.html` in a modern web browser. No build process or server required!

```bash
# On macOS
open index.html

# On Linux
xdg-open index.html

# On Windows
start index.html
```

### Usage

#### Creating Your First Project

1. Click the **"+ New Project"** button in the header
2. Enter a project name
3. Click **"Create"**

#### Creating Documents

1. Select a project from the dropdown
2. Click the **"+ New"** button in the documents sidebar
3. Start typing!

#### Formatting Text

Use the toolbar to format your text:
- Select text and click formatting buttons
- Use keyboard shortcuts:
  - `Ctrl+B` / `Cmd+B` - Bold
  - `Ctrl+I` / `Cmd+I` - Italic
  - `Ctrl+U` / `Cmd+U` - Underline
  - `Ctrl+S` / `Cmd+S` - Save

#### Using Grammar Tools

1. Type your content in the editor
2. Grammar suggestions appear automatically in the right sidebar
3. Click **"⚡ Instant Correct All"** to apply all corrections at once

#### Saving Documents

- Documents auto-save after 2 seconds of inactivity
- Manual save with `Ctrl+S` or the **"Save"** button
- All documents stored locally in IndexedDB

## Architecture

### Technology Stack

- **Frontend**: Pure HTML5, CSS3, and JavaScript (ES6+)
- **Storage**: IndexedDB for offline data persistence
- **No Dependencies**: Zero external libraries for maximum performance

### File Structure

```
flow/
├── index.html       # Main application HTML
├── styles.css       # Application styles
├── app.js           # Main application logic
├── db.js            # IndexedDB database manager
├── grammar.js       # Grammar checking engine
└── README.md        # Documentation
```

### Database Schema

#### Projects Store
- `id` (auto-increment): Unique project identifier
- `name`: Project name
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

#### Documents Store
- `id` (auto-increment): Unique document identifier
- `projectId`: Reference to parent project
- `title`: Document title
- `content`: Document HTML content
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

#### Sync Config Store
- `id`: Configuration identifier
- `syncEndpoint`: Server URL for syncing (future use)
- `apiKey`: Authentication key (future use)
- `updatedAt`: Last update timestamp

## Configuring Cross-Device Sync

The application is structured to support cross-device document syncing. To implement sync:

### Backend Requirements

Create a sync server with the following endpoints:

```
POST   /api/sync/upload      # Upload document changes
GET    /api/sync/download    # Download remote changes
POST   /api/sync/resolve     # Resolve conflicts
GET    /api/sync/status      # Check sync status
```

### Configuration Steps

1. Update the sync configuration in the UI:
   - Enter your sync server URL in the "Sync Configuration" section
   - Store API credentials securely

2. Implement sync logic in `db.js`:
   - Add sync methods to FlowDB class
   - Implement conflict resolution strategy
   - Add background sync with Service Workers

3. Example sync implementation:

```javascript
// In db.js
async syncToServer() {
    const config = await this.getSyncConfig();
    if (!config || !config.syncEndpoint) return;
    
    // Get all documents modified since last sync
    const documents = await this.getModifiedDocuments(config.lastSyncTime);
    
    // Upload to server
    const response = await fetch(`${config.syncEndpoint}/api/sync/upload`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({ documents })
    });
    
    // Handle response and update local database
    // ...
}
```

## Browser Compatibility

Flow works best in modern browsers with IndexedDB support:

- ✅ Chrome 24+
- ✅ Firefox 16+
- ✅ Safari 10+
- ✅ Edge 12+
- ✅ Opera 15+

## Performance Optimizations

### Fast Loading
- No external dependencies to download
- Minimal HTML/CSS/JS bundle size
- IndexedDB for instant local access
- Lazy loading for large documents

### Offline Capability
- All data stored locally
- No network requests required
- Works completely offline
- Fast response times

### Auto-Save
- Debounced auto-save (2 seconds after last edit)
- Efficient IndexedDB transactions
- No data loss risk

## Development

### Running Locally

No build process needed! Just open `index.html` in a browser.

### Testing

Open the browser's Developer Tools to:
- View IndexedDB contents (Application > Storage > IndexedDB)
- Monitor network activity
- Debug JavaScript

### Extending

To add new features:

1. **Add new formatting tools**: Update `app.js` and add toolbar buttons in `index.html`
2. **Enhance grammar checking**: Extend rules in `grammar.js`
3. **Add export features**: Implement export functions in `app.js`
4. **Implement sync**: Add sync methods to `db.js`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` / `Cmd+B` | Bold |
| `Ctrl+I` / `Cmd+I` | Italic |
| `Ctrl+U` / `Cmd+U` | Underline |
| `Ctrl+S` / `Cmd+S` | Save Document |

## Security Notes

- All data stored locally in browser's IndexedDB
- No data transmitted to external servers by default
- When implementing sync, use HTTPS and proper authentication
- Consider encrypting sensitive documents before sync

## Future Enhancements

- [ ] Cloud sync implementation
- [ ] Real-time collaboration
- [ ] Advanced grammar checking with AI
- [ ] Export to PDF, Word, Markdown
- [ ] Import from various formats
- [ ] Dark mode
- [ ] Custom themes
- [ ] Plugins system
- [ ] Mobile app versions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - Feel free to use this project for any purpose.

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review browser console for errors

---

**Built with ❤️ for fast, offline document editing**
