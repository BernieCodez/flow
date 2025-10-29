/**
 * IndexedDB Manager for Flow Text Editor
 * Handles all database operations for offline storage
 */

class FlowDB {
    constructor() {
        this.dbName = 'FlowEditorDB';
        this.version = 1;
        this.db = null;
    }

    /**
     * Initialize the database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create projects store
                if (!db.objectStoreNames.contains('projects')) {
                    const projectStore = db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
                    projectStore.createIndex('name', 'name', { unique: false });
                    projectStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Create documents store
                if (!db.objectStoreNames.contains('documents')) {
                    const docStore = db.createObjectStore('documents', { keyPath: 'id', autoIncrement: true });
                    docStore.createIndex('projectId', 'projectId', { unique: false });
                    docStore.createIndex('title', 'title', { unique: false });
                    docStore.createIndex('createdAt', 'createdAt', { unique: false });
                    docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }

                // Create sync configuration store (for future use)
                if (!db.objectStoreNames.contains('syncConfig')) {
                    db.createObjectStore('syncConfig', { keyPath: 'id' });
                }

                console.log('Database setup complete');
            };
        });
    }

    /**
     * Create a new project
     */
    async createProject(name) {
        const transaction = this.db.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');
        
        const project = {
            name: name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const request = store.add(project);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all projects
     */
    async getAllProjects() {
        const transaction = this.db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a project by ID
     */
    async getProject(id) {
        const transaction = this.db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update a project
     */
    async updateProject(id, data) {
        const transaction = this.db.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');

        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const project = getRequest.result;
                if (project) {
                    Object.assign(project, data);
                    project.updatedAt = new Date().toISOString();
                    const updateRequest = store.put(project);
                    updateRequest.onsuccess = () => resolve(updateRequest.result);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('Project not found'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Delete a project
     */
    async deleteProject(id) {
        const transaction = this.db.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');

        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Create a new document
     */
    async createDocument(projectId, title, content) {
        const transaction = this.db.transaction(['documents'], 'readwrite');
        const store = transaction.objectStore('documents');
        
        const document = {
            projectId: projectId,
            title: title || 'Untitled Document',
            content: content || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const request = store.add(document);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all documents for a project
     */
    async getDocumentsByProject(projectId) {
        const transaction = this.db.transaction(['documents'], 'readonly');
        const store = transaction.objectStore('documents');
        const index = store.index('projectId');

        return new Promise((resolve, reject) => {
            const request = index.getAll(projectId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a document by ID
     */
    async getDocument(id) {
        const transaction = this.db.transaction(['documents'], 'readonly');
        const store = transaction.objectStore('documents');

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update a document
     */
    async updateDocument(id, data) {
        const transaction = this.db.transaction(['documents'], 'readwrite');
        const store = transaction.objectStore('documents');

        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const document = getRequest.result;
                if (document) {
                    Object.assign(document, data);
                    document.updatedAt = new Date().toISOString();
                    const updateRequest = store.put(document);
                    updateRequest.onsuccess = () => resolve(updateRequest.result);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('Document not found'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Delete a document
     */
    async deleteDocument(id) {
        const transaction = this.db.transaction(['documents'], 'readwrite');
        const store = transaction.objectStore('documents');

        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save sync configuration (for future cross-device sync)
     */
    async saveSyncConfig(config) {
        const transaction = this.db.transaction(['syncConfig'], 'readwrite');
        const store = transaction.objectStore('syncConfig');
        
        const syncConfig = {
            id: 'main',
            ...config,
            updatedAt: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const request = store.put(syncConfig);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get sync configuration
     */
    async getSyncConfig() {
        const transaction = this.db.transaction(['syncConfig'], 'readonly');
        const store = transaction.objectStore('syncConfig');

        return new Promise((resolve, reject) => {
            const request = store.get('main');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Export for use in other files
window.FlowDB = FlowDB;
