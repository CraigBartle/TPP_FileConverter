class UniversalConverterApp {
	constructor() {
		this.selectedFiles = [];
		this.outputFolder = '';
		this.isConverting = false;
		this.selectedPDFs = [];
		this.mergeOutputFolder = '';
		this.currentTab = 'convert';
		this.draggedIndex = undefined;
		this.initializeApp();
	}

	async initializeApp() {
		this.setupElements();
		this.setupEventListeners();
		await this.loadDefaultOutputFolder();
		
		// Test that elements are properly set up
		console.log('App initialized. Drop zone element:', this.dropZone);
		console.log('Drop zone bounds:', this.dropZone.getBoundingClientRect());
		
		// Add a simple click test
		setTimeout(() => {
			console.log('App ready for drag and drop testing');
		}, 1000);
		
		// Make app globally accessible for native drops
		window.app = this;
		
		// Listen for file drops from main process
		if (window.electronAPI && window.electronAPI.onFileDropped) {
			window.electronAPI.onFileDropped((filePaths) => {
				console.log('Received file drop from main process:', filePaths);
				this.addFiles(filePaths);
			});
		}
		
		// Set up document-level drag and drop handlers
		this.setupDocumentDragDrop();
	}

	setupElements() {
		this.dropZone = document.getElementById('dropZone');
		this.outputFolderInput = document.getElementById('outputFolder');
		this.browseFolderBtn = document.getElementById('browseFolder');
		this.fileListContainer = document.getElementById('fileListContainer');
		this.fileList = document.getElementById('fileList');
		this.convertBtn = document.getElementById('convertBtn');
		this.clearBtn = document.getElementById('clearBtn');
		this.progressSection = document.getElementById('progressSection');
		this.progressFill = document.getElementById('progressFill');
		this.progressText = document.getElementById('progressText');
		this.resultsSection = document.getElementById('resultsSection');
		this.resultsList = document.getElementById('resultsList');
		this.openOutputBtn = document.getElementById('openOutputBtn');
		
		// Settings elements
		this.settingsBtn = document.getElementById('settingsBtn');
		this.settingsModal = document.getElementById('settingsModal');
		this.closeModal = document.getElementById('closeModal');
		this.conversionMethodSelect = document.getElementById('conversionMethod');
		this.currentMethodDiv = document.getElementById('currentMethod');
		this.officeStatusDiv = document.getElementById('officeStatus');
		this.saveSettingsBtn = document.getElementById('saveSettings');
		this.cancelSettingsBtn = document.getElementById('cancelSettings');
		
		// Tab elements
		this.convertTab = document.getElementById('convertTab');
		this.mergeTab = document.getElementById('mergeTab');
		this.convertTabContent = document.getElementById('convertTabContent');
		this.mergeTabContent = document.getElementById('mergeTabContent');
		
		// Merge elements
		this.selectPDFsBtn = document.getElementById('selectPDFsBtn');
		this.mergeOutputFolderInput = document.getElementById('mergeOutputFolder');
		this.browseMergeFolderBtn = document.getElementById('browseMergeFolder');
		this.mergeFilenameInput = document.getElementById('mergeFilename');
		this.pdfListContainer = document.getElementById('pdfListContainer');
		this.pdfList = document.getElementById('pdfList');
		this.mergePDFsBtn = document.getElementById('mergePDFsBtn');
		this.clearPDFsBtn = document.getElementById('clearPDFsBtn');
		this.mergeResultsSection = document.getElementById('mergeResultsSection');
		this.mergeResultsList = document.getElementById('mergeResultsList');
		this.openMergeOutputBtn = document.getElementById('openMergeOutputBtn');
	}

	setupEventListeners() {
		console.log('Setting up event listeners');
		
		this.dropZone.addEventListener('click', () => this.selectFiles());
		
		// Drag and drop events with logging
		// Simplified drop zone visual feedback only
		this.dropZone.addEventListener('dragenter', (e) => {
			console.log('dragenter on dropZone - adding visual feedback');
			this.dropZone.classList.add('drag-over');
		});
		
		this.dropZone.addEventListener('dragleave', (e) => {
			console.log('dragleave on dropZone - removing visual feedback');
			if (!this.dropZone.contains(e.relatedTarget)) {
				this.dropZone.classList.remove('drag-over');
			}
		});
		
		// Native drop handlers will take precedence
		console.log('Renderer: App-level event listeners configured');

		this.browseFolderBtn.addEventListener('click', () => this.selectOutputFolder());
		this.convertBtn.addEventListener('click', () => this.convertFiles());
		this.clearBtn.addEventListener('click', () => this.clearFileList());
		this.openOutputBtn.addEventListener('click', () => this.openOutputFolder());
		
		// Settings event listeners
		this.settingsBtn.addEventListener('click', () => this.openSettings());
		this.closeModal.addEventListener('click', () => this.closeSettings());
		this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
		this.cancelSettingsBtn.addEventListener('click', () => this.closeSettings());
		
		// Close modal when clicking outside
		this.settingsModal.addEventListener('click', (e) => {
			if (e.target === this.settingsModal) {
				this.closeSettings();
			}
		});
		
		// Tab switching
		this.convertTab.addEventListener('click', () => this.switchTab('convert'));
		this.mergeTab.addEventListener('click', () => this.switchTab('merge'));
		
		// Merge functionality
		this.selectPDFsBtn.addEventListener('click', () => this.selectPDFFiles());
		this.browseMergeFolderBtn.addEventListener('click', () => this.selectMergeOutputFolder());
		this.mergePDFsBtn.addEventListener('click', () => this.mergePDFs());
		this.clearPDFsBtn.addEventListener('click', () => this.clearPDFList());
		this.openMergeOutputBtn.addEventListener('click', () => this.openMergeOutputFolder());
		
		// Add drag-and-drop to merge zone
		if (this.mergeTabContent) {
			this.mergeTabContent.addEventListener('dragover', (e) => {
				if (this.currentTab === 'merge') {
					e.preventDefault();
					e.stopPropagation();
				}
			});
			
			this.mergeTabContent.addEventListener('dragenter', (e) => {
				if (this.currentTab === 'merge') {
					e.preventDefault();
					e.stopPropagation();
				}
			});
		}
	}

	setupDocumentDragDrop() {
		console.log('Setting up document-level drag and drop handlers');
		
		// Test basic mouse events first
		document.addEventListener('mousemove', (e) => {
			// Only log occasionally to avoid spam
			if (Math.random() < 0.001) {
				console.log('Mouse move detected - events are working');
			}
		});
		
		// Test if any drag events work at all
		document.addEventListener('dragstart', (e) => {
			console.log('Drag start detected!');
		});
		
		document.addEventListener('dragenter', (e) => {
			console.log('Drag enter detected!');
		});
		
		// Override document drag events to allow drops
		document.addEventListener('dragover', (e) => {
			console.log('Document dragover event');
			e.preventDefault();
			e.stopPropagation();
			e.dataTransfer.dropEffect = 'copy';
			
			// Add visual feedback if over drop zone
			if (this.dropZone && (e.target === this.dropZone || this.dropZone.contains(e.target))) {
				this.dropZone.classList.add('drag-over');
			}
		}, false);

		document.addEventListener('dragleave', (e) => {
			console.log('Document dragleave event');
			// Remove visual feedback when leaving drop zone
			if (this.dropZone && !this.dropZone.contains(e.relatedTarget)) {
				this.dropZone.classList.remove('drag-over');
			}
		}, false);

		document.addEventListener('drop', (e) => {
			console.log('Document drop event triggered!');
			e.preventDefault();
			e.stopPropagation();
			
			// Remove visual feedback
			if (this.dropZone) {
				this.dropZone.classList.remove('drag-over');
			}
			
			console.log('Files dropped:', e.dataTransfer.files.length);
			
			if (e.dataTransfer.files.length > 0) {
				const files = Array.from(e.dataTransfer.files);
				const filePaths = files.map(file => {
					console.log('File dropped:', file.name, 'Path:', file.path);
					return file.path;
				});
				
				console.log('Processing file paths:', filePaths);
				
				// Handle differently based on current tab
				if (this.currentTab === 'merge') {
					// Filter for PDF files only on merge tab
					const pdfFiles = filePaths.filter(path => 
						path.toLowerCase().endsWith('.pdf')
					);
					if (pdfFiles.length > 0) {
						this.selectedPDFs.push(...pdfFiles);
						this.updatePDFList();
						console.log('Added PDFs to merge list:', pdfFiles);
					} else {
						this.showError('Please drop PDF files for merging');
					}
				} else {
					// Original convert functionality
					this.addFiles(filePaths);
				}
			}
			
			return false;
		}, false);
		
		console.log('Document drag and drop handlers installed');
	}

	async loadDefaultOutputFolder() {
		try {
			this.outputFolder = await window.electronAPI.getDefaultOutputFolder();
			this.outputFolderInput.value = this.outputFolder;
			this.mergeOutputFolder = this.outputFolder;
			this.mergeOutputFolderInput.value = this.outputFolder;
			await window.electronAPI.ensureOutputFolder(this.outputFolder);
		} catch (error) {
			console.error('Failed to load default output folder:', error);
		}
	}

	handleDragOver(e) {
		console.log('handleDragOver called');
		e.preventDefault();
		e.stopPropagation();
		e.dataTransfer.dropEffect = 'copy';
		this.dropZone.classList.add('drag-over');
	}

	handleDragLeave(e) {
		e.preventDefault();
		e.stopPropagation();
		if (!this.dropZone.contains(e.relatedTarget)) {
			this.dropZone.classList.remove('drag-over');
		}
	}

	handleDrop(e) {
		console.log('handleDrop called', e.dataTransfer.files.length, 'files');
		e.preventDefault();
		e.stopPropagation();
		this.dropZone.classList.remove('drag-over');

		const files = Array.from(e.dataTransfer.files);
		console.log('Files from dataTransfer:', files);
		
		const filePaths = files.map(file => {
			console.log('File:', file.name, 'Path:', file.path);
			return file.path;
		});
		
		console.log('Final file paths:', filePaths);
		
		if (filePaths.length > 0) {
			this.addFiles(filePaths);
		} else {
			console.log('No valid file paths found');
		}
	}

	async selectFiles() {
		try {
			const filePaths = await window.electronAPI.selectFiles();
			if (filePaths.length > 0) {
				this.addFiles(filePaths);
			}
		} catch (error) {
			console.error('Failed to select files:', error);
			this.showError('Failed to select files');
		}
	}

	addFiles(filePaths) {
		console.log('addFiles called with:', filePaths);
		
		const newFiles = filePaths.filter(path => 
			!this.selectedFiles.some(file => file.path === path)
		);

		console.log('New files to add:', newFiles);

		newFiles.forEach(path => {
			const fileName = path.split('\\').pop().split('/').pop();
			const extension = fileName.split('.').pop().toLowerCase();
			
			let fileType = 'Unknown';
			if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
				fileType = 'Office';
			} else if (['jpg', 'jpeg', 'png', 'tiff', 'tif', 'heic'].includes(extension)) {
				fileType = 'Image';
			}

			console.log(`Adding file: ${fileName}, type: ${fileType}, extension: ${extension}`);

			this.selectedFiles.push({
				path,
				name: fileName,
				type: fileType
			});
		});

		this.updateFileList();
	}

	updateFileList() {
		if (this.selectedFiles.length === 0) {
			this.fileListContainer.style.display = 'none';
			return;
		}

		this.fileListContainer.style.display = 'block';
		this.fileList.innerHTML = '';

		this.selectedFiles.forEach((file, index) => {
			const fileItem = document.createElement('div');
			fileItem.className = 'file-item';
			fileItem.innerHTML = `
				<span class="file-name">${file.name}</span>
				<div>
					<span class="file-type">${file.type}</span>
					<button onclick="app.removeFile(${index})" style="margin-left: 10px; background: #dc3545; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer;">×</button>
				</div>
			`;
			this.fileList.appendChild(fileItem);
		});
	}

	removeFile(index) {
		this.selectedFiles.splice(index, 1);
		this.updateFileList();
	}

	clearFileList() {
		this.selectedFiles = [];
		this.updateFileList();
		this.hideResults();
	}

	async selectOutputFolder() {
		try {
			const folderPath = await window.electronAPI.selectOutputFolder();
			if (folderPath) {
				this.outputFolder = folderPath;
				this.outputFolderInput.value = folderPath;
			}
		} catch (error) {
			console.error('Failed to select output folder:', error);
			this.showError('Failed to select output folder');
		}
	}

	async convertFiles() {
		if (this.selectedFiles.length === 0) {
			this.showError('Please select files to convert');
			return;
		}

		if (!this.outputFolder) {
			this.showError('Please select an output folder');
			return;
		}

		this.isConverting = true;
		this.convertBtn.disabled = true;
		this.convertBtn.textContent = 'Converting...';
		this.showProgress();

		try {
			await window.electronAPI.ensureOutputFolder(this.outputFolder);

			const filePaths = this.selectedFiles.map(file => file.path);
			const results = await window.electronAPI.convertFiles({
				files: filePaths,
				outputFolder: this.outputFolder
			});

			this.showResults(results);
		} catch (error) {
			console.error('Conversion failed:', error);
			this.showError(`Conversion failed: ${error.message}`);
		} finally {
			this.isConverting = false;
			this.convertBtn.disabled = false;
			this.convertBtn.textContent = 'Convert All to PDF';
			this.hideProgress();
		}
	}

	showProgress() {
		this.progressSection.style.display = 'block';
		this.progressFill.style.width = '0%';
		this.progressText.textContent = 'Starting conversion...';

		let progress = 0;
		const total = this.selectedFiles.length;
		
		const interval = setInterval(() => {
			progress += 5;
			if (progress > 90) progress = 90;
			
			this.progressFill.style.width = `${progress}%`;
			this.progressText.textContent = `Processing files... ${Math.floor(progress)}%`;
			
			if (!this.isConverting) {
				clearInterval(interval);
				this.progressFill.style.width = '100%';
				this.progressText.textContent = 'Conversion completed!';
			}
		}, 200);
	}

	hideProgress() {
		setTimeout(() => {
			this.progressSection.style.display = 'none';
		}, 1000);
	}

	showResults(results) {
		this.resultsSection.style.display = 'block';
		this.resultsList.innerHTML = '';

		results.forEach(result => {
			const resultItem = document.createElement('div');
			resultItem.className = 'result-item';
			resultItem.innerHTML = `
				<span class="file-name">${result.file}</span>
				<span class="result-status ${result.status}">
					${result.status === 'success' ? '✓ Converted' : `✗ ${result.error}`}
				</span>
			`;
			this.resultsList.appendChild(resultItem);
		});

		const successCount = results.filter(r => r.status === 'success').length;
		if (successCount > 0) {
			this.showSuccess(`Successfully converted ${successCount} of ${results.length} files`);
		}
	}

	hideResults() {
		this.resultsSection.style.display = 'none';
	}

	async openOutputFolder() {
		if (this.outputFolder) {
			try {
				await window.electronAPI.openPath(this.outputFolder);
			} catch (error) {
				console.error('Failed to open output folder:', error);
			}
		}
	}

	showError(message) {
		const notification = this.createNotification(message, 'error');
		document.body.appendChild(notification);
	}

	showSuccess(message) {
		const notification = this.createNotification(message, 'success');
		document.body.appendChild(notification);
	}

	createNotification(message, type) {
		const notification = document.createElement('div');
		notification.className = `notification ${type}`;
		notification.textContent = message;
		notification.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			padding: 15px 20px;
			border-radius: 8px;
			color: white;
			font-weight: 500;
			z-index: 1000;
			max-width: 400px;
			word-wrap: break-word;
			background: ${type === 'error' ? '#dc3545' : '#28a745'};
			box-shadow: 0 4px 6px rgba(0,0,0,0.1);
		`;

		setTimeout(() => {
			notification.style.opacity = '0';
			notification.style.transform = 'translateX(100%)';
			setTimeout(() => notification.remove(), 300);
		}, 4000);

		return notification;
	}

	// Settings-related methods
	async openSettings() {
		try {
			// Load current settings
			const currentMethod = await window.electronAPI.getSetting('officeConversionMethod');
			this.conversionMethodSelect.value = currentMethod;
			
			// Update status information
			await this.updateSettingsInfo();
			
			// Show modal
			this.settingsModal.style.display = 'block';
		} catch (error) {
			console.error('Failed to open settings:', error);
			this.showError('Failed to load settings');
		}
	}

	closeSettings() {
		this.settingsModal.style.display = 'none';
	}

	async updateSettingsInfo() {
		try {
			const [currentMethod, officeAvailable] = await Promise.all([
				window.electronAPI.getConversionMethod(),
				window.electronAPI.checkOfficeAvailability()
			]);
			
			this.currentMethodDiv.textContent = `Currently using: ${currentMethod}`;
			this.officeStatusDiv.textContent = officeAvailable 
				? '✓ Microsoft Office is available on this system'
				: '✗ Microsoft Office is not available - LibreOffice fallback required';
		} catch (error) {
			console.error('Failed to update settings info:', error);
			this.currentMethodDiv.textContent = 'Unable to determine current method';
			this.officeStatusDiv.textContent = 'Unable to check Office availability';
		}
	}

	async saveSettings() {
		try {
			const selectedMethod = this.conversionMethodSelect.value;
			await window.electronAPI.setSetting('officeConversionMethod', selectedMethod);
			
			// Update the info display
			await this.updateSettingsInfo();
			
			this.showSuccess('Settings saved successfully');
			this.closeSettings();
		} catch (error) {
			console.error('Failed to save settings:', error);
			this.showError('Failed to save settings');
		}
	}

	// Tab switching
	switchTab(tabName) {
		this.currentTab = tabName;
		
		// Update tab buttons
		this.convertTab.classList.toggle('active', tabName === 'convert');
		this.mergeTab.classList.toggle('active', tabName === 'merge');
		
		// Update tab content
		this.convertTabContent.style.display = tabName === 'convert' ? 'flex' : 'none';
		this.mergeTabContent.style.display = tabName === 'merge' ? 'flex' : 'none';
	}

	// PDF Merge functionality
	async selectPDFFiles() {
		try {
			const filePaths = await window.electronAPI.selectPDFFiles();
			if (filePaths.length > 0) {
				this.selectedPDFs = filePaths;
				this.updatePDFList();
			}
		} catch (error) {
			console.error('Failed to select PDF files:', error);
			this.showError('Failed to select PDF files');
		}
	}

	updatePDFList() {
		if (this.selectedPDFs.length === 0) {
			this.pdfListContainer.style.display = 'none';
			return;
		}

		this.pdfListContainer.style.display = 'block';
		this.pdfList.innerHTML = '';

		this.selectedPDFs.forEach((pdfPath, index) => {
			const fileName = pdfPath.split('\\').pop().split('/').pop();
			const pdfItem = document.createElement('div');
			pdfItem.className = 'pdf-item';
			pdfItem.draggable = true;
			pdfItem.dataset.index = index;
			pdfItem.innerHTML = `
				<div style="display: flex; align-items: center;">
					<span class="drag-handle">⋮⋮</span>
					<span class="pdf-order">${index + 1}</span>
					<span class="pdf-name">${fileName}</span>
				</div>
				<button onclick="app.removePDF(${index})" style="background: #dc3545; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer;">×</button>
			`;
			
			// Add drag event listeners
			pdfItem.addEventListener('dragstart', (e) => this.handlePDFDragStart(e));
			pdfItem.addEventListener('dragover', (e) => this.handlePDFDragOver(e));
			pdfItem.addEventListener('drop', (e) => this.handlePDFDrop(e));
			pdfItem.addEventListener('dragenter', (e) => this.handlePDFDragEnter(e));
			pdfItem.addEventListener('dragleave', (e) => this.handlePDFDragLeave(e));
			pdfItem.addEventListener('dragend', (e) => this.handlePDFDragEnd(e));
			
			this.pdfList.appendChild(pdfItem);
		});

		// Add container-level drag support
		this.pdfList.addEventListener('dragover', (e) => {
			e.preventDefault();
			// Remove drag-over from all items when dragging over empty space
			const allItems = this.pdfList.querySelectorAll('.pdf-item');
			allItems.forEach(item => {
				if (!item.contains(e.target)) {
					item.classList.remove('drag-over');
				}
			});
		});
	}

	removePDF(index) {
		this.selectedPDFs.splice(index, 1);
		this.updatePDFList();
	}

	clearPDFList() {
		this.selectedPDFs = [];
		this.updatePDFList();
		this.hideMergeResults();
	}

	async selectMergeOutputFolder() {
		try {
			const folderPath = await window.electronAPI.selectOutputFolder();
			if (folderPath) {
				this.mergeOutputFolder = folderPath;
				this.mergeOutputFolderInput.value = folderPath;
			}
		} catch (error) {
			console.error('Failed to select merge output folder:', error);
			this.showError('Failed to select output folder');
		}
	}

	async mergePDFs() {
		if (this.selectedPDFs.length < 2) {
			this.showError('Please select at least 2 PDF files to merge');
			return;
		}

		if (!this.mergeOutputFolder) {
			this.showError('Please select an output folder');
			return;
		}

		const filename = this.mergeFilenameInput.value.trim();
		if (!filename) {
			this.showError('Please enter a filename for the merged PDF');
			return;
		}

		// Ensure filename ends with .pdf
		const finalFilename = filename.endsWith('.pdf') ? filename : filename + '.pdf';
		const outputPath = `${this.mergeOutputFolder}\\${finalFilename}`;

		try {
			await window.electronAPI.ensureOutputFolder(this.mergeOutputFolder);
			
			const result = await window.electronAPI.mergePDFs({
				pdfPaths: this.selectedPDFs,
				outputPath: outputPath
			});

			this.showMergeResults(result);
			this.showSuccess(`Successfully merged ${this.selectedPDFs.length} PDFs into ${finalFilename}`);
		} catch (error) {
			console.error('PDF merge failed:', error);
			this.showError(`Merge failed: ${error.message}`);
		}
	}

	showMergeResults(result) {
		this.mergeResultsSection.style.display = 'block';
		this.mergeResultsList.innerHTML = `
			<div style="padding: 15px; text-align: center;">
				<div style="color: #28a745; font-weight: 600; margin-bottom: 10px;">✓ Merge Successful</div>
				<div style="color: #666;">Merged ${this.selectedPDFs.length} PDFs into:</div>
				<div style="color: #333; font-weight: 500; margin-top: 5px;">${result.outputPath.split('\\').pop()}</div>
			</div>
		`;
	}

	hideMergeResults() {
		this.mergeResultsSection.style.display = 'none';
	}

	async openMergeOutputFolder() {
		if (this.mergeOutputFolder) {
			try {
				await window.electronAPI.openPath(this.mergeOutputFolder);
			} catch (error) {
				console.error('Failed to open merge output folder:', error);
			}
		}
	}

	// PDF Drag and Drop Sorting
	handlePDFDragStart(e) {
		// Find the PDF item element (in case we're dragging a child element)
		const pdfItem = e.target.closest('.pdf-item');
		if (!pdfItem) return;
		
		// Stop propagation to prevent document handlers from interfering
		e.stopPropagation();
		
		this.draggedIndex = parseInt(pdfItem.dataset.index);
		pdfItem.classList.add('dragging');
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', this.draggedIndex.toString());
		e.dataTransfer.setData('application/x-pdf-reorder', 'true'); // Custom marker
		
		console.log('PDF Drag started:', this.draggedIndex);
	}

	handlePDFDragOver(e) {
		// Only handle if this is a PDF reorder operation
		if (!e.dataTransfer.types.includes('application/x-pdf-reorder')) return;
		
		e.preventDefault();
		e.stopPropagation();
		e.dataTransfer.dropEffect = 'move';
		
		// Find the PDF item element
		const pdfItem = e.target.closest('.pdf-item');
		if (pdfItem && !pdfItem.classList.contains('dragging')) {
			// Clear other drag-over states
			const allItems = this.pdfList.querySelectorAll('.pdf-item');
			allItems.forEach(item => item.classList.remove('drag-over'));
			pdfItem.classList.add('drag-over');
		}
	}

	handlePDFDragEnter(e) {
		if (!e.dataTransfer.types.includes('application/x-pdf-reorder')) return;
		e.preventDefault();
		e.stopPropagation();
	}

	handlePDFDragLeave(e) {
		if (!e.dataTransfer.types.includes('application/x-pdf-reorder')) return;
		e.stopPropagation();
		
		const pdfItem = e.target.closest('.pdf-item');
		if (pdfItem && !pdfItem.contains(e.relatedTarget)) {
			pdfItem.classList.remove('drag-over');
		}
	}

	handlePDFDrop(e) {
		// Only handle if this is a PDF reorder operation
		if (!e.dataTransfer.types.includes('application/x-pdf-reorder')) return;
		
		e.preventDefault();
		e.stopPropagation();
		
		// Find the PDF item element
		const pdfItem = e.target.closest('.pdf-item');
		if (!pdfItem) return;
		
		const dropIndex = parseInt(pdfItem.dataset.index);
		pdfItem.classList.remove('drag-over');
		
		console.log('PDF Drop on index:', dropIndex, 'from:', this.draggedIndex);
		
		if (this.draggedIndex !== dropIndex && this.draggedIndex !== undefined) {
			// Reorder the PDF array
			const draggedItem = this.selectedPDFs[this.draggedIndex];
			
			// Remove from old position
			this.selectedPDFs.splice(this.draggedIndex, 1);
			
			// Insert at new position (adjust if dropping after the original position)
			const newIndex = this.draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
			this.selectedPDFs.splice(newIndex, 0, draggedItem);
			
			console.log('PDF Reordered array:', this.selectedPDFs.map(pdf => pdf.split('\\').pop()));
			
			// Update the list
			this.updatePDFList();
		}
	}

	handlePDFDragEnd(e) {
		e.stopPropagation();
		
		// Find the PDF item element
		const pdfItem = e.target.closest('.pdf-item');
		if (pdfItem) {
			pdfItem.classList.remove('dragging');
		}
		
		// Remove drag-over class from all items
		const allItems = this.pdfList.querySelectorAll('.pdf-item');
		allItems.forEach(item => {
			item.classList.remove('drag-over');
			item.classList.remove('dragging');
		});
		
		this.draggedIndex = undefined;
		console.log('PDF Drag ended');
	}
}

const app = new UniversalConverterApp();