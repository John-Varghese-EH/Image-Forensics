/**
 * ForensicX - Professional Image Forensics Suite
 * Main Application Engine
 */

class ForensicX {
    constructor() {
        this.currentImage = null;
        this.currentFile = null;
        this.images = [];
        this.currentIndex = 0;
        this.analysisData = {};
        this.analysisImages = {}; // Store visual results for report
        this.history = []; // Initialize findings array
        this.activeModule = 'metadata';
        this.initTheme = this.initTheme.bind(this);
        this.init();
    }

    init() {
        this.bindEvents();
        this.initSidebar();
        this.initMagicLens();
        this.initShortcuts();
        this.initComparison();
        this.initTheme();
        this.initImageViewer(); // Initialize new viewer logic
        this.initDashboard();
    }

    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    initShortcuts() {
        const modal = document.getElementById('shortcutsModal');
        const btn = document.getElementById('helpBtn');
        const close = document.getElementById('closeShortcutsBtn');

        const toggle = () => {
            const isActive = modal.style.display === 'flex';
            modal.style.display = isActive ? 'none' : 'flex';
            setTimeout(() => modal.classList.toggle('active', !isActive), 10);
        };

        // Sidebar Toggle
        const toggleBtn = document.getElementById('toggleSidebarBtn');
        const container = document.querySelector('.app-container');

        toggleBtn?.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                // Mobile: Toggle off-canvas class
                container.classList.toggle('sidebar-open');

                // Close panel if open (to prevent overlap)
                document.getElementById('analysisContainer')?.classList.remove('active');
            } else {
                // Desktop: Collapse grid
                const isCollapsed = container.classList.toggle('sidebar-collapsed');
                if (isCollapsed) {
                    container.style.gridTemplateColumns = '0 1fr 340px';
                } else {
                    container.style.gridTemplateColumns = '260px 1fr 340px';
                }
            }
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 &&
                container.classList.contains('sidebar-open') &&
                !e.target.closest('.app-sidebar') &&
                !e.target.closest('#toggleSidebarBtn')) {
                container.classList.remove('sidebar-open');
            }
        });
        btn?.addEventListener('click', toggle);
        close?.addEventListener('click', toggle);
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) toggle();
        });
    }

    initComparison() {
        this.isCompareActive = false;
        this.isDraggingCompare = false;
        const compareBtn = document.getElementById('compareBtn');

        compareBtn?.addEventListener('click', () => {
            this.toggleCompareMode();
        });

        // Dragging logic
        document.addEventListener('mouseup', () => this.isDraggingCompare = false);
        document.addEventListener('mousemove', (e) => this.inputMove(e));
    }

    inputMove(e) {
        if (!this.isDraggingCompare) return;

        const container = document.getElementById('viewerContainer');
        const rect = container.getBoundingClientRect();
        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));

        const percent = (x / rect.width) * 100;
        this.updateSplitPosition(percent);
    }

    updateSplitPosition(percent) {
        const overlay = document.querySelector('.compare-overlay');
        const handle = document.querySelector('.compare-handle');
        if (overlay && handle) {
            overlay.style.width = `${percent}%`;
            handle.style.left = `${percent}%`;
        }
    }

    toggleCompareMode() {
        this.isCompareActive = !this.isCompareActive;
        const btn = document.getElementById('compareBtn');
        const container = document.getElementById('viewerContainer');

        btn.classList.toggle('active', this.isCompareActive);

        if (this.isCompareActive) {
            // Check if we have an analysis result to compare
            const lastCanvas = document.querySelector('#moduleResults canvas.analysis-canvas');
            if (lastCanvas) {
                // Clone the analysis canvas into the overlay
                this.setupCompareView(lastCanvas);
            } else {
                this.showToast('Run an analysis (ELA, Noise) first to compare', 'info');
                this.isCompareActive = false;
                btn.classList.remove('active');
            }
        } else {
            // Remove overlay
            const overlay = document.querySelector('.compare-overlay');
            const handle = document.querySelector('.compare-handle');
            overlay?.remove();
            handle?.remove();
        }
    }

    setupCompareView(analysisCanvas) {
        const container = document.getElementById('viewerContainer');
        const img = document.getElementById('previewImage');

        // Remove existing if any
        document.querySelector('.compare-overlay')?.remove();
        document.querySelector('.compare-handle')?.remove();

        // Create overlay struct
        const overlay = document.createElement('div');
        overlay.className = 'compare-overlay';

        const resultImg = document.createElement('img');
        resultImg.src = analysisCanvas.toDataURL(); // Use data URL or clone node

        overlay.appendChild(resultImg);

        // Create Handle
        const handle = document.createElement('div');
        handle.className = 'compare-handle';
        handle.innerHTML = '<svg class="icon"><use href="#icon-columns"/></svg>';
        handle.addEventListener('mousedown', (e) => {
            this.isDraggingCompare = true;
            e.preventDefault();
        });

        const labelLeft = document.createElement('div');
        labelLeft.className = 'compare-label left';
        labelLeft.textContent = 'Analysis';
        overlay.appendChild(labelLeft);

        // We need a right label too, but that goes outside overlay or handled differently
        // For simplicity, we just label the overlay "Analysis" and the background "Original" implicitly or add another label.

        container.appendChild(overlay);
        container.appendChild(handle);

        this.updateSplitPosition(50);
    }


    initDashboard() {
        this.riskScore = 0;
        this.findings = [];
        this.updateDashboardUI();
    }

    updateDashboardUI() {
        const scoreEl = document.getElementById('riskScoreValue');
        const circle = document.getElementById('riskScoreCircle');

        if (this.findings.length === 0) {
            scoreEl.innerText = '--';
            circle.className = 'risk-score-circle';
            return;
        }

        scoreEl.innerText = this.riskScore;
        circle.className = `risk-score-circle ${this.riskScore > 70 ? 'danger' : this.riskScore > 30 ? 'warning' : 'safe'}`;
    }

    addFinding(module, type, message) {
        // type: 'safe', 'warning', 'danger'
        // Update summary badges
        const summary = document.getElementById('findingsSummary');
        // Clear "No Analysis Run" if present
        if (summary.querySelector('.finding-safe')?.innerText === 'No Analysis Run') {
            summary.innerHTML = '';
        }

        const badge = document.createElement('div');
        badge.className = `finding-badge finding-${type}`;
        badge.innerText = `${module}: ${message}`;
        summary.appendChild(badge);

        // Add to local storage for logic
        this.findings.push({ module, type, message });

        // Update Risk Score Algorithm (Simplified)
        if (type === 'danger') this.riskScore = Math.min(100, this.riskScore + 40);
        if (type === 'warning') this.riskScore = Math.min(100, this.riskScore + 15);

        this.updateDashboardUI();
    }

    initMagicLens() {
        this.isLensActive = false;
        const lensBtn = document.getElementById('magicLensBtn');
        const container = document.getElementById('viewerContainer');

        if (!container) return; // Guard clause

        // Create lens elements
        this.lens = document.createElement('div');
        this.lens.className = 'magic-lens';
        // Force pointer-events none to ensure clicks/moves pass through to container
        this.lens.style.pointerEvents = 'none';
        this.lens.innerHTML = `
            <div class="lens-crosshair"></div>
            <div class="lens-hud">
                <div class="lens-row">
                    <span>RGB</span>
                    <span class="lens-value" id="lensRGB">0, 0, 0</span>
                </div>
                <div class="lens-row">
                    <span>HEX</span>
                    <span class="lens-value" id="lensHex">#000000</span>
                </div>
                <div class="lens-row">
                    <span>XY</span>
                    <span class="lens-value" id="lensCoords">0, 0</span>
                </div>
                <div class="lens-row">
                    <span>Color</span>
                    <div class="lens-color-preview" id="lensColor"></div>
                </div>
            </div>
        `;
        container.appendChild(this.lens); // Append to viewer container

        lensBtn?.addEventListener('click', () => {
            this.isLensActive = !this.isLensActive;
            lensBtn.classList.toggle('active', this.isLensActive);
            if (this.isLensActive) {
                container.style.cursor = 'none';
                this.lens.classList.add('active'); // Start visible to avoid flicker
            } else {
                container.style.cursor = 'default'; // Was 'grab' in viewer, but default is safer for now
                this.lens.classList.remove('active');
            }
        });

        // Use requestAnimationFrame for smooth movement
        let ticking = false;
        container.addEventListener('mousemove', (e) => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.updateLens(e);
                    ticking = false;
                });
                ticking = true;
            }
        });

        container.addEventListener('mouseleave', () => this.lens.classList.remove('active'));
    }

    updateLens(e) {
        if (!this.isLensActive || !this.currentImage) return;

        const container = document.getElementById('viewerContainer');
        const img = document.getElementById('previewImage');
        const containerRect = container.getBoundingClientRect();

        // Mouse relative to container
        let mouseX = e.clientX - containerRect.left;
        let mouseY = e.clientY - containerRect.top;

        // Check bounds within container
        if (mouseX < 0 || mouseX > containerRect.width || mouseY < 0 || mouseY > containerRect.height) {
            this.lens.classList.remove('active');
            return;
        }

        this.lens.classList.add('active');

        // Move lens to cursor
        this.lens.style.left = `${mouseX - 100}px`;
        this.lens.style.top = `${mouseY - 100}px`;

        // Calculate actual image coordinates accounting for transform
        // Transform: translate(x, y) scale(s)
        // Image Space X = (Mouse X - Translate X) / Scale
        const transform = this.transform || { x: 0, y: 0, scale: 1 };

        // We need the rect of the image *without* transform to know initial placement if it was centered?
        // Actually, easiest is to use the image's current bounding rect but reverse engineer the pixel.
        const imgRect = img.getBoundingClientRect();

        // Mouse relative to image (visual)
        const visualX = e.clientX - imgRect.left;
        const visualY = e.clientY - imgRect.top;

        // Mouse relative to image (natural/original scale)
        const scaleX = this.currentImage.naturalWidth / imgRect.width;
        const scaleY = this.currentImage.naturalHeight / imgRect.height;

        const realX = visualX * scaleX;
        const realY = visualY * scaleY;

        // Check if cursor is within the actual image
        if (realX >= 0 && realX <= this.currentImage.naturalWidth && realY >= 0 && realY <= this.currentImage.naturalHeight) {
            // Update background position to show magnified view
            const magLevel = 2; // Magnification factor relative to natural size

            // Background size must be: natural_width * magLevel
            const bgSizeX = this.currentImage.naturalWidth * magLevel;
            const bgSizeY = this.currentImage.naturalHeight * magLevel;

            this.lens.style.backgroundImage = `url('${this.currentImage.src}')`;
            this.lens.style.backgroundSize = `${bgSizeX}px ${bgSizeY}px`;

            // Position: - (realX * magLevel - lensRadius)
            const bgPosX = -(realX * magLevel - 100);
            const bgPosY = -(realY * magLevel - 100);
            this.lens.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;

            // Get Pixel Data
            this.updatePixelData(realX, realY);

            // Update Coords
            const lensCoords = document.getElementById('lensCoords');
            if (lensCoords) lensCoords.innerText = `${Math.round(realX)}, ${Math.round(realY)}`;
        } else {
            // Inside container but outside image
            this.lens.style.backgroundImage = 'none';
            this.lens.style.backgroundColor = '#000';
            const lensCoords = document.getElementById('lensCoords');
            if (lensCoords) lensCoords.innerText = `Off Image`;
        }
    }

    updatePixelData(x, y) {
        // Create a temporary canvas to read pixel data if not already cached
        if (!this.pixelContext) {
            const canvas = document.createElement('canvas');
            canvas.width = this.currentImage.naturalWidth;
            canvas.height = this.currentImage.naturalHeight;
            this.pixelContext = canvas.getContext('2d');
            this.pixelContext.drawImage(this.currentImage, 0, 0);
        }

        try {
            const pixel = this.pixelContext.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
            const r = pixel[0], g = pixel[1], b = pixel[2];
            const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();

            // Update HUD
            const lensRGB = document.getElementById('lensRGB');
            const lensHex = document.getElementById('lensHex');
            const lensColor = document.getElementById('lensColor');

            if (lensRGB) lensRGB.innerText = `${r}, ${g}, ${b}`;
            if (lensHex) lensHex.innerText = hex;
            if (lensColor) lensColor.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        } catch (e) {
            // Likely cross-origin issue or out of bounds
        }
    }

    initTheme() {
        const themeBtn = document.getElementById('themeToggleBtn');
        const iconUse = themeBtn?.querySelector('use');

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            iconUse?.setAttribute('href', '#icon-moon');
        }

        themeBtn?.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);

            // Update icon
            iconUse?.setAttribute('href', newTheme === 'light' ? '#icon-moon' : '#icon-sun');
        });
    }

    bindEvents() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        const uploadTrigger = document.getElementById('uploadTrigger');

        uploadZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone?.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFiles(e.dataTransfer.files);
            }
        });

        fileInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFiles(e.target.files);
            }
        });

        // Handle click on upload zone
        uploadZone?.addEventListener('click', () => fileInput?.click());

        // Handle sidebar Add Image button
        uploadTrigger?.addEventListener('click', () => fileInput?.click());

        document.getElementById('zoomInBtn')?.addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoomOutBtn')?.addEventListener('click', () => this.zoom(0.8));
        document.getElementById('resetViewBtn')?.addEventListener('click', () => this.resetView());
        document.getElementById('fullscreenBtn')?.addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('prevImageBtn')?.addEventListener('click', () => this.navigateImage(-1));
        document.getElementById('nextImageBtn')?.addEventListener('click', () => this.navigateImage(1));

        document.getElementById('exportJSON')?.addEventListener('click', () => this.exportReport('json'));
        document.getElementById('exportHTML')?.addEventListener('click', () => this.exportReport('html'));
        document.getElementById('exportPDF')?.addEventListener('click', () => this.exportReport('pdf'));
        document.getElementById('exportReportBtn')?.addEventListener('click', () => this.exportReport('pdf'));
        document.getElementById('runAllTestsBtn')?.addEventListener('click', () => this.runAllTests());
        document.getElementById('fullReportBtn')?.addEventListener('click', () => this.generateFullReport());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+O to open file
            if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                fileInput?.click();
            }
            // Ctrl+S to save/export report
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (this.currentImage) this.exportReport('pdf');
            }
            // Ctrl+E for quick JSON export
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                if (this.currentImage) this.exportReport('json');
            }
            // Arrow keys to navigate images
            if (e.key === 'ArrowLeft' && this.images.length > 1) {
                this.navigateImage(-1);
            }
            if (e.key === 'ArrowRight' && this.images.length > 1) {
                this.navigateImage(1);
            }
            // Escape to reset view
            if (e.key === 'Escape') {
                this.resetView();
            }
            // + and - for zoom
            if (e.key === '+' || e.key === '=') {
                this.zoom(1.2);
            }
            if (e.key === '-') {
                this.zoom(0.8);
            }
        });
    }

    initSidebar() {
        const navItems = document.querySelectorAll('.nav-item[data-module]');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.activeModule = item.dataset.module;
                this.runAnalysis(this.activeModule);
            });
        });
    }

    async handleFiles(files) {
        // Don't reset this.images, append instead
        let newImagesAdded = false;
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                // Prevent duplicates
                if (!this.images.some(img => img.name === file.name && img.size === file.size)) {
                    this.images.push(file);
                    newImagesAdded = true;
                }
            }
        }

        if (newImagesAdded) {
            // If this is the first batch, load the first image
            if (this.images.length === files.length && this.currentIndex === 0 && !this.currentImage) {
                await this.loadImage(this.images[0]);
            }
            this.updateFileList();
            this.showToast(`${files.length} file(s) added to queue`, 'success');
        }
    }

    async loadImage(file) {
        this.currentFile = file;
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const img = new Image();
                img.onload = async () => {
                    this.currentImage = img;
                    this.transform = { scale: 1, x: 0, y: 0 }; // Reset transform
                    this.initDashboard(); // Reset dashboard
                    this.displayImage();
                    await this.runInitialAnalysis();
                    resolve();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    displayImage() {
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('imageViewer').style.display = 'flex';
        document.getElementById('analysisContainer').style.display = 'block';
        document.getElementById('exportCard').style.display = 'block';
        document.getElementById('runAllTestsBtn').style.display = 'inline-flex';
        document.getElementById('fullReportBtn').style.display = 'inline-flex';
        document.getElementById('previewImage').src = this.currentImage.src;
        const fileSize = (this.currentFile.size / 1024).toFixed(1);
        document.getElementById('imageInfo').innerHTML = `
            <span class="info-badge"><svg class="icon"><use href="#icon-maximize"/></svg> ${this.currentImage.width} × ${this.currentImage.height}</span>
            <span class="info-badge"><svg class="icon"><use href="#icon-hard-drive"/></svg> ${fileSize} KB</span>
            <span class="info-badge"><svg class="icon"><use href="#icon-file-text"/></svg> ${this.currentFile.type.split('/')[1].toUpperCase()}</span>
        `;
    }

    updateFileList() {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = this.images.map((file, index) => `
            <div class="nav-item ${index === this.currentIndex ? 'active' : ''}" data-index="${index}">
                <span class="nav-item-icon"><svg class="icon"><use href="#icon-image"/></svg></span>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(file.name)}</span>
            </div>
        `).join('');
        fileList.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', async () => {
                const index = parseInt(item.dataset.index);
                this.currentIndex = index;
                await this.loadImage(this.images[index]);
                this.updateFileList();
            });
        });
    }

    navigateImage(direction) {
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.images.length) {
            this.currentIndex = newIndex;
            this.loadImage(this.images[newIndex]);
            this.updateFileList();
        }
    }

    zoom(factor) {
        if (!this.currentImage) return;
        const newScale = this.transform.scale * factor;
        this.transform.scale = Math.max(0.1, Math.min(newScale, 10)); // Limit zoom 0.1x to 10x
        this.updateTransform();
    }

    resetView() {
        this.transform = { scale: 1, x: 0, y: 0 };
        this.updateTransform();
    }

    updateTransform() {
        const img = document.getElementById('previewImage');
        if (img) {
            img.style.transform = `translate(${this.transform.x}px, ${this.transform.y}px) scale(${this.transform.scale})`;
        }
    }

    toggleFullscreen() {
        const container = document.getElementById('viewerContainer'); // Target container for FS
        if (!document.fullscreenElement) {
            container.requestFullscreen?.().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen?.();
        }
    }

    initImageViewer() {
        const container = document.getElementById('viewerContainer');
        const img = document.getElementById('previewImage');
        let isDragging = false;
        let startX, startY, initialX, initialY;

        // Mouse Wheel Zoom (Ctrl + Wheel)
        container.addEventListener('wheel', (e) => {
            if (!this.currentImage) return;

            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                this.zoom(delta);
            }
        });

        // Panning Logic
        container.addEventListener('mousedown', (e) => {
            if (!this.currentImage) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = this.transform.x;
            initialY = this.transform.y;
            container.classList.add('panning');
            container.style.cursor = 'grabbing';
            e.preventDefault(); // Prevent default drag behavior
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            this.transform.x = initialX + dx;
            this.transform.y = initialY + dy;
            this.updateTransform();
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                container.classList.remove('panning');
                container.style.cursor = 'grab';
            }
        });
    }

    async runInitialAnalysis() {
        this.analysisData = {};
        this.showToast('Running forensic analysis...', 'info');
        await Promise.all([
            this.analyzeMetadata(),
            this.analyzeHistogram(),
            this.analyzeFileSignature(),
            this.generateHashes()
        ]);
        // Estimate JPEG quality based on file size ratio
        const pixelCount = this.currentImage.width * this.currentImage.height;
        const bitsPerPixel = (this.currentFile.size * 8) / pixelCount;
        // Reset Dashboard & Score
        this.riskScore = 0;
        this.findings = []; // Reset findings
        document.getElementById('findingsSummary').innerHTML = '';

        // Generate Findings based on Analysis Data
        if (this.analysisData.signatureValid === false) this.addFinding('Signature', 'danger', 'Mismatch');
        if (!this.analysisData.hasExif) this.addFinding('Metadata', 'warning', 'Stripped');
        if (this.analysisData.editingSoftware) this.addFinding('Software', 'warning', 'Edited');
        if (this.analysisData.estimatedQuality < 75) this.addFinding('Quality', 'warning', 'Low (<75%)');

        // If no findings, add Safe badge & ensure score is 0
        if (this.riskScore === 0) {
            const summary = document.getElementById('findingsSummary');
            summary.innerHTML = '<div class="finding-badge finding-safe">No Issues Found</div>';
        }

        this.updateDashboardUI(); // Update the visual risk circle
        this.runAnalysis(this.activeModule);
        this.showToast('Analysis complete!', 'success');
    }

    async runAnalysis(module, autoRun = false) {
        if (!this.currentImage && module !== 'file-analysis') {
            this.showToast('Please upload an image first', 'error');
            return;
        }

        this.updatePanelContent(module);

        // Helper to handle auto-running
        const run = async (method) => {
            if (autoRun) await method(true);
            else await method();
        };

        switch (module) {
            case 'metadata': this.displayMetadata(); break;
            case 'file-analysis': this.displayFileAnalysis(); break;
            case 'hashes': this.displayHashes(); break;
            case 'ela': await run(this.runELA.bind(this)); break;
            case 'histogram': this.displayHistogram(); break;
            case 'steganography': await run(this.runSteganography.bind(this)); break;
            case 'deepfake': await run(this.runDeepfakeDetection.bind(this)); break;
            case 'clone-detection': await this.runCloneDetection(); break;
            case 'splice-detection': await this.runSpliceDetection(); break;
            case 'noise': await this.runNoiseAnalysis(); break;
            case 'jpeg-analysis': await this.runJPEGAnalysis(); break;
            case 'fft': await this.runFFTAnalysis(); break; // Fixed from 'frequency'
            case 'spn': await this.runSPNAnalysis(); break;
            case 'post-process': await this.runPostProcessCheck(); break;
            case 'forgery-risk': await this.runForgeryRisk(); break;
            case 'cgi-detection': await this.runCGIDetection(); break;
            case 'thumbnail': await this.runThumbnailAnalysis(); break;
            case 'strings': await this.runStringExtraction(); break;
            case 'reverse-search': await this.runReverseImageSearch(); break;
            case 'geolocation': await this.runGeolocation(); break;
            case 'timeline': await this.runTimelineAnalysis(); break;
            case 'gan-artifacts': await this.runGANArtifacts(); break;
            case 'dct-blocks': await this.runDCTAnalysis(); break;
            case 'double-compression': await this.runDoubleCompression(); break;
            case 'prnu': await run(this.runPRNUAnalysis.bind(this)); break;
            case 'fft': await this.runFFTAnalysis(); break; // FFT Alias
            default:
                document.getElementById('moduleResults').innerHTML = this.createCard('Analysis Module',
                    '<p style="color: var(--text-muted);">Select an analysis module from the sidebar.</p>');
        }
    }



    calculateSuspicionLevel() {
        // Score is already calculated by addFinding during analysis
        const score = this.riskScore;

        if (score >= 60) return { level: 'High Suspicion', class: 'danger', icon: '<svg class="icon"><use href="#icon-alert-triangle"/></svg>' };
        if (score >= 30) return { level: 'Moderate Risk', class: 'warning', icon: '<svg class="icon"><use href="#icon-alert-circle"/></svg>' };
        return { level: 'Low Risk', class: 'success', icon: '<svg class="icon"><use href="#icon-check-circle"/></svg>' };
    }

    updatePanelContent(module) {
        const panelContent = document.getElementById('panelContent');
        if (!panelContent) return;

        const info = {
            'metadata': {
                title: 'EXIF Metadata',
                icon: '#icon-file-text',
                desc: 'Hidden metadata embedded in the image file.',
                tips: ['Look for "Software" tags to detect editing.', 'GPS coordinates can reveal the exact location.', 'Date/Time Original vs Modify Date.']
            },
            'ela': {
                title: 'Error Level Analysis',
                icon: '#icon-zap',
                desc: 'Highlights differences in compression levels.',
                tips: ['White areas indicate higher compression error.', 'Edited areas often stand out as brighter patches.', 'Save at 95% quality for best results.']
            },
            'clone-detection': {
                title: 'Clone Detection',
                icon: '#icon-copy',
                desc: 'Identifies duplicated regions within the image.',
                tips: ['Red lines connect similar regions.', 'Useful for finding removed objects (cloning background).']
            },
            'noise': {
                title: 'Noise Analysis',
                icon: '#icon-grid',
                desc: 'Visualizes noise patterns in the image.',
                tips: ['Inconsistent noise suggests manipulation.', 'Brighter areas have different noise characteristics.']
            },
            'deepfake': {
                title: 'AI / Deepfake Check',
                icon: '#icon-bot',
                desc: 'Probalistic detection of AI-generated content.',
                tips: ['Analyzes artifacts common in GANs and Diffusion models.', 'Not 100% accurate, use as a hint.']
            },
            'geolocation': {
                title: 'Geolocation',
                icon: '#icon-globe',
                desc: 'Maps GPS coordinates found in metadata.',
                tips: ['Click markers to open in Maps.', 'Verify if the location matches the scene content.']
            }
        }[module] || {
            title: 'Analysis Details',
            icon: '#icon-info',
            desc: 'Select a module to view specific details.',
            tips: ['Hover over tooltips for more info.', 'Use "Run All Tests" for a complete report.']
        };

        panelContent.innerHTML = `
            <div class="card">
                <div class="card-body" style="text-align: center; padding: 32px;">
                    <div style="margin-bottom: 16px; color: var(--accent);">
                        <svg class="icon" style="width: 48px; height: 48px;"><use href="${info.icon}"/></svg>
                    </div>
                    <h4 style="margin-bottom: 8px;">${info.title}</h4>
                    <p style="color: var(--text-muted); font-size: 13px;">${info.desc}</p>
                </div>
            </div>
            ${info.tips && info.tips.length ? `
            <div class="card" style="margin-top: 16px;">
                <div class="card-header">
                    <div class="card-title">
                        <span class="card-title-icon"><svg class="icon"><use href="#icon-lightbulb"/></svg></span>
                        Quick Tips
                    </div>
                </div>
                <div class="card-body">
                    <ul style="padding-left: 20px; font-size: 13px; color: var(--text-secondary); margin: 0;">
                        ${info.tips.map(tip => `<li style="margin-bottom: 4px;">${tip}</li>`).join('')}
                    </ul>
                </div>
            </div>` : ''}
        `;
    }

    // METADATA ANALYSIS
    async analyzeMetadata() {
        const buffer = await this.fileToArrayBuffer(this.currentFile);
        const exifData = this.parseEXIF(buffer);
        const xmpData = this.parseXMP(buffer);
        const iptcData = this.parseIPTC(buffer);

        // Merge all metadata
        this.analysisData.metadata = { ...exifData, ...xmpData, ...iptcData };
        this.analysisData.hasExif = Object.keys(this.analysisData.metadata).length > 3;
        this.analysisData.editingSoftware = this.detectEditingSoftware(this.analysisData.metadata);
    }

    parseEXIF(buffer) {
        const view = new DataView(buffer);
        const exifData = {};
        const bytes = new Uint8Array(buffer);

        // File info
        exifData['File Size'] = `${(buffer.byteLength / 1024).toFixed(2)} KB`;

        // Detect file format
        if (view.getUint16(0) === 0xFFD8) {
            exifData['File Format'] = 'JPEG';
        } else if (view.getUint32(0) === 0x89504E47) {
            exifData['File Format'] = 'PNG';
        } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
            exifData['File Format'] = 'WebP';
        } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
            exifData['File Format'] = 'GIF';
        }

        // EXIF tag definitions - Comprehensive 100+ tags
        const exifTags = {
            // IFD0 (Main Image)
            0x0100: 'Image Width', 0x0101: 'Image Height', 0x0102: 'Bits Per Sample',
            0x0103: 'Compression', 0x0106: 'Photometric Interpretation',
            0x010D: 'Document Name', 0x010E: 'Image Description', 0x010F: 'Camera Make',
            0x0110: 'Camera Model', 0x0111: 'Strip Offsets', 0x0112: 'Orientation',
            0x0115: 'Samples Per Pixel', 0x0116: 'Rows Per Strip',
            0x0117: 'Strip Byte Counts', 0x011A: 'X Resolution', 0x011B: 'Y Resolution',
            0x011C: 'Planar Configuration', 0x0128: 'Resolution Unit',
            0x012D: 'Transfer Function', 0x0131: 'Software', 0x0132: 'Modify Date',
            0x013B: 'Artist', 0x013C: 'Host Computer', 0x013E: 'White Point',
            0x013F: 'Primary Chromaticities', 0x0142: 'Tile Width', 0x0143: 'Tile Length',
            0x0144: 'Tile Offsets', 0x0145: 'Tile Byte Counts',
            0x014A: 'Sub IFD Offsets', 0x0156: 'Transfer Range',
            0x0200: 'JPEG Proc', 0x0201: 'Thumbnail Offset', 0x0202: 'Thumbnail Length',
            0x0211: 'YCbCr Coefficients', 0x0212: 'YCbCr Sub Sampling',
            0x0213: 'YCbCr Positioning', 0x0214: 'Reference Black White',
            0x02BC: 'XMP Data', 0x1000: 'Related Image File Format',
            0x1001: 'Related Image Width', 0x1002: 'Related Image Height',
            0x4746: 'Rating', 0x4749: 'Rating Percent',
            0x8298: 'Copyright', 0x8769: 'EXIF Offset', 0x8773: 'ICC Profile',
            0x8825: 'GPS Info', 0x8830: 'Sensitivity Type',
            0x8831: 'Standard Output Sensitivity', 0x8832: 'Recommended Exposure Index',
            0x8833: 'ISO Speed', 0x8834: 'ISO Speed Latitude yyy',
            0x8835: 'ISO Speed Latitude zzz',

            // EXIF IFD (Camera Settings)
            0x829A: 'Exposure Time', 0x829D: 'F-Number', 0x8822: 'Exposure Program',
            0x8824: 'Spectral Sensitivity', 0x8827: 'ISO Speed',
            0x8828: 'OECF', 0x8830: 'Sensitivity Type',
            0x9000: 'EXIF Version', 0x9003: 'Date/Time Original', 0x9004: 'Date Created',
            0x9009: 'Offset Time', 0x900A: 'Offset Time Original',
            0x900B: 'Offset Time Digitized',
            0x9101: 'Components Config', 0x9102: 'Compressed Bits/Pixel',
            0x9201: 'Shutter Speed Value', 0x9202: 'Aperture Value',
            0x9203: 'Brightness Value', 0x9204: 'Exposure Compensation',
            0x9205: 'Max Aperture Value', 0x9206: 'Subject Distance',
            0x9207: 'Metering Mode', 0x9208: 'Light Source', 0x9209: 'Flash',
            0x920A: 'Focal Length', 0x9214: 'Subject Area',
            0x927C: 'Maker Note', 0x9286: 'User Comment', 0x9290: 'Sub Sec Time',
            0x9291: 'Sub Sec Time Original', 0x9292: 'Sub Sec Time Digitized',
            0x9400: 'Temperature', 0x9401: 'Humidity', 0x9402: 'Pressure',
            0x9403: 'Water Depth', 0x9404: 'Acceleration', 0x9405: 'Camera Elevation Angle',
            0xA000: 'FlashPix Version', 0xA001: 'Color Space',
            0xA002: 'EXIF Image Width', 0xA003: 'EXIF Image Height',
            0xA004: 'Related Sound File', 0xA005: 'Interoperability Offset',
            0xA20B: 'Flash Energy', 0xA20C: 'Spatial Frequency Response',
            0xA20E: 'Focal Plane X Resolution', 0xA20F: 'Focal Plane Y Resolution',
            0xA210: 'Focal Plane Resolution Unit', 0xA214: 'Subject Location',
            0xA215: 'Exposure Index', 0xA217: 'Sensing Method',
            0xA300: 'File Source', 0xA301: 'Scene Type', 0xA302: 'CFA Pattern',
            0xA401: 'Custom Rendered', 0xA402: 'Exposure Mode', 0xA403: 'White Balance',
            0xA404: 'Digital Zoom Ratio', 0xA405: 'Focal Length (35mm)',
            0xA406: 'Scene Capture Type', 0xA407: 'Gain Control', 0xA408: 'Contrast',
            0xA409: 'Saturation', 0xA40A: 'Sharpness', 0xA40B: 'Device Setting Description',
            0xA40C: 'Subject Distance Range', 0xA420: 'Image Unique ID',
            0xA430: 'Camera Owner Name', 0xA431: 'Body Serial Number',
            0xA432: 'Lens Specification', 0xA433: 'Lens Make', 0xA434: 'Lens Model',
            0xA435: 'Lens Serial Number', 0xA460: 'Composite Image',
            0xA461: 'Source Image Number of Composite Image',
            0xA462: 'Source Exposure Times of Composite Image',
            0xA500: 'Gamma',

            // Print Image Matching
            0xC4A5: 'Print Image Matching',

            // DNG Tags
            0xC612: 'DNG Version', 0xC613: 'DNG Backward Version',
            0xC614: 'Unique Camera Model', 0xC615: 'Localized Camera Model',
            0xC621: 'Color Matrix1', 0xC622: 'Color Matrix2',
            0xC623: 'Camera Calibration1', 0xC624: 'Camera Calibration2',
            0xC628: 'As Shot Neutral', 0xC62A: 'Baseline Exposure',
            0xC62B: 'Baseline Noise', 0xC62C: 'Baseline Sharpness',
            0xC62D: 'Bayer Green Split', 0xC62E: 'Linear Response Limit',
            0xC62F: 'Camera Serial Number', 0xC630: 'Lens Info (DNG)',
            0xC634: 'DNG Private Data'
        };

        const gpsTags = {
            0x0000: 'GPS Version ID', 0x0001: 'GPS Latitude Ref', 0x0002: 'GPS Latitude',
            0x0003: 'GPS Longitude Ref', 0x0004: 'GPS Longitude', 0x0005: 'GPS Altitude Ref',
            0x0006: 'GPS Altitude', 0x0007: 'GPS Time Stamp', 0x0008: 'GPS Satellites',
            0x0009: 'GPS Status', 0x000A: 'GPS Measure Mode', 0x000B: 'GPS DOP',
            0x000C: 'GPS Speed Ref', 0x000D: 'GPS Speed', 0x000E: 'GPS Track Ref',
            0x000F: 'GPS Track', 0x0010: 'GPS Img Direction Ref',
            0x0011: 'GPS Img Direction', 0x0012: 'GPS Map Datum',
            0x0013: 'GPS Dest Latitude Ref', 0x0014: 'GPS Dest Latitude',
            0x0015: 'GPS Dest Longitude Ref', 0x0016: 'GPS Dest Longitude',
            0x0017: 'GPS Dest Bearing Ref', 0x0018: 'GPS Dest Bearing',
            0x0019: 'GPS Dest Distance Ref', 0x001A: 'GPS Dest Distance',
            0x001B: 'GPS Processing Method', 0x001C: 'GPS Area Information',
            0x001D: 'GPS Date Stamp', 0x001E: 'GPS Differential',
            0x001F: 'GPS H Positioning Error'
        };

        // Parse JPEG EXIF
        if (view.getUint16(0) === 0xFFD8) {
            let offset = 2;
            while (offset < Math.min(buffer.byteLength - 4, 65535)) {
                if (view.getUint8(offset) !== 0xFF) break;
                const marker = view.getUint8(offset + 1);
                if (marker === 0xD9 || marker === 0xDA) break;
                const length = view.getUint16(offset + 2);

                // APP1 marker (EXIF)
                if (marker === 0xE1) {
                    exifData['EXIF Present'] = 'Yes';
                    const exifStart = offset + 4;
                    // Check for "Exif\0\0" header
                    if (bytes[exifStart] === 0x45 && bytes[exifStart + 1] === 0x78 &&
                        bytes[exifStart + 2] === 0x69 && bytes[exifStart + 3] === 0x66) {
                        const tiffStart = exifStart + 6;
                        const littleEndian = view.getUint16(tiffStart) === 0x4949;
                        const ifdOffset = view.getUint32(tiffStart + 4, littleEndian);

                        // Parse IFD0
                        this.parseIFD(view, tiffStart, tiffStart + ifdOffset, littleEndian, exifData, exifTags, bytes, gpsTags);

                        // Check for IFD1 (Thumbnail)
                        const entries = view.getUint16(tiffStart + ifdOffset, littleEndian);
                        const nextIFDLocation = tiffStart + ifdOffset + 2 + (entries * 12);
                        if (nextIFDLocation + 4 <= view.byteLength) {
                            const nextIFDOffset = view.getUint32(nextIFDLocation, littleEndian);
                            if (nextIFDOffset > 0) {
                                // Parse IFD1
                                this.parseIFD(view, tiffStart, tiffStart + nextIFDOffset, littleEndian, exifData, exifTags, bytes, gpsTags);
                            }
                        }
                    }
                }

                // APP0 marker (JFIF)
                if (marker === 0xE0) exifData['JFIF Header'] = 'Present';

                // APP13 marker (IPTC)
                if (marker === 0xED) exifData['IPTC Data'] = 'Present';

                // XMP marker
                if (marker === 0xE1) {
                    const xmpCheck = String.fromCharCode(...bytes.slice(offset + 4, offset + 32));
                    if (xmpCheck.includes('http://ns.adobe.com/xap')) {
                        exifData['XMP Data'] = 'Present';
                    }
                }

                offset += 2 + length;
            }
        }

        // Extract text strings from file for additional metadata
        this.extractTextMetadata(bytes, exifData);

        return exifData;
    }

    parseIFD(view, tiffStart, ifdOffset, littleEndian, exifData, exifTags, bytes, gpsTags) {
        try {
            if (ifdOffset >= view.byteLength - 2) return;
            const entries = view.getUint16(ifdOffset, littleEndian);

            for (let i = 0; i < entries && i < 100; i++) {
                const entryOffset = ifdOffset + 2 + (i * 12);
                if (entryOffset + 12 > view.byteLength) break;

                const tag = view.getUint16(entryOffset, littleEndian);
                const type = view.getUint16(entryOffset + 2, littleEndian);
                const count = view.getUint32(entryOffset + 4, littleEndian);
                let valueOffset = entryOffset + 8;

                // If value is larger than 4 bytes, it's stored elsewhere
                const valueSize = this.getTypeSize(type) * count;
                if (valueSize > 4) {
                    valueOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
                }

                if (valueOffset >= view.byteLength) continue;

                const tagName = exifTags[tag] || gpsTags[tag];
                if (tagName) {
                    const value = this.readTagValue(view, valueOffset, type, count, littleEndian, bytes);
                    if (value !== null && value !== undefined && value !== '') {
                        exifData[tagName] = value;
                    }
                }

                // Follow EXIF IFD pointer
                if (tag === 0x8769) {
                    const exifIfdOffset = view.getUint32(valueOffset, littleEndian);
                    this.parseIFD(view, tiffStart, tiffStart + exifIfdOffset, littleEndian, exifData, exifTags, bytes, gpsTags);
                }

                // Follow GPS IFD pointer
                if (tag === 0x8825) {
                    const gpsIfdOffset = view.getUint32(valueOffset, littleEndian);
                    this.parseIFD(view, tiffStart, tiffStart + gpsIfdOffset, littleEndian, exifData, gpsTags, bytes, gpsTags);
                    exifData['GPS Data'] = 'Present';
                }
            }
        } catch (e) { /* Silently handle parsing errors */ }
    }

    getTypeSize(type) {
        const sizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8, 11: 4, 12: 8 };
        return sizes[type] || 1;
    }

    readTagValue(view, offset, type, count, littleEndian, bytes) {
        try {
            switch (type) {
                case 1: // BYTE
                case 7: // UNDEFINED
                    return count === 1 ? view.getUint8(offset) : Array.from(bytes.slice(offset, offset + Math.min(count, 32)));
                case 2: // ASCII
                    let str = '';
                    for (let i = 0; i < count && i < 200; i++) {
                        const char = bytes[offset + i];
                        if (char === 0) break;
                        if (char >= 32 && char <= 126) str += String.fromCharCode(char);
                    }
                    return str.trim();
                case 3: // SHORT
                    return count === 1 ? view.getUint16(offset, littleEndian) :
                        Array.from({ length: Math.min(count, 10) }, (_, i) => view.getUint16(offset + i * 2, littleEndian));
                case 4: // LONG
                    return view.getUint32(offset, littleEndian);
                case 5: // RATIONAL
                    if (count > 1) {
                        const vals = [];
                        for (let k = 0; k < count; k++) {
                            const n = view.getUint32(offset + k * 8, littleEndian);
                            const d = view.getUint32(offset + k * 8 + 4, littleEndian);
                            vals.push(d === 0 ? 0 : n / d);
                        }
                        return vals;
                    }
                    const num = view.getUint32(offset, littleEndian);
                    const den = view.getUint32(offset + 4, littleEndian);
                    return den === 0 ? 0 : num / den;
                case 9: // SLONG
                    return view.getInt32(offset, littleEndian);
                case 10: // SRATIONAL
                    const snum = view.getInt32(offset, littleEndian);
                    const sden = view.getInt32(offset + 4, littleEndian);
                    return sden === 0 ? 0 : (snum / sden).toFixed(4).replace(/\.?0+$/, '');
                default:
                    return null;
            }
        } catch (e) { return null; }
    }

    extractTextMetadata(bytes, exifData) {
        // Search for common software signatures in raw bytes
        const searchPatterns = [
            { pattern: 'Adobe Photoshop', key: 'Software' },
            { pattern: 'GIMP', key: 'Software' },
            { pattern: 'Lightroom', key: 'Software' },
            { pattern: 'Snapseed', key: 'Software' },
            { pattern: 'DALL-E', key: 'AI Generator' },
            { pattern: 'Midjourney', key: 'AI Generator' },
            { pattern: 'Stable Diffusion', key: 'AI Generator' },
            { pattern: 'Adobe Firefly', key: 'AI Generator' },
            { pattern: 'Dream by WOMBO', key: 'AI Generator' },
            { pattern: 'Canva', key: 'Software' },
            { pattern: 'PicsArt', key: 'Software' }
        ];

        // Convert portion of bytes to string for searching
        const maxSearch = Math.min(bytes.length, 65535);
        let textContent = '';
        for (let i = 0; i < maxSearch; i++) {
            if (bytes[i] >= 32 && bytes[i] <= 126) textContent += String.fromCharCode(bytes[i]);
            else textContent += ' ';
        }

        for (const { pattern, key } of searchPatterns) {
            if (textContent.includes(pattern)) {
                exifData[key] = exifData[key] ? exifData[key] + ', ' + pattern : pattern;
            }
        }
    }

    detectEditingSoftware(metadata) {
        const software = metadata['Software'] || '';
        const xmpHistory = metadata['XMP History'] || '';
        return ['Photoshop', 'GIMP', 'Lightroom', 'Photosop', 'Krita'].some(t =>
            software.toLowerCase().includes(t.toLowerCase()) ||
            xmpHistory.toLowerCase().includes(t.toLowerCase())
        );
    }

    // --- NEW: XMP PARSER ---
    parseXMP(buffer) {
        const view = new DataView(buffer);
        let offset = 2;
        const xmpData = {};

        while (offset < buffer.byteLength - 4) {
            if (view.getUint8(offset) !== 0xFF) break;
            const marker = view.getUint8(offset + 1);
            const length = view.getUint16(offset + 2);

            if (marker === 0xE1) { // APP1
                const nsStart = offset + 4;
                const nsLength = 29; // "http://ns.adobe.com/xap/1.0/\0"
                // Check signature
                // Simple check: Is it XMP?
                const sig = String.fromCharCode(...new Uint8Array(buffer.slice(nsStart, nsStart + 28)));
                if (sig === "http://ns.adobe.com/xap/1.0/") {
                    // Found XMP!
                    const xmlStart = nsStart + nsLength;
                    const xmlEnd = offset + 2 + length;
                    const xmlString = String.fromCharCode(...new Uint8Array(buffer.slice(xmlStart, xmlEnd)));

                    // Basic Regex Parsing (since no DOMParser context or heavy XML lib)
                    const extract = (tag) => {
                        const match = xmlString.match(new RegExp(`<${tag}>(.*?)</${tag}>`)) ||
                            xmlString.match(new RegExp(`${tag}="([^"]+)"`));
                        return match ? match[1] : null;
                    };

                    // Dublin Core
                    if (extract('dc:format')) xmpData['XMP Format'] = extract('dc:format');
                    if (extract('dc:title')) xmpData['XMP Title'] = extract('dc:title');
                    if (extract('dc:description')) xmpData['XMP Description'] = extract('dc:description');
                    if (extract('dc:creator')) xmpData['XMP Creator'] = extract('dc:creator');
                    if (extract('dc:rights')) xmpData['XMP Rights'] = extract('dc:rights');

                    // Photoshop
                    if (extract('photoshop:DateCreated')) xmpData['XMP Date Created'] = extract('photoshop:DateCreated');
                    if (extract('photoshop:City')) xmpData['XMP City'] = extract('photoshop:City');
                    if (extract('photoshop:Country')) xmpData['XMP Country'] = extract('photoshop:Country');

                    // History is complex (Seq), simpler check
                    if (xmlString.includes('photoshop:History')) xmpData['XMP History'] = 'Present (Edited)';

                    // AI signatures in XMP
                    if (xmlString.includes('adobe:firefly') || xmlString.includes('Firefly')) xmpData['AI Generator'] = 'Adobe Firefly';
                }
            }
            offset += 2 + length;
        }
        return xmpData;
    }

    // --- NEW: IPTC PARSER ---
    parseIPTC(buffer) {
        const view = new DataView(buffer);
        let offset = 2;
        const iptcData = {};

        while (offset < buffer.byteLength - 4) {
            if (view.getUint8(offset) !== 0xFF) break;
            const marker = view.getUint8(offset + 1);
            const length = view.getUint16(offset + 2);

            if (marker === 0xED) { // APP13 (IPTC/Photoshop)
                // Look for 'Photoshop 3.0\0' signature
                const sig = String.fromCharCode(...new Uint8Array(buffer.slice(offset + 4, offset + 18))); // "Photoshop 3.0\0"
                if (sig.startsWith("Photoshop 3.0")) {
                    let pos = offset + 4 + 14; // Start of 8BIM blocks
                    const end = offset + 2 + length;

                    while (pos < end - 8) {
                        const match = String.fromCharCode(...new Uint8Array(buffer.slice(pos, pos + 4)));
                        if (match !== '8BIM') break;

                        const id = view.getUint16(pos + 4); // Resource ID
                        // Name (Pascal string, padded to even)
                        const nameLen = view.getUint8(pos + 6);
                        const paddedNameLen = nameLen % 2 === 0 ? nameLen + 2 : nameLen + 1;
                        const size = view.getUint32(pos + 6 + paddedNameLen);

                        const dataStart = pos + 10 + paddedNameLen;

                        // ID 0x0404 is IPTC-NAA
                        if (id === 0x0404) {
                            this.parseIPTCBlock(buffer, dataStart, size, iptcData);
                        }

                        pos = dataStart + size;
                        if (pos % 2 !== 0) pos++; // Pad to even
                    }
                }
            }
            offset += 2 + length;
        }
        return iptcData;
    }

    parseIPTCBlock(buffer, start, length, output) {
        let pos = start;
        const end = start + length;
        const view = new DataView(buffer);

        while (pos < end - 5) {
            const tagMarker = view.getUint8(pos);
            if (tagMarker !== 0x1C) { pos++; continue; } // 0x1C is IIM marker

            const record = view.getUint8(pos + 1);
            const dataset = view.getUint8(pos + 2);
            const size = view.getUint16(pos + 3);

            if (pos + 5 + size > end) break;

            const value = String.fromCharCode(...new Uint8Array(buffer.slice(pos + 5, pos + 5 + size)));

            // Map common IPTC datasets
            if (record === 2) {
                const keys = {
                    5: 'Object Name', 15: 'Category', 25: 'Keywords',
                    55: 'Date Created', 60: 'Time Created', 80: 'By-line',
                    85: 'By-line Title', 90: 'City', 92: 'Sub-location',
                    95: 'Province/State', 101: 'Country/Primary Location Name',
                    105: 'Headline', 110: 'Credit', 115: 'Source',
                    116: 'Copyright Notice', 120: 'Caption/Abstract',
                    122: 'Writer/Editor'
                };
                if (keys[dataset]) {
                    // Accumulate keywords (2:25)
                    if (dataset === 25 && output[keys[25]]) {
                        output[keys[25]] += `, ${value}`;
                    } else {
                        output[keys[dataset]] = value;
                    }
                }
            }
            pos += 5 + size;
        }
    }

    displayMetadata() {
        const metadata = this.analysisData.metadata || {};

        // Calculate Suspicion for Overview
        const suspicious = this.calculateSuspicionLevel();

        // Construct Quick Overview HTML
        let overviewHtml = `
        <div class="card" style="margin-bottom: 20px;">
            <div class="card-header">
                <div class="card-title">
                    <span class="card-title-icon"><svg class="icon"><use href="#icon-bar-chart"/></svg></span>
                    Quick Analysis Overview
                </div>
                <div>
                    <span class="status-badge ${suspicious.class}">${suspicious.icon} ${suspicious.level}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="result-grid">
                    <div class="result-item"><div class="result-label">File Name</div><div class="result-value">${this.escapeHtml(this.currentFile.name)}</div></div>
                    <div class="result-item"><div class="result-label">File Type</div><div class="result-value">${this.escapeHtml(this.currentFile.type.split('/')[1].toUpperCase())}</div></div>
                    <div class="result-item"><div class="result-label">Dimensions</div><div class="result-value">${this.currentImage.width} × ${this.currentImage.height}</div></div>
                    <div class="result-item"><div class="result-label">File Size</div><div class="result-value">${(this.currentFile.size / 1024).toFixed(1)} KB</div></div>
                    <div class="result-item"><div class="result-label">Signature Valid</div><div class="result-value ${this.analysisData.signatureValid ? 'success' : 'danger'}">${this.analysisData.signatureValid ? '<svg class="icon icon-sm"><use href="#icon-check-circle"/></svg> Valid' : '<svg class="icon icon-sm"><use href="#icon-alert-triangle"/></svg> Invalid'}</div></div>
                    <div class="result-item"><div class="result-label">EXIF Data</div><div class="result-value">${this.analysisData.hasExif ? 'Present' : 'Stripped'}</div></div>
                    <div class="result-item"><div class="result-label">Est. Quality</div><div class="result-value">${this.analysisData.estimatedQuality || 'N/A'}%</div></div>
                </div>
            </div>
        </div>
    `;

        // Categorize metadata
        const categories = {
            '<svg class="icon"><use href="#icon-file-text"/></svg> File Information': ['File Size', 'File Format', 'Image Width', 'Image Height', 'EXIF Image Width', 'EXIF Image Height', 'Bits Per Sample', 'Compression', 'Orientation', 'Resolution Unit', 'X Resolution', 'Y Resolution'],
            '<svg class="icon"><use href="#icon-camera"/></svg> Camera': ['Camera Make', 'Camera Model', 'Body Serial Number', 'Camera Serial Number', 'Camera Owner Name', 'Unique Camera Model', 'Host Computer'],
            '<svg class="icon"><use href="#icon-aperture"/></svg> Lens': ['Lens Make', 'Lens Model', 'Lens Serial Number', 'Lens Specification', 'Lens Info', 'Lens Info (DNG)', 'Focal Length', 'Focal Length (35mm)', 'Max Aperture Value'],
            '<svg class="icon"><use href="#icon-zap"/></svg> Exposure': ['Exposure Time', 'Shutter Speed Value', 'F-Number', 'Aperture Value', 'ISO Speed', 'Exposure Program', 'Exposure Mode', 'Exposure Compensation', 'Brightness Value', 'Metering Mode', 'Flash', 'Light Source', 'White Balance', 'Scene Capture Type', 'Subject Distance', 'Subject Distance Range', 'Digital Zoom Ratio', 'Gain Control', 'Sensitivity Type'],
            '<svg class="icon"><use href="#icon-globe"/></svg> GPS Location': ['GPS Data', 'GPS Latitude', 'GPS Latitude Ref', 'GPS Longitude', 'GPS Longitude Ref', 'GPS Altitude', 'GPS Altitude Ref', 'GPS Time Stamp', 'GPS Date Stamp', 'GPS Speed', 'GPS Speed Ref', 'GPS Track', 'GPS Img Direction', 'GPS Map Datum', 'GPS Satellites', 'GPS Status', 'GPS DOP', 'GPS Processing Method', 'GPS Area Information'],
            '<svg class="icon"><use href="#icon-clock"/></svg> Dates & Times': ['Date/Time Original', 'Date Created', 'Modify Date', 'Sub Sec Time', 'Sub Sec Time Original', 'Sub Sec Time Digitized', 'Offset Time', 'Offset Time Original'],
            '<svg class="icon"><use href="#icon-palette"/></svg> Color & Image': ['Color Space', 'Gamma', 'Contrast', 'Saturation', 'Sharpness', 'Custom Rendered', 'Photometric Interpretation', 'YCbCr Positioning', 'YCbCr Sub Sampling', 'Components Config'],
            '<svg class="icon"><use href="#icon-cpu"/></svg> Technical': ['EXIF Version', 'FlashPix Version', 'Focal Plane X Resolution', 'Focal Plane Y Resolution', 'Focal Plane Resolution Unit', 'Sensing Method', 'File Source', 'Scene Type', 'CFA Pattern', 'Compressed Bits/Pixel', 'Image Unique ID', 'Subject Area', 'Subject Location'],
            '<svg class="icon"><use href="#icon-thermometer"/></svg> Environment': ['Temperature', 'Humidity', 'Pressure', 'Water Depth', 'Acceleration', 'Camera Elevation Angle'],
            '<svg class="icon"><use href="#icon-edit"/></svg> Authorship': ['Artist', 'Copyright', 'Image Description', 'User Comment', 'Document Name', 'Rating', 'Rating Percent'],
            '<svg class="icon"><use href="#icon-hard-drive"/></svg> Software & Processing': ['Software', 'AI Generator', 'EXIF Present', 'JFIF Header', 'IPTC Data', 'XMP Data', 'ICC Profile', 'Maker Note', 'Print Image Matching'],
            '<svg class="icon"><use href="#icon-file-text"/></svg> DNG/RAW': ['DNG Version', 'DNG Backward Version', 'Baseline Exposure', 'Baseline Noise', 'Baseline Sharpness', 'As Shot Neutral', 'Color Matrix1', 'Color Matrix2', 'Camera Calibration1', 'Camera Calibration2', 'DNG Private Data'],
            '<svg class="icon"><use href="#icon-image"/></svg> Thumbnail': ['Thumbnail Offset', 'Thumbnail Length']
        };

        let html = '';
        let foundAny = false;

        for (const [categoryName, fields] of Object.entries(categories)) {
            const categoryItems = fields
                .filter(field => metadata[field] !== undefined && metadata[field] !== null && metadata[field] !== '')
                .map(field => {
                    let value = metadata[field];
                    // Format arrays nicely
                    if (Array.isArray(value)) value = value.slice(0, 10).join(', ') + (value.length > 10 ? '...' : '');
                    // Highlight important values
                    let valueClass = '';
                    if (field === 'AI Generator') valueClass = 'danger';
                    if (field === 'GPS Data' || field.includes('GPS Latitude') || field.includes('GPS Longitude')) valueClass = 'warning';
                    return `<div class="result-item"><div class="result-label">${field}</div><div class="result-value ${valueClass}" style="font-size: 13px; word-break: break-word;">${this.escapeHtml(value)}</div></div>`;
                });

            if (categoryItems.length > 0) {
                foundAny = true;
                html += `
                    <div style="margin-bottom: 20px;">
                        <div style="font-weight: 600; font-size: 15px; margin-bottom: 10px; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px;">${categoryName}</div>
                        <div class="result-grid">${categoryItems.join('')}</div>
                    </div>
                `;
            }
        }

        // Show any remaining uncategorized fields
        const categorizedFields = new Set(Object.values(categories).flat());
        const uncategorized = Object.entries(metadata)
            .filter(([key]) => !categorizedFields.has(key))
            .map(([key, value]) => {
                if (Array.isArray(value)) value = value.slice(0, 10).join(', ') + (value.length > 10 ? '...' : '');
                return `<div class="result-item"><div class="result-label">${this.escapeHtml(key)}</div><div class="result-value" style="font-size: 13px; word-break: break-word;">${this.escapeHtml(value)}</div></div>`;
            });

        if (uncategorized.length > 0) {
            foundAny = true;
            html += `
                <div style="margin-bottom: 20px;">
                    <div style="font-weight: 600; font-size: 15px; margin-bottom: 10px; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px;">📦 Other Metadata</div>
                    <div class="result-grid">${uncategorized.join('')}</div>
                </div>
            `;
        }

        if (!foundAny) {
            html = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                    <p>No EXIF metadata found in this image.</p>
                    <p style="font-size: 13px; margin-top: 8px;">This could indicate the metadata was stripped or the image was created without EXIF data.</p>
                </div>
            `;
        }

        const metadataCount = Object.keys(metadata).length;

        // Prepend Overview to HTML
        html = overviewHtml + html;

        document.getElementById('moduleResults').innerHTML = this.createCard(`📋 EXIF / Metadata Analysis <span style="font-size: 13px; color: var(--text-muted); font-weight: normal;">(${metadataCount} fields found)</span>`, html);
    }

    // FILE SIGNATURE & TRUE MIME TYPE
    async analyzeFileSignature() {
        const buffer = await this.fileToArrayBuffer(this.currentFile);
        const bytes = new Uint8Array(buffer.slice(0, 32)); // Read first 32 bytes for deeper check

        // Comprehensive Magic Bytes Signature List
        const signatures = [
            { type: 'image/jpeg', ext: 'jpg', sig: [0xFF, 0xD8, 0xFF] },
            { type: 'image/png', ext: 'png', sig: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
            { type: 'image/gif', ext: 'gif', sig: [0x47, 0x49, 0x46, 0x38] },
            { type: 'image/webp', ext: 'webp', sig: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50] }, // RIFF....WEBP
            { type: 'image/bmp', ext: 'bmp', sig: [0x42, 0x4D] },
            { type: 'image/tiff', ext: 'tiff', sig: [0x49, 0x49, 0x2A, 0x00] }, // LE
            { type: 'image/tiff', ext: 'tiff', sig: [0x4D, 0x4D, 0x00, 0x2A] }, // BE
            { type: 'image/x-icon', ext: 'ico', sig: [0x00, 0x00, 0x01, 0x00] },
            { type: 'image/heic', ext: 'heic', sig: [null, null, null, null, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69] }, // ...ftyphic
            { type: 'image/avif', ext: 'avif', sig: [null, null, null, null, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66] }, // ...ftypavif
            { type: 'application/pdf', ext: 'pdf', sig: [0x25, 0x50, 0x44, 0x46, 0x2D] },
            { type: 'application/zip', ext: 'zip', sig: [0x50, 0x4B, 0x03, 0x04] }
        ];

        let detectedMime = 'Unknown';
        let detectedExt = 'unknown';

        for (const { type, ext, sig } of signatures) {
            let match = true;
            for (let i = 0; i < sig.length; i++) {
                if (sig[i] !== null && bytes[i] !== sig[i]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                detectedMime = type;
                detectedExt = ext;
                break;
            }
        }

        const declaredType = this.currentFile.type || 'unknown/unknown';
        const declaredExt = (this.currentFile.name.split('.').pop() || '').toLowerCase();

        // Mime Match Logic
        const isMimeMatch = declaredType === detectedMime || (detectedMime === 'Unknown');
        // Extension Match Logic (Loose check for jpeg/jpg etc)
        const isExtMatch = declaredExt.includes(detectedExt) || detectedExt.includes(declaredExt) || (detectedExt === 'unknown');

        const isSpoofed = !isMimeMatch && detectedMime !== 'Unknown';

        this.analysisData.signatureValid = !isSpoofed;
        this.analysisData.detectedType = detectedMime;
        this.analysisData.magicBytes = Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

        // REPORT FINDING
        if (isSpoofed) {
            this.addFinding('Security Alert', 'danger', `Extension Spoofing Detected! File is ${detectedMime} but masquerading as ${declaredExt}.`);
        } else if (detectedMime === 'Unknown') {
            this.addFinding('File Signature', 'warning', 'Unknown File Signature');
        } else {
            // this.addFinding('File Signature', 'success', `Verified ${detectedMime.split('/')[1].toUpperCase()}`);
        }
    }

    initMagicLens() {
        this.isLensActive = false;
        const lensBtn = document.getElementById('magicLensBtn');
        const viewer = document.getElementById('imageViewer');

        // Create lens elements
        this.lens = document.createElement('div');
        this.lens.className = 'magic-lens';
        this.lens.innerHTML = `
            <div class="lens-crosshair"></div>
            <div class="lens-hud">
                <div class="lens-row">
                    <span>Zoom</span>
                    <span class="lens-value">5x</span>
                </div>
                <div class="lens-row">
                    <span>Color</span>
                    <div class="lens-value" style="display: flex; align-items: center; gap: 6px;">
                        <div class="lens-color-preview" id="lensColor"></div>
                        <span id="lensHex">#000000</span>
                    </div>
                </div>
                <div class="lens-row">
                    <span>RGB</span>
                    <span class="lens-value" id="lensRGB">0, 0, 0</span>
                </div>
                <div class="lens-row">
                    <span>Pos</span>
                    <span class="lens-value" id="lensCoords">0, 0</span>
                </div>
            </div>
        `;
        viewer.appendChild(this.lens);

        lensBtn?.addEventListener('click', () => {
            this.isLensActive = !this.isLensActive;
            lensBtn.classList.toggle('active', this.isLensActive);
            if (this.isLensActive) {
                viewer.style.cursor = 'none';
            } else {
                viewer.style.cursor = 'default';
                this.lens.classList.remove('active');
            }
        });

        viewer.addEventListener('mousemove', (e) => this.updateLens(e));
        viewer.addEventListener('mouseleave', () => this.lens.classList.remove('active'));
    }

    updateLens(e) {
        if (!this.isLensActive || !this.currentImage) return;

        const img = document.getElementById('previewImage');
        const rect = img.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if cursor is within image bounds
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
            this.lens.classList.add('active');

            // Move lens
            this.lens.style.left = `${e.clientX - 100} px`;
            this.lens.style.top = `${e.clientY - 100} px`;

            // Calculate magnification
            // We want to see the pixel under cursor 5x larger
            const scaleX = this.currentImage.naturalWidth / rect.width;
            const scaleY = this.currentImage.naturalHeight / rect.height;

            const realX = x * scaleX;
            const realY = y * scaleY;

            // Update background position to show magnified view
            // Magnification level 2x relative to original image resolution displayed at natural size
            const magLevel = 2;
            const bgSizeX = rect.width * magLevel;
            const bgSizeY = rect.height * magLevel;

            this.lens.style.backgroundImage = `url('${this.currentImage.src}')`;
            this.lens.style.backgroundSize = `${bgSizeX}px ${bgSizeY} px`;

            // Adjust position to center the target pixel
            const bgPosX = -(x * magLevel - 100);
            const bgPosY = -(y * magLevel - 100);
            this.lens.style.backgroundPosition = `${bgPosX}px ${bgPosY} px`;

            // Get Pixel Data
            this.updatePixelData(realX, realY);
        } else {
            this.lens.classList.remove('active');
        }
    }

    updatePixelData(x, y) {
        // Create a temporary canvas to read pixel data if not already cached
        if (!this.pixelContext) {
            const canvas = document.createElement('canvas');
            canvas.width = this.currentImage.naturalWidth;
            canvas.height = this.currentImage.naturalHeight;
            this.pixelContext = canvas.getContext('2d');
            this.pixelContext.drawImage(this.currentImage, 0, 0);
        }

        try {
            const pixel = this.pixelContext.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
            const r = pixel[0], g = pixel[1], b = pixel[2];
            const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
            document.getElementById('lensData').textContent = `R:${r} G:${g} B:${b} ${hex} `;
        } catch (e) {
            // Likely cross-origin issue or out of bounds
        }
    }

    displayFileAnalysis() {
        if (!this.currentFile) return; // Prevent null pointer if called without file
        document.getElementById('moduleResults').innerHTML = this.createCard('🔐 File Signature Analysis', `
            <div class="result-grid">
                <div class="result-item"><div class="result-label">Declared Type</div><div class="result-value">${this.escapeHtml(this.currentFile.type)}</div></div>
                <div class="result-item"><div class="result-label">Detected Type</div><div class="result-value">${this.escapeHtml(this.analysisData.detectedType)}</div></div>
                <div class="result-item"><div class="result-label">Signature Valid</div><div class="result-value ${this.analysisData.signatureValid ? 'success' : 'danger'}">${this.analysisData.signatureValid ? '✓ Match' : '✗ Mismatch'}</div></div>
                <div class="result-item"><div class="result-label">Magic Bytes</div><div class="result-value" style="font-family: var(--font-mono); font-size: 12px;">${this.escapeHtml(this.analysisData.magicBytes)}</div></div>
            </div>
        `);
    }

    // HASHES
    async generateHashes() {
        const buffer = await this.fileToArrayBuffer(this.currentFile);
        this.analysisData.hashes = {
            sha256: await this.computeHash(buffer, 'SHA-256'),
            sha1: await this.computeHash(buffer, 'SHA-1'),
            aHash: this.computePerceptualHash()
        };
    }

    async computeHash(buffer, algorithm) {
        try {
            const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
            return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch { return 'N/A (Secure Context Required)'; }
    }

    computePerceptualHash() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.height = 8;
        ctx.drawImage(this.currentImage, 0, 0, 8, 8);
        const data = ctx.getImageData(0, 0, 8, 8).data;
        let sum = 0;
        const pixels = [];
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            pixels.push(gray);
            sum += gray;
        }
        const avg = sum / pixels.length;
        return pixels.map(p => p > avg ? '1' : '0').join('');
    }

    displayHashes() {
        const hashes = this.analysisData.hashes || {};
        document.getElementById('moduleResults').innerHTML = this.createCard('#️⃣ Hash Generation', `
            <div class="result-item"><div class="result-label">SHA-256</div><div class="result-value" style="font-family: var(--font-mono); font-size: 11px; word-break: break-all;">${hashes.sha256}</div></div>
            <div class="result-item"><div class="result-label">SHA-1</div><div class="result-value" style="font-family: var(--font-mono); font-size: 11px; word-break: break-all;">${hashes.sha1}</div></div>
            <div class="result-item" style="margin-top: 12px;"><div class="result-label">Perceptual Hash (aHash)</div><div class="result-value" style="font-family: var(--font-mono); font-size: 11px;">${hashes.aHash}</div></div>
            
            <div style="margin-top: 20px; border-top: 1px solid var(--border-subtle); padding-top: 12px;">
                <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Verify Hash</div>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="hashInput" class="form-control" placeholder="Paste SHA-256 or SHA-1 hash to verify..." style="flex: 1; font-size: 12px;">
                    <button class="btn btn-secondary" id="verifyHashBtn">Check</button>
                </div>
                <div id="hashMatchResult" style="margin-top: 8px; font-size: 13px; height: 20px;"></div>
            </div>
        `);

        document.getElementById('verifyHashBtn').addEventListener('click', () => {
            const input = document.getElementById('hashInput').value.trim().toLowerCase();
            const res = document.getElementById('hashMatchResult');
            if (!input) return;

            if (input === hashes.sha256) {
                res.innerHTML = '<span style="color: var(--success);">✅ Match found (SHA-256)</span>';
            } else if (input === hashes.sha1) {
                res.innerHTML = '<span style="color: var(--success);">✅ Match found (SHA-1)</span>';
            } else {
                res.innerHTML = '<span style="color: var(--danger);">❌ No match found</span>';
            }
        });
    }

    // HISTOGRAM
    async analyzeHistogram() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.currentImage.width;
        canvas.height = this.currentImage.height;
        ctx.drawImage(this.currentImage, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const hist = { r: new Array(256).fill(0), g: new Array(256).fill(0), b: new Array(256).fill(0) };
        for (let i = 0; i < data.length; i += 4) {
            hist.r[data[i]]++;
            hist.g[data[i + 1]]++;
            hist.b[data[i + 2]]++;
        }
        this.analysisData.histogram = hist;
        this.analysisData.estimatedQuality = this.estimateQuality();
    }

    estimateQuality() {
        const bpp = (this.currentFile.size * 8) / (this.currentImage.width * this.currentImage.height);
        if (bpp > 8) return 95;
        if (bpp > 4) return 85;
        if (bpp > 2) return 75;
        return 60;
    }

    displayHistogram() {
        const hist = this.analysisData.histogram;
        if (!hist) { document.getElementById('moduleResults').innerHTML = this.createCard('📈 Histogram', '<p>Loading...</p>'); return; }
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 200; canvas.className = 'analysis-canvas';
        const ctx = canvas.getContext('2d');
        const maxVal = Math.max(...hist.r, ...hist.g, ...hist.b);
        const scale = 180 / maxVal;
        ctx.fillStyle = '#1a1a25';
        ctx.fillRect(0, 0, 512, 200);
        for (let i = 0; i < 256; i++) {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(i * 2, 190 - hist.r[i] * scale, 2, hist.r[i] * scale);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(i * 2, 190 - hist.g[i] * scale, 2, hist.g[i] * scale);
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(i * 2, 190 - hist.b[i] * scale, 2, hist.b[i] * scale);
        }
        document.getElementById('moduleResults').innerHTML = this.createCard('📈 Histogram Analysis', '<div id="histogramContainer"></div>');
        document.getElementById('histogramContainer').appendChild(canvas);
    }

    // ELA
    async runELA(autoRun = false) {
        document.getElementById('moduleResults').innerHTML = this.createCard('<svg class="icon"><use href="#icon-zap"/></svg> Error Level Analysis', `
            <div style="margin-bottom: 16px;">
                <label class="input-label">JPEG Quality Level</label>
                <div style="display: flex; align-items: center; gap: 16px; margin-top: 8px;">
                    <input type="range" class="range-slider" id="elaQuality" min="1" max="100" value="75" style="flex: 1;">
                    <span id="elaQualityValue">75%</span>
                </div>
            </div>
            <button class="btn btn-primary" id="runElaBtn"><span><svg class="icon"><use href="#icon-zap"/></svg></span> Generate ELA</button>
            <div id="elaResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('elaQuality').addEventListener('input', (e) => {
            document.getElementById('elaQualityValue').textContent = e.target.value + '%';
        });
        document.getElementById('runElaBtn').addEventListener('click', () => this.generateELA());

        if (autoRun) await this.generateELA();
    }

    async generateELA() {
        if (!this.currentImage) return;

        const quality = document.getElementById('elaQuality').value;
        const resultsDiv = document.getElementById('elaResults');
        resultsDiv.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div><p style="text-align:center;color:var(--text-muted);">Calculating Error Levels...</p>';

        await new Promise(r => setTimeout(r, 100)); // UI update

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.currentImage.width;
        canvas.height = this.currentImage.height;
        ctx.drawImage(this.currentImage, 0, 0);
        const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Compress to JPEG
        const jpegUrl = canvas.toDataURL('image/jpeg', quality / 100);

        // Return promise that resolves when analysis is complete
        return new Promise(resolve => {
            const jpegImg = new Image();
            jpegImg.onload = () => {
                const diffCanvas = document.createElement('canvas');
                diffCanvas.width = canvas.width;
                diffCanvas.height = canvas.height;
                diffCanvas.className = 'analysis-canvas';

                const diffCtx = diffCanvas.getContext('2d');
                diffCtx.drawImage(jpegImg, 0, 0);

                const compressedData = diffCtx.getImageData(0, 0, canvas.width, canvas.height);
                const diffOutput = diffCtx.createImageData(canvas.width, canvas.height);

                let totalDiff = 0;

                for (let i = 0; i < originalData.data.length; i += 4) {
                    const rDiff = Math.abs(originalData.data[i] - compressedData.data[i]);
                    const gDiff = Math.abs(originalData.data[i + 1] - compressedData.data[i + 1]);
                    const bDiff = Math.abs(originalData.data[i + 2] - compressedData.data[i + 2]);

                    const scale = 20;
                    diffOutput.data[i] = rDiff * scale;
                    diffOutput.data[i + 1] = gDiff * scale;
                    diffOutput.data[i + 2] = bDiff * scale;
                    diffOutput.data[i + 3] = 255;

                    totalDiff += (rDiff + gDiff + bDiff);
                }

                diffCtx.putImageData(diffOutput, 0, 0);

                const avgDiff = totalDiff / (canvas.width * canvas.height * 3);
                let status = "Consistent";
                let statusClass = "success";

                if (avgDiff > 15) { status = "High Variance (Suspicious)"; statusClass = "danger"; }
                else if (avgDiff > 5) { status = "Moderate Variance"; statusClass = "warning"; }

                resultsDiv.innerHTML = `
                    <div class="result-grid" style="margin-bottom: 16px;">
                        <div class="result-item"><div class="result-label">Avg Error Level</div><div class="result-value">${avgDiff.toFixed(2)}</div></div>
                        <div class="result-item"><div class="result-label">Consistency</div><div class="result-value ${statusClass}">${status}</div></div>
                    </div>
                    <p style="margin-bottom: 8px; font-size: 12px; color: var(--text-secondary);">Enhanced Error Level Map:</p>
                    <div id="elaCanvasContainer"></div>
                    <p style="margin-top: 12px; color: var(--text-muted); font-size: 12px;">
                        Brighter areas indicate higher compression error levels, which may suggest manipulation if inconsistent with surrounding areas.
                    </p>
                `;
                document.getElementById('elaCanvasContainer').appendChild(diffCanvas);

                // Capture visual for report
                this.analysisImages['ela'] = diffCanvas.toDataURL('image/jpeg', 0.8);

                resolve(); // Resolve promise
            };
            jpegImg.src = jpegUrl;
        });
    }

    // STEGANOGRAPHY
    // STEGANOGRAPHY
    async runSteganography(autoRun = false) {
        document.getElementById('moduleResults').innerHTML = this.createCard('<svg class="icon"><use href="#icon-search"/></svg> Steganography & Bit Plane Slicer', `
            <div class="control-group">
                <label class="input-label">Target Channel</label>
                <select class="form-select" id="stegoChannel">
                    <option value="rgb">RGB (Composite)</option>
                    <option value="r">Red Channel</option>
                    <option value="g">Green Channel</option>
                    <option value="b">Blue Channel</option>
                    <option value="a">Alpha Channel (Transparency)</option>
                </select>
            </div>
            <div class="control-group">
                <label class="input-label">Bit Plane (0=LSB, 7=MSB)</label>
                <div class="btn-group" id="bitPlaneBtns">
                    ${[7, 6, 5, 4, 3, 2, 1, 0].map(i => `<button class="btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-secondary'}" data-bit="${i}">Bit ${i}</button>`).join('')}
                </div>
            </div>
            <div id="stegoResults" style="margin-top: 16px;"></div>
        `);

        const updateAnalysis = () => {
            const channel = document.getElementById('stegoChannel').value;
            const bit = parseInt(document.querySelector('#bitPlaneBtns .btn-primary').dataset.bit);
            this.analyzeBitPlane(channel, bit);
        };

        document.getElementById('stegoChannel').addEventListener('change', updateAnalysis);
        document.querySelectorAll('#bitPlaneBtns .btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#bitPlaneBtns .btn').forEach(b => {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-secondary');
                });
                e.target.classList.remove('btn-secondary');
                e.target.classList.add('btn-primary');
                updateAnalysis();
            });
        });

        // Run default (Bit 0, RGB)
        this.analyzeBitPlane('rgb', 0);
    }

    async analyzeBitPlane(channel, bitIndex) {
        document.getElementById('stegoResults').innerHTML = '<div class="spinner"></div>';

        // Use timeout to allow UI to update
        await new Promise(r => setTimeout(r, 10));

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.currentImage.width;
        canvas.height = this.currentImage.height;
        ctx.drawImage(this.currentImage, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let zeros = 0;
        let ones = 0;
        let extractedBits = []; // For preview
        const maxPreviewBits = 1024 * 8; // 1KB

        for (let i = 0; i < data.length; i += 4) {
            if (channel === 'rgb') {
                const r = (data[i] >> bitIndex) & 1;
                const g = (data[i + 1] >> bitIndex) & 1;
                const b = (data[i + 2] >> bitIndex) & 1;

                data[i] = r * 255;
                data[i + 1] = g * 255;
                data[i + 2] = b * 255;

                // Stats & Extraction (Interleaved R G B)
                if (extractedBits.length < maxPreviewBits) {
                    extractedBits.push(r, g, b);
                }
                if (r) ones++; else zeros++;
                if (g) ones++; else zeros++;
                if (b) ones++; else zeros++;

            } else {
                let offset = channel === 'r' ? 0 : channel === 'g' ? 1 : (channel === 'b' ? 2 : 3);
                const bit = (data[i + offset] >> bitIndex) & 1;
                const val = bit * 255;

                // Visualization: Grayscale for single channel
                data[i] = val;
                data[i + 1] = val;
                data[i + 2] = val;
                data[i + 3] = 255; // Force opacity for visualization

                if (extractedBits.length < maxPreviewBits) extractedBits.push(bit);
                if (bit) ones++; else zeros++;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Entropy Calculation
        const total = zeros + ones;
        const p0 = zeros / total;
        const p1 = ones / total;
        let entropy = 0;
        if (p0 > 0 && p1 > 0) {
            entropy = - (p0 * Math.log2(p0) + p1 * Math.log2(p1));
        }

        // Stats: Randomness & Likelihood
        const randomness = (entropy * 100).toFixed(2);
        let likelihood = 'Low';
        let likelihoodColor = 'var(--text-secondary)';

        if (entropy > 0.95) {
            likelihood = 'Very High';
            likelihoodColor = 'var(--danger)';
        } else if (entropy > 0.85) {
            likelihood = 'High';
            likelihoodColor = 'var(--warning)';
        } else if (entropy > 0.70) {
            likelihood = 'Medium';
            likelihoodColor = 'var(--accent)';
        }

        // Store for Report
        if (!this.analysisData.stego) this.analysisData.stego = {};
        this.analysisData.stego = {
            channel, bitIndex, entropy: entropy.toFixed(4), randomness: randomness + '%', likelihood
        };

        // Data Preview (Bytes)
        let hexPreview = '';
        let asciiPreview = '';

        // Convert bits to bytes
        for (let i = 0; i < Math.min(extractedBits.length, 1024); i += 8) {
            let byte = 0;
            for (let j = 0; j < 8; j++) {
                if (i + j < extractedBits.length) {
                    byte = (byte << 1) | extractedBits[i + j];
                }
            }
            hexPreview += byte.toString(16).padStart(2, '0') + ' ';
            asciiPreview += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
        }

        document.getElementById('stegoResults').innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 12px; font-size: 12px; color: var(--text-secondary);">
                <div class="stat-card" style="background: var(--bg-elevated); padding: 8px; border-radius: 6px;">
                    <div style="font-size: 10px; opacity: 0.7;">Bit Plane</div>
                    <div style="font-weight: 600; color: var(--text-primary);">Bit ${bitIndex} (${channel.toUpperCase()})</div>
                </div>
                <div class="stat-card" style="background: var(--bg-elevated); padding: 8px; border-radius: 6px;">
                    <div style="font-size: 10px; opacity: 0.7;">Entropy</div>
                    <div style="font-weight: 600; color: var(--text-primary);">${entropy.toFixed(4)}</div>
                </div>
                <div class="stat-card" style="background: var(--bg-elevated); padding: 8px; border-radius: 6px;">
                    <div style="font-size: 10px; opacity: 0.7;">Randomness</div>
                    <div style="font-weight: 600; color: var(--text-primary);">${randomness}%</div>
                </div>
                 <div class="stat-card" style="background: var(--bg-elevated); padding: 8px; border-radius: 6px;">
                    <div style="font-size: 10px; opacity: 0.7;">Stego Likelihood</div>
                    <div style="font-weight: 600; color: ${likelihoodColor};">${likelihood}</div>
                </div>
            </div>
            
            <div style="overflow: auto; max-height: 400px; border: 1px solid var(--border-subtle); border-radius: 4px; margin-bottom: 12px;">
                <canvas class="analysis-canvas" style="max-width: 100%; height: auto; display: block;"></canvas>
            </div>

            <div class="card" style="background: var(--bg-elevated);">
                <div class="card-header" style="padding: 8px 12px; font-size: 12px; font-weight: 600;">
                    Data Extraction Preview (First 128 Bytes)
                </div>
                <div class="card-body" style="padding: 12px; display: grid; grid-template-columns: 2fr 1fr; gap: 12px; font-family: var(--font-mono); font-size: 10px;">
                    <div style="white-space: pre-wrap; word-break: break-all; color: var(--text-muted);">${hexPreview}</div>
                    <div style="white-space: pre-wrap; word-break: break-all; color: var(--text-primary); border-left: 1px solid var(--border-subtle); padding-left: 12px;">${asciiPreview}</div>
                </div>
            </div>
        `;

        // Append canvas carefully to avoid re-rendering issues
        const container = document.querySelector('#stegoResults canvas');
        // Replace the placeholder canvas with ours, or draw to it.
        container.replaceWith(canvas);
        canvas.className = 'analysis-canvas';
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';

        // Capture visual for report
        this.analysisImages['stego'] = canvas.toDataURL('image/png');
    }


    // DEEPFAKE / AI DETECTION
    async runDeepfakeDetection(autoRun = false) {
        document.getElementById('moduleResults').innerHTML = this.createCard('🤖 AI / Deepfake Detection', `
            <div class="result-grid" style="margin-bottom: 16px;">
                <div class="result-item"><div class="result-label">Detection Methods</div><div class="result-value">7 Analysis Techniques</div></div>
            </div>
            <button class="btn btn-primary" id="runAIBtn" style="margin-right: 8px;"><span>🔬</span> Run Full AI Analysis</button>
            <button class="btn btn-secondary" id="runSynthIDBtn"><span>🔒</span> Check SynthID / C2PA</button>
            <div id="deepfakeResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('runAIBtn').addEventListener('click', () => this.analyzeAI());
        document.getElementById('runSynthIDBtn').addEventListener('click', () => this.checkSynthID());

        if (autoRun) await this.analyzeAI();
    }
    async analyzeAI() {
        const resultsDiv = document.getElementById('deepfakeResults');
        resultsDiv.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div><p style="text-align:center;color:var(--text-muted);">Running 7 AI detection methods...</p>';

        await new Promise(r => setTimeout(r, 100));

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = Math.min(500 / Math.max(this.currentImage.width, this.currentImage.height), 1);
        canvas.width = this.currentImage.width * scale;
        canvas.height = this.currentImage.height * scale;
        ctx.drawImage(this.currentImage, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const results = {};

        // 1. GAN Smoothness Detection (AI images tend to be unnaturally smooth)
        let smoothCount = 0, totalPixels = data.length / 4;
        for (let i = 0; i < data.length - 8; i += 4) {
            const diff = Math.abs(data[i] - data[i + 4]) + Math.abs(data[i + 1] - data[i + 5]) + Math.abs(data[i + 2] - data[i + 6]);
            if (diff < 8) smoothCount++;
        }
        results.smoothness = (smoothCount / totalPixels) * 100;

        // 2. Color Distribution Analysis (AI images often have unusual color distributions)
        const colorBins = {};
        for (let i = 0; i < data.length; i += 4) {
            const key = `${Math.floor(data[i] / 32)}_${Math.floor(data[i + 1] / 32)}_${Math.floor(data[i + 2] / 32)} `;
            colorBins[key] = (colorBins[key] || 0) + 1;
        }
        const uniqueColors = Object.keys(colorBins).length;
        const maxExpected = Math.pow(8, 3); // 512 possible bins
        results.colorDiversity = (uniqueColors / maxExpected) * 100;

        // 3. Noise Pattern Analysis (AI images have unusual noise patterns)
        let noiseVariance = 0;
        const sampleSize = Math.min(10000, totalPixels);
        for (let s = 0; s < sampleSize; s++) {
            const i = Math.floor(Math.random() * (totalPixels - 1)) * 4;
            const localNoise = Math.abs(data[i] - data[i + 4]) + Math.abs(data[i + 1] - data[i + 5]);
            noiseVariance += localNoise * localNoise;
        }
        results.noisePattern = Math.sqrt(noiseVariance / sampleSize);

        // 4. Symmetry Check (faces in deepfakes often have unusual symmetry)
        let symmetryScore = 0;
        const halfWidth = Math.floor(canvas.width / 2);
        for (let y = 0; y < canvas.height; y += 2) {
            for (let x = 0; x < halfWidth; x += 2) {
                const idx1 = (y * canvas.width + x) * 4;
                const idx2 = (y * canvas.width + (canvas.width - x - 1)) * 4;
                const diff = Math.abs(data[idx1] - data[idx2]) + Math.abs(data[idx1 + 1] - data[idx2 + 1]);
                symmetryScore += diff < 20 ? 1 : 0;
            }
        }
        results.symmetryRatio = (symmetryScore / ((canvas.height / 2) * halfWidth)) * 100;

        // 5. Edge Sharpness (AI images often have unusual edge characteristics)
        let edgeSum = 0, edgeCount = 0;
        for (let y = 1; y < canvas.height - 1; y += 2) {
            for (let x = 1; x < canvas.width - 1; x += 2) {
                const idx = (y * canvas.width + x) * 4;
                const gx = Math.abs(data[idx - 4] - data[idx + 4]);
                const gy = Math.abs(data[idx - canvas.width * 4] - data[idx + canvas.width * 4]);
                edgeSum += Math.sqrt(gx * gx + gy * gy);
                edgeCount++;
            }
        }
        results.edgeSharpness = edgeSum / edgeCount;

        // 6. Texture Uniformity (AI images often have repetitive textures)
        const textureSamples = [];
        for (let i = 0; i < 100; i++) {
            const x = Math.floor(Math.random() * (canvas.width - 8));
            const y = Math.floor(Math.random() * (canvas.height - 8));
            let sum = 0;
            for (let dy = 0; dy < 8; dy++) {
                for (let dx = 0; dx < 8; dx++) {
                    const idx = ((y + dy) * canvas.width + x + dx) * 4;
                    sum += data[idx];
                }
            }
            textureSamples.push(sum / 64);
        }
        const mean = textureSamples.reduce((a, b) => a + b) / textureSamples.length;
        const variance = textureSamples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / textureSamples.length;
        results.textureUniformity = Math.sqrt(variance);

        // 7. Metadata-based AI detection
        const aiMetadata = this.analysisData.metadata?.['AI Generator'];
        results.metadataAI = aiMetadata ? true : false;

        // Calculate overall AI likelihood score
        let aiScore = 0;
        if (results.smoothness > 60) aiScore += 15;
        if (results.smoothness > 75) aiScore += 10;
        if (results.colorDiversity < 30) aiScore += 15;
        if (results.noisePattern < 5) aiScore += 15;
        if (results.symmetryRatio > 40) aiScore += 10;
        if (results.edgeSharpness < 10) aiScore += 10;
        if (results.textureUniformity < 30) aiScore += 10;
        if (results.metadataAI) aiScore += 25;

        let likelihood = 'Unlikely AI Generated', likelihoodClass = 'success';
        if (aiScore >= 50) { likelihood = 'Highly Likely AI Generated'; likelihoodClass = 'danger'; }
        else if (aiScore >= 30) { likelihood = 'Possibly AI Generated'; likelihoodClass = 'warning'; }

        resultsDiv.innerHTML = `
            <div style = "background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px; margin-bottom: 16px;" >
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 14px; color: var(--text-muted);">AI Generation Likelihood</div>
                        <div style="font-size: 24px; font-weight: 600;" class="${likelihoodClass}">${likelihood}</div>
                    </div>
                    <div style="font-size: 48px; font-weight: bold;" class="${likelihoodClass}">${aiScore}%</div>
                </div>
            </div>
            <div class="result-grid">
                <div class="result-item"><div class="result-label">GAN Smoothness</div><div class="result-value ${results.smoothness > 65 ? 'warning' : ''}">${results.smoothness.toFixed(1)}%</div></div>
                <div class="result-item"><div class="result-label">Color Diversity</div><div class="result-value ${results.colorDiversity < 30 ? 'warning' : ''}">${results.colorDiversity.toFixed(1)}%</div></div>
                <div class="result-item"><div class="result-label">Noise Pattern</div><div class="result-value">${results.noisePattern.toFixed(2)}</div></div>
                <div class="result-item"><div class="result-label">Symmetry Ratio</div><div class="result-value ${results.symmetryRatio > 40 ? 'warning' : ''}">${results.symmetryRatio.toFixed(1)}%</div></div>
                <div class="result-item"><div class="result-label">Edge Sharpness</div><div class="result-value">${results.edgeSharpness.toFixed(2)}</div></div>
                <div class="result-item"><div class="result-label">Texture Variance</div><div class="result-value">${results.textureUniformity.toFixed(2)}</div></div>
                <div class="result-item"><div class="result-label">AI Metadata Found</div><div class="result-value ${results.metadataAI ? 'danger' : 'success'}">${results.metadataAI ? '⚠️ Yes' : '✓ No'}</div></div>
            </div>
            ${results.metadataAI ? `<div style="margin-top: 12px; padding: 12px; background: var(--bg-hover); border-radius: 6px; color: var(--warning);"><strong>⚠️ AI Generator Detected:</strong> ${this.escapeHtml(this.analysisData.metadata['AI Generator'])}</div>` : ''}
        `;
    }

    async checkSynthID() {
        const resultsDiv = document.getElementById('deepfakeResults');
        resultsDiv.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div><p style="text-align:center;color:var(--text-muted);">Scanning for digital watermarks...</p>';

        await new Promise(r => setTimeout(r, 100));

        const buffer = await this.fileToArrayBuffer(this.currentFile);
        const bytes = new Uint8Array(buffer);

        // Search for various AI watermark signatures
        const watermarks = {
            synthID: false,
            c2pa: false,
            adobeCredential: false,
            iptcDigitalSource: false,
            googleAI: false,
            openAI: false,
            metaAI: false,
            midjourney: false,
            stableDiffusion: false
        };

        // Convert bytes to searchable string
        const maxSearch = Math.min(bytes.length, 262144); // Search first 256KB
        let textContent = '';
        for (let i = 0; i < maxSearch; i++) {
            if (bytes[i] >= 32 && bytes[i] <= 126) textContent += String.fromCharCode(bytes[i]);
            else textContent += ' ';
        }

        // SynthID detection patterns (Google's invisible watermark)
        // Note: Real SynthID uses imperceptible pixel modifications, this checks for metadata markers
        if (textContent.includes('synthid') || textContent.includes('SynthID') ||
            textContent.includes('google.ai') || textContent.includes('GoogleAI')) {
            watermarks.synthID = true;
            watermarks.googleAI = true;
        }

        // C2PA (Content Authenticity Initiative) detection
        if (textContent.includes('c2pa') || textContent.includes('C2PA') ||
            textContent.includes('contentauthenticity') || textContent.includes('jumbf')) {
            watermarks.c2pa = true;
        }

        // Adobe Content Credentials
        if (textContent.includes('adobe:photoshop') || textContent.includes('crs:') ||
            textContent.includes('Content Credentials') || textContent.includes('contentcredentials')) {
            watermarks.adobeCredential = true;
        }

        // IPTC Digital Source Type
        if (textContent.includes('digitalsourcetype') || textContent.includes('trainedAlgorithmicMedia') ||
            textContent.includes('compositeWithTrainedAlgorithmicMedia')) {
            watermarks.iptcDigitalSource = true;
        }

        // OpenAI / DALL-E
        if (textContent.includes('DALL-E') || textContent.includes('dalle') ||
            textContent.includes('OpenAI') || textContent.includes('openai')) {
            watermarks.openAI = true;
        }

        // Meta AI / Imagine
        if (textContent.includes('Meta AI') || textContent.includes('meta.ai') ||
            textContent.includes('Imagine with Meta')) {
            watermarks.metaAI = true;
        }

        // Midjourney
        if (textContent.includes('Midjourney') || textContent.includes('midjourney') ||
            textContent.includes('mj-')) {
            watermarks.midjourney = true;
        }

        // Stable Diffusion
        if (textContent.includes('Stable Diffusion') || textContent.includes('stablediffusion') ||
            textContent.includes('CompVis') || textContent.includes('stability.ai')) {
            watermarks.stableDiffusion = true;
        }

        // Check XMP for AI generation markers
        const xmpStart = textContent.indexOf('<x:xmpmeta');
        const xmpEnd = textContent.indexOf('</x:xmpmeta>');
        let xmpContent = '';
        if (xmpStart !== -1 && xmpEnd !== -1) {
            xmpContent = textContent.substring(xmpStart, xmpEnd + 12);
        }

        // Analyze image for invisible watermark patterns (spectral analysis)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.currentImage.width;
        canvas.height = this.currentImage.height;
        ctx.drawImage(this.currentImage, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        // Check for periodic patterns in LSB that could indicate watermarks
        let lsbPattern = 0;
        for (let i = 0; i < Math.min(data.length, 40000); i += 4) {
            lsbPattern += (data[i] & 1) + (data[i + 1] & 1) + (data[i + 2] & 1);
        }
        const lsbRatio = lsbPattern / (Math.min(data.length / 4, 10000) * 3);
        const hasInvisibleWatermark = lsbRatio < 0.35 || lsbRatio > 0.65;

        const anyWatermarkFound = Object.values(watermarks).some(v => v) || hasInvisibleWatermark;

        resultsDiv.innerHTML = `
            <div style = "background: var(--bg-surface); border: 1px solid var(--${anyWatermarkFound ? 'warning' : 'success'}); border-radius: 8px; padding: 16px; margin-bottom: 16px;" >
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;" class="${anyWatermarkFound ? 'warning' : 'success'}">
                    ${anyWatermarkFound ? '⚠️ Digital Watermarks Detected' : '✓ No AI Watermarks Found'}
                </div>
                <div style="color: var(--text-muted); font-size: 14px;">
                    ${anyWatermarkFound ? 'This image contains markers suggesting AI generation or modification.' : 'No standard AI watermark signatures were detected in this image.'}
                </div>
            </div>
            
            <div style="font-weight: 600; margin-bottom: 12px;">Watermark & Signature Scan</div>
            <div class="result-grid">
                <div class="result-item"><div class="result-label">🔒 Google SynthID</div><div class="result-value ${watermarks.synthID ? 'danger' : ''}">${watermarks.synthID ? '⚠️ Detected' : '✓ Not Found'}</div></div>
                <div class="result-item"><div class="result-label">📜 C2PA Manifest</div><div class="result-value ${watermarks.c2pa ? 'warning' : ''}">${watermarks.c2pa ? '⚠️ Present' : '✓ Not Found'}</div></div>
                <div class="result-item"><div class="result-label">🎨 Adobe Credentials</div><div class="result-value ${watermarks.adobeCredential ? 'warning' : ''}">${watermarks.adobeCredential ? '⚠️ Present' : '✓ Not Found'}</div></div>
                <div class="result-item"><div class="result-label">📋 IPTC AI Source</div><div class="result-value ${watermarks.iptcDigitalSource ? 'danger' : ''}">${watermarks.iptcDigitalSource ? '⚠️ AI Marked' : '✓ Not Found'}</div></div>
            </div>
            
            <div style="font-weight: 600; margin: 16px 0 12px;">AI Platform Signatures</div>
            <div class="result-grid">
                <div class="result-item"><div class="result-label">🤖 OpenAI / DALL-E</div><div class="result-value ${watermarks.openAI ? 'danger' : ''}">${watermarks.openAI ? '⚠️ Detected' : '✓ Not Found'}</div></div>
                <div class="result-item"><div class="result-label">🎭 Midjourney</div><div class="result-value ${watermarks.midjourney ? 'danger' : ''}">${watermarks.midjourney ? '⚠️ Detected' : '✓ Not Found'}</div></div>
                <div class="result-item"><div class="result-label">🖼️ Stable Diffusion</div><div class="result-value ${watermarks.stableDiffusion ? 'danger' : ''}">${watermarks.stableDiffusion ? '⚠️ Detected' : '✓ Not Found'}</div></div>
                <div class="result-item"><div class="result-label">📱 Meta AI</div><div class="result-value ${watermarks.metaAI ? 'danger' : ''}">${watermarks.metaAI ? '⚠️ Detected' : '✓ Not Found'}</div></div>
                <div class="result-item"><div class="result-label">🔍 Google AI</div><div class="result-value ${watermarks.googleAI ? 'danger' : ''}">${watermarks.googleAI ? '⚠️ Detected' : '✓ Not Found'}</div></div>
            </div>
            
            <div style="font-weight: 600; margin: 16px 0 12px;">Invisible Watermark Analysis</div>
            <div class="result-grid">
                <div class="result-item"><div class="result-label">LSB Pattern Ratio</div><div class="result-value">${(lsbRatio * 100).toFixed(1)}%</div></div>
                <div class="result-item"><div class="result-label">Hidden Watermark</div><div class="result-value ${hasInvisibleWatermark ? 'warning' : ''}">${hasInvisibleWatermark ? '⚠️ Possible' : '✓ Unlikely'}</div></div>
                <div class="result-item"><div class="result-label">XMP Metadata</div><div class="result-value">${xmpContent ? 'Present' : 'Not Found'}</div></div>
            </div>
            
            <div style="margin-top: 16px; padding: 12px; background: var(--bg-hover); border-radius: 6px; font-size: 13px; color: var(--text-muted);">
                <strong>Note:</strong> SynthID uses imperceptible pixel modifications that require specialized AI models to detect with certainty. 
                This analysis checks for metadata markers and statistical patterns. For definitive SynthID verification, use Google's official verification API.
            </div>
        `;
    }

    // CLONE DETECTION
    async runCloneDetection() {
        document.getElementById('moduleResults').innerHTML = this.createCard('👯 Clone Detection', `
            <button class="btn btn-primary" id="runCloneBtn"><span>🔍</span> Detect Cloned Regions</button>
                <div id="cloneResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('runCloneBtn').addEventListener('click', () => this.detectClones());
    }

    async detectClones() {
        document.getElementById('cloneResults').innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
        const blockSize = 16;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = Math.min(400 / this.currentImage.width, 1);
        canvas.width = this.currentImage.width * scale;
        canvas.height = this.currentImage.height * scale;
        ctx.drawImage(this.currentImage, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const blocks = [];
        for (let y = 0; y < canvas.height - blockSize; y += blockSize / 2) {
            for (let x = 0; x < canvas.width - blockSize; x += blockSize / 2) {
                let hash = 0;
                for (let dy = 0; dy < blockSize; dy++) {
                    for (let dx = 0; dx < blockSize; dx++) {
                        const idx = ((Math.floor(y) + dy) * canvas.width + Math.floor(x) + dx) * 4;
                        hash += imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2];
                    }
                }
                blocks.push({ x, y, hash: Math.floor(hash / 100) });
            }
        }
        const matches = [];
        for (let i = 0; i < blocks.length; i++) {
            for (let j = i + 1; j < blocks.length; j++) {
                const dist = Math.sqrt(Math.pow(blocks[i].x - blocks[j].x, 2) + Math.pow(blocks[i].y - blocks[j].y, 2));
                if (blocks[i].hash === blocks[j].hash && dist > blockSize * 2) matches.push([blocks[i], blocks[j]]);
            }
        }
        canvas.className = 'analysis-canvas'; canvas.style.maxWidth = '100%';
        ctx.drawImage(this.currentImage, 0, 0, canvas.width, canvas.height);
        if (matches.length > 0) {
            ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
            matches.slice(0, 50).forEach(([a, b]) => {
                ctx.strokeRect(a.x, a.y, blockSize, blockSize);
                ctx.strokeRect(b.x, b.y, blockSize, blockSize);
                ctx.beginPath(); ctx.moveTo(a.x + blockSize / 2, a.y + blockSize / 2);
                ctx.lineTo(b.x + blockSize / 2, b.y + blockSize / 2); ctx.stroke();
            });
        }
        document.getElementById('cloneResults').innerHTML = `
            <div id = "cloneCanvas" ></div >
                <div class="result-grid" style="margin-top: 16px;">
                    <div class="result-item"><div class="result-label">Matching Regions</div><div class="result-value">${matches.length}</div></div>
                    <div class="result-item"><div class="result-label">Clone Detected</div><div class="result-value ${matches.length > 5 ? 'danger' : 'success'}">${matches.length > 5 ? 'Yes' : 'No'}</div></div>
                </div>
        `;
        document.getElementById('cloneCanvas').appendChild(canvas);
    }

    // SPLICE DETECTION
    async runSpliceDetection() {
        document.getElementById('moduleResults').innerHTML = this.createCard('✂️ Splice Detection', `
            <button class="btn btn-primary" id="runSpliceBtn"><span>🔬</span> Analyze for Splicing</button>
                <div id="spliceResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('runSpliceBtn').addEventListener('click', () => this.analyzeSplice());
    }

    async analyzeSplice() {
        document.getElementById('spliceResults').innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.currentImage.width; canvas.height = this.currentImage.height;
        ctx.drawImage(this.currentImage, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const regions = [];
        for (let i = 0; i < 4; i++) {
            const start = Math.floor(data.length / 4 * i);
            let sum = 0;
            for (let j = start; j < start + data.length / 16; j += 4) sum += 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
            regions.push(sum / (data.length / 64));
        }
        const mean = regions.reduce((a, b) => a + b, 0) / 4;
        const variance = regions.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / 4;
        const consistency = Math.max(0, 1 - variance / 1000);
        let result = 'Consistent', resultClass = 'success';
        if (consistency < 0.5) { result = 'Likely Spliced'; resultClass = 'danger'; }
        else if (consistency < 0.7) { result = 'Questionable'; resultClass = 'warning'; }
        document.getElementById('spliceResults').innerHTML = `
            <div class="result-grid">
                <div class="result-item"><div class="result-label">Lighting Consistency</div><div class="result-value">${(consistency * 100).toFixed(1)}%</div></div>
                <div class="result-item"><div class="result-label">Assessment</div><div class="result-value ${resultClass}">${result}</div></div>
            </div>
            `;
    }

    // NOISE ANALYSIS
    async runNoiseAnalysis() {
        document.getElementById('moduleResults').innerHTML = this.createCard('<svg class="icon"><use href="#icon-volume"/></svg> Noise Analysis', `
            <button class="btn btn-primary" id="runNoiseBtn"><span><svg class="icon"><use href="#icon-bar-chart"/></svg></span> Analyze Noise</button>
                <div id="noiseResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('runNoiseBtn').addEventListener('click', () => this.analyzeNoise());
    }

    async analyzeNoise() {
        document.getElementById('noiseResults').innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.currentImage.width; canvas.height = this.currentImage.height;
        ctx.drawImage(this.currentImage, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let noiseSum = 0, count = 0;
        for (let i = 4; i < data.length - 4; i += 4) {
            noiseSum += Math.abs(data[i] - (data[i - 4] + data[i + 4]) / 2);
            count++;
        }
        const avgNoise = noiseSum / count;

        // Report to Dashboard
        if (avgNoise > 15) this.addFinding('Noise', 'danger', 'High Details/Noise');
        else if (avgNoise > 5) this.addFinding('Noise', 'warning', 'Moderate Noise');
        else this.addFinding('Noise', 'safe', 'Consistent Level');

        document.getElementById('noiseResults').innerHTML = `
            <div class="result-grid">
                <div class="result-item"><div class="result-label">Average Noise Level</div><div class="result-value">${avgNoise.toFixed(2)}</div></div>
                <div class="result-item"><div class="result-label">Assessment</div><div class="result-value ${avgNoise < 5 ? 'success' : avgNoise < 15 ? 'warning' : 'danger'}">${avgNoise < 5 ? 'Consistent' : avgNoise < 15 ? 'Variable' : 'Inconsistent'}</div></div>
            </div>
            `;
    }

    // STATISTICAL HELPER
    calculateStatistics(data) {
        if (!data || data.length === 0) return { mean: 0, variance: 0, skewness: 0, kurtosis: 0 };

        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const mean = sum / data.length;

        let m2 = 0;
        let m3 = 0;
        let m4 = 0;

        for (let i = 0; i < data.length; i++) {
            const delta = data[i] - mean;
            m2 += delta * delta;
            m3 += delta * delta * delta;
            m4 += delta * delta * delta * delta;
        }

        const variance = m2 / data.length;
        const stdDev = Math.sqrt(variance);
        const skewness = (1 / data.length) * m3 / Math.pow(stdDev, 3);
        const kurtosis = ((1 / data.length) * m4 / Math.pow(stdDev, 4)) - 3; // Excess Kurtosis

        return { mean, variance, stdDev, skewness, kurtosis };
    }

    // SPN ANALYSIS (Sensor Pattern Noise / Noise Residual)
    async runSPNAnalysis() {
        document.getElementById('moduleResults').innerHTML = this.createCard('🌫️ SPN Analysis (Noise Residual)', `
            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
                Extracts the "noise residual" by subtracting a smoothed version of the image. 
                Spliced regions often disrupt the camera's natural sensor noise pattern.
            </p>
            <button class="btn btn-primary" id="runSPNBtn"><span>🔬</span> Extract Noise Map</button>
            <div id="spnResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('runSPNBtn').addEventListener('click', () => this.analyzeSPN());
    }

    async analyzeSPN() {
        document.getElementById('spnResults').innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
        await new Promise(r => setTimeout(r, 100));

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.currentImage.width;
        canvas.height = this.currentImage.height;
        ctx.drawImage(this.currentImage, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // output canvas
        const spnCanvas = document.createElement('canvas');
        spnCanvas.width = width;
        spnCanvas.height = height;
        const spnCtx = spnCanvas.getContext('2d');
        const spnData = spnCtx.createImageData(width, height);
        const sData = spnData.data;

        // Simple Median Filter (3x3) estimation for Denoising
        const getMedian = (arr) => {
            arr.sort((a, b) => a - b);
            return arr[4];
        };

        const w = width * 4;
        const residuals = []; // Store raw residuals for stats
        let diffSum = 0;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const i = (y * width + x) * 4;

                // Get 3x3 neighborhood for Green channel (most sensitive)
                const neighborhood = [];
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        neighborhood.push(data[i + (dy * width + dx) * 4 + 1]);
                    }
                }

                const median = getMedian(neighborhood);
                const val = data[i + 1]; // Green channel

                // Residual = |Original - Denoised|
                let diff = Math.abs(val - median);
                diffSum += diff;

                // Collect for stats (limit sampling for performance if needed, but here we take all)
                // To save memory on large images, maybe sample? JS arrays can handle a few MP.
                if (x % 2 === 0 && y % 2 === 0) residuals.push(val - median); // Signed residual needed for skewness

                // Amplify for visualization (x10)
                const visual = Math.min(255, diff * 10);

                sData[i] = visual;     // R (Grayscale)
                sData[i + 1] = visual; // G
                sData[i + 2] = visual; // B
                sData[i + 3] = 255;    // Alpha
            }
        }

        spnCtx.putImageData(spnData, 0, 0);

        // Capture visual
        this.analysisImages['spn'] = spnCanvas.toDataURL('image/jpeg', 0.8);
        const avgResidual = diffSum / ((width - 2) * (height - 2));

        // Advanced Stats
        const stats = this.calculateStatistics(residuals);

        // Interpretation
        // Natural images (Gaussian noise) -> Kurtosis close to 0 (after normalisation, or 3 raw), Skewness close to 0
        // Splicing/Manipulation often introduces non-Gaussian artifacts -> Higher Kurtosis
        // Strong Denoising -> Low Variance, High Kurtosis (Peaked)

        let consistency = 'Consistent';
        let consistClass = 'success';

        // Thresholds are heuristics
        if (Math.abs(stats.skewness) > 0.5 || stats.kurtosis > 5.0) {
            consistency = 'Suspicious (Non-Gaussian)';
            consistClass = 'warning';
        }
        if (avgResidual > 15) {
            consistency = 'High Noise (Possible Grain/ISO)';
            consistClass = 'danger'; // Reusing danger for high noise awareness
        }

        spnCanvas.className = 'analysis-canvas';
        spnCanvas.style.maxWidth = '100%';
        spnCanvas.style.height = 'auto';

        document.getElementById('spnResults').innerHTML = `
            <div style="text-align: center; margin-bottom:16px;">
                <canvas class="analysis-canvas" id="spnDisplay"></canvas>
            </div>
            <div class="result-grid">
                <div class="result-item"><div class="result-label">Avg Noise Residual</div><div class="result-value">${avgResidual.toFixed(2)}</div></div>
                <div class="result-item"><div class="result-label">Skewness</div><div class="result-value">${stats.skewness.toFixed(3)}</div></div>
                <div class="result-item"><div class="result-label">Kurtosis (Excess)</div><div class="result-value">${stats.kurtosis.toFixed(3)}</div></div>
                <div class="result-item"><div class="result-label">Statistical Pattern</div><div class="result-value ${consistClass}">${consistency}</div></div>
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:10px;">
                Natural sensor noise typically follows a Gaussian distribution (Skew ≈ 0, Excess Kurtosis ≈ 0). 
                High deviation suggests artificial noise or manipulation.
            </div>
        `;
        // Append properly to avoid stringify issues
        document.getElementById('spnDisplay').replaceWith(spnCanvas);
    }

    // POST-PROCESSING DETECTION (Resampling/Interpolation)
    async runPostProcessCheck() {
        document.getElementById('moduleResults').innerHTML = this.createCard('🔧 Post-Processing Artifacts', `
            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
                Detects traces of Resampling (scaling/rotation) and Interpolation methods (Bicubic, Bilinear).
            </p>
            <button class="btn btn-primary" id="runPostProcBtn"><span>📉</span> Analyze Artifacts</button>
            <div id="postProcResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('runPostProcBtn').addEventListener('click', () => this.analyzePostProcessing());
    }

    async analyzePostProcessing() {
        document.getElementById('postProcResults').innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
        await new Promise(r => setTimeout(r, 100));

        // 1. Interpolation Detection (Local Correlation)
        // Interpolation introduces periodicity in pixel correlations.
        // Simplified check: Variance of neighbor differences.
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.currentImage.width;
        canvas.height = this.currentImage.height;
        ctx.drawImage(this.currentImage, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        let diffSum = 0;
        let diffCount = 0;

        for (let i = 0; i < data.length - 8; i += 4) {
            const val = data[i + 1]; // Green
            const next = data[i + 5];
            diffSum += Math.abs(val - next);
            diffCount++;
        }
        const avgDiff = diffSum / diffCount;

        // Low avgDiff often means upscaling (blurring/smoothness)
        // High avgDiff means sharpening or noise.

        let resamplingLikelihood = 'Low';
        let resamplingScore = 0;

        if (avgDiff < 2.0) {
            resamplingLikelihood = 'High (Upscaled/Blurred)';
            resamplingScore = 80;
        } else if (avgDiff < 4.0) {
            resamplingLikelihood = 'Medium (Possible Softening)';
            resamplingScore = 50;
        }

        document.getElementById('postProcResults').innerHTML = `
            <div class="result-grid">
                <div class="result-item"><div class="result-label">Pixel Correlation (Smoothness)</div><div class="result-value">${avgDiff.toFixed(2)}</div></div>
                <div class="result-item"><div class="result-label">Resampling Trace</div><div class="result-value ${resamplingScore > 50 ? 'warning' : 'success'}">${resamplingLikelihood}</div></div>
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:12px;">
                Note: "High" likelihood often indicates the image was upscaled or heavily smoothed (denoised).
            </div>
        `;
    }

    // FORGERY RISK AGGREGATOR
    async runForgeryRisk() {
        document.getElementById('moduleResults').innerHTML = this.createCard('🛡️ Forgery Risk Assessment', `
            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
                Aggregates data from all analysis modules to calculate a global "Trust Score".
            </p>
            <button class="btn btn-primary" id="runRiskBtn"><span>🎲</span> Calculate Trust Score</button>
            <div id="riskResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('runRiskBtn').addEventListener('click', () => this.calculateForgeryRisk());
    }

    async calculateForgeryRisk() {
        document.getElementById('riskResults').innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
        await new Promise(r => setTimeout(r, 100));

        let score = 100; // Start with perfect trust
        const deductions = [];

        // 1. Metadata
        if (!this.analysisData.hasExif) {
            score -= 10;
            deductions.push('Missing EXIF Metadata (-10)');
        }
        if (this.analysisData.editingSoftware) {
            score -= 20;
            deductions.push('Editing Software Detected (-20)');
        }
        if (!this.analysisData.signatureValid) {
            score -= 30;
            deductions.push('File Signature Mismatch (-30)');
        }

        // 2. AI / Deepfake (Require checking if ran, or run lightly)
        // If data exists
        if (this.analysisData.metadata && this.analysisData.metadata['AI Generator']) {
            score -= 40;
            deductions.push('AI Generator Signature (-40)');
        }

        // 3. Steganography
        if (this.analysisData.stego && this.analysisData.stego.likelihood === 'Very High') {
            score -= 20;
            deductions.push('High Entropy / Hidden Data (-20)');
        }

        // 4. Clone Detection (Check if results exist in DOM or data)
        // Since we don't store clone count in this.analysisData yet, we might miss it if not run.
        // We will just base it on what we have.

        score = Math.max(0, score);

        let color = 'var(--success)';
        let verdict = 'High Trust';
        if (score < 50) { color = 'var(--danger)'; verdict = 'Likely Manipulated'; }
        else if (score < 80) { color = 'var(--warning)'; verdict = 'Suspicious'; }

        document.getElementById('riskResults').innerHTML = `
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 4px;">Global Trust Score</div>
                <div style="font-size: 48px; font-weight: 800; color: ${color};">${score}/100</div>
                <div style="font-size: 18px; font-weight: 600; color: ${color};">${verdict}</div>
            </div>
            
            ${deductions.length > 0 ? `
            <div style="background: var(--bg-surface); padding: 12px; border-radius: 8px;">
                <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">Risk Factors Found:</div>
                <ul style="padding-left: 20px; margin: 0; font-size: 13px; color: var(--text-secondary);">
                    ${deductions.map(d => `<li>${d}</li>`).join('')}
                </ul>
            </div>` : '<div style="text-align: center; color: var(--text-muted); font-size: 13px;">No obvious risk factors detected based on available analysis.</div>'}
        `;
    }

    // CGI / SYNTHETIC IMAGE DETECTION
    async runCGIDetection() {
        document.getElementById('moduleResults').innerHTML = this.createCard('🤖 CGI / Synthetic Analysis', `
            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
                Analyzes signal properties to distinguish between Natural Photography (Camera) and Computer Generated Imagery (CGI/3D Renders).
            </p>
            <button class="btn btn-primary" id="runCGIBtn"><span>🧠</span> Run CGI Forensic Check</button>
            <div id="cgiResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('runCGIBtn').addEventListener('click', () => this.analyzeCGI());
    }

    async analyzeCGI() {
        document.getElementById('cgiResults').innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
        await new Promise(r => setTimeout(r, 100));

        // 1. Noise Level & Statistics
        // Calculate noise residuals (Difference from local mean)
        const residuals = [];
        let noiseSum = 0, count = 0;

        for (let i = 4; i < data.length - 4; i += 16) { // Sampling for speed
            // Green channel (i+1) usually best for noise
            const localMean = (data[i - 3] + data[i + 5]) / 2; // Simple 1D neighbor mean
            const val = data[i + 1];
            const diff = val - localMean;
            residuals.push(diff);
            noiseSum += Math.abs(diff);
            count++;
        }

        const noiseLevel = noiseSum / count;
        const stats = this.calculateStatistics(residuals);

        // 2. Edge Harshness
        // CGI often has perfect anti-aliasing or very sharp edges compared to lens blur.
        let edgeSum = 0;
        for (let y = 1; y < canvas.height - 1; y += 4) {
            for (let x = 1; x < canvas.width - 1; x += 4) {
                const idx = (y * canvas.width + x) * 4;
                const gx = Math.abs(data[idx - 4] - data[idx + 4]);
                const gy = Math.abs(data[idx - canvas.width * 4] - data[idx + canvas.width * 4]);
                edgeSum += (gx + gy);
            }
        }
        // Normalize edge density
        const edgeDensity = edgeSum / (count);

        // Scoring Heuristic
        // Low noise + High edge density (perfect focus everywhere) -> Likely CGI
        let cgiScore = 0;

        // Noise Level Check
        if (noiseLevel < 2.0) cgiScore += 30; // Extremely clean
        else if (noiseLevel < 4.0) cgiScore += 15;

        // Statistical Check (Kurtosis)
        // High Kurtosis (> 10) in residuals often means "Peaky" distribution -> Clean synthetic or sparse noise
        // Gaussian noise (Real camera) -> Kurtosis ~ 0-3 (Excess ~0)
        // Uniform noise (Artificial) -> Kurtosis < 0

        if (stats.kurtosis > 10.0) cgiScore += 20; // Very peaked (clean flat areas)
        else if (stats.kurtosis < -1.0) cgiScore += 15; // Platykurtic (Uniform/Artificial noise)

        // Edge Check
        // Real photos usually have depth of field (blur). High avg edge density = All in focus (Render)
        if (edgeDensity > 15) cgiScore += 20;

        // Metadata Check (Quick)
        if (!this.analysisData.hasExif) cgiScore += 20; // Renders often lack EXIF
        if (this.analysisData.metadata && this.analysisData.metadata['Software'] &&
            (this.analysisData.metadata['Software'].includes('Blender') ||
                this.analysisData.metadata['Software'].includes('Maya') ||
                this.analysisData.metadata['Software'].includes('Unreal'))) {
            cgiScore += 30;
        }

        cgiScore = Math.min(100, cgiScore);

        let verdict = 'Likely Natural Photography';
        let color = 'success';

        if (cgiScore > 70) { verdict = 'High Probability of CGI / Synthetic'; color = 'danger'; }
        else if (cgiScore > 40) { verdict = 'Possible CGI / Hybrid'; color = 'warning'; }

        document.getElementById('cgiResults').innerHTML = `
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 4px;">CGI Probability Score</div>
                <div style="font-size: 48px; font-weight: 800; color: var(--${color});">${cgiScore}%</div>
                <div style="font-size: 18px; font-weight: 600; color: var(--${color});">${verdict}</div>
            </div>

            <div class="result-grid">
                <div class="result-item"><div class="result-label">Noise Level</div><div class="result-value">${noiseLevel.toFixed(2)}</div></div>
                <div class="result-item"><div class="result-label">Edge Density</div><div class="result-value">${edgeDensity.toFixed(2)}</div></div>
                <div class="result-item"><div class="result-label">Residual Kurtosis</div><div class="result-value">${stats.kurtosis.toFixed(2)}</div></div>
                <div class="result-item"><div class="result-label">Residual Skewness</div><div class="result-value">${stats.skewness.toFixed(2)}</div></div>
            </div>
            
            <div style="margin-top: 16px; font-size: 12px; color: var(--text-muted);">
                <strong>Analysis Logic:</strong><br>
                • <strong>Low Noise:</strong> Synthetic images are often too clean.<br>
                • <strong>High Edge Density:</strong> Renders often lack natural depth-of-field blur.<br>
                • <strong>Kurtosis:</strong> Deviation from Gaussian distribution triggers suspicion.
            </div>
            <div style="text-align: right; font-size: 11px; color: var(--text-muted); margin-top: 4px;">CGI Probability: ${cgiScore}%</div>
        `;
    }



    // REVERSE IMAGE SEARCH INTEGRATION
    async runReverseImageSearch() {
        document.getElementById('moduleResults').innerHTML = this.createCard('🌍 Reverse Image Search', `
            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
                Check if this image appears elsewhere on the web. Useful for verifying origins and detecting stolen content.
                <br><br>
                <em style="font-size:12px; opacity: 0.8;">Note: Due to browser security, you must copy the image and paste it into the search engine manually, or use the specialized links below if the image is hosted. Since this is a local file, "Copy & Paste" is the best method.</em>
            </p>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
                <button class="btn btn-primary" id="copyImgBtn" style="flex: 1;">
                    <span>📋</span> Copy Image to Clipboard
                </button>
            </div>

            <div style="font-weight: 600; font-size: 13px; margin-bottom: 10px;">Open Search Engines:</div>
            <div class="result-grid" style="grid-template-columns: 1fr 1fr;">
                 <a href="https://images.google.com/" target="_blank" class="btn btn-secondary" style="text-decoration:none; justify-content:center;">Google Images</a>
                 <a href="https://www.bing.com/visualsearch" target="_blank" class="btn btn-secondary" style="text-decoration:none; justify-content:center;">Bing Visual</a>
                 <a href="https://yandex.com/images/" target="_blank" class="btn btn-secondary" style="text-decoration:none; justify-content:center;">Yandex</a>
                 <a href="https://tineye.com/" target="_blank" class="btn btn-secondary" style="text-decoration:none; justify-content:center;">TinEye</a>
            </div>
            <div id="copyStatus" style="margin-top: 10px; font-size: 13px; color: var(--success); height: 20px;"></div>
        `);

        document.getElementById('copyImgBtn').addEventListener('click', async () => {
            const status = document.getElementById('copyStatus');
            try {
                const blob = await new Promise(resolve => this.currentImageCanvas.toBlob(resolve, 'image/png'));
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                status.innerText = '✅ Image copied! Now paste (Ctrl+V) in the search engine.';
                setTimeout(() => status.innerText = '', 3000);
            } catch (err) {
                // Fallback for some browsers or if canvas not ready
                try {
                    // Try to fetch original file blob
                    const fileBytes = await this.fileToArrayBuffer(this.currentFile);
                    // This part is tricky because File/Blob access varies.
                    // The Canvas method is safer for "visual" copy.
                    status.style.color = 'var(--danger)';
                    status.innerText = '❌ Copy failed. Please right-click the image preview and select "Copy Image".';
                } catch (e) {
                    console.error(e);
                }
            }
        });

        // Ensure we have a canvas source for the copy
        if (!this.currentImageCanvas) {
            const canvas = document.createElement('canvas');
            canvas.width = this.currentImage.naturalWidth;
            canvas.height = this.currentImage.naturalHeight;
            canvas.getContext('2d').drawImage(this.currentImage, 0, 0);
            this.currentImageCanvas = canvas;
        }
    }

    // THUMBNAIL ANALYSIS
    async runThumbnailAnalysis() {
        document.getElementById('moduleResults').innerHTML = this.createCard('🖼️ Thumbnail Analysis', `
            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
                Extracts the embedded thumbnail (if present) and compares it with the main image. 
                Discrepancies often indicate the image was modified but the thumbnail was not updated.
            </p>
            <div id="thumbResults" style="margin-top: 16px;"></div>
        `);

        await new Promise(r => setTimeout(r, 100));
        const resDiv = document.getElementById('thumbResults');

        const meta = this.analysisData.metadata;

        if (meta && meta['Thumbnail Offset'] && meta['Thumbnail Length']) {
            try {
                const offset = meta['Thumbnail Offset'];
                const length = meta['Thumbnail Length'];

                const buffer = await this.fileToArrayBuffer(this.currentFile);
                const view = new DataView(buffer);

                // Re-find tiffStart logic
                let tiffStart = 0;
                if (view.getUint16(0) === 0xFFD8) {
                    let o = 2;
                    while (o < Math.min(buffer.byteLength - 4, 65535)) {
                        if (view.getUint8(o) !== 0xFF) break;
                        const m = view.getUint8(o + 1);
                        if (m === 0xD9 || m === 0xDA) break;
                        const l = view.getUint16(o + 2);
                        if (m === 0xE1) {
                            if (view.getUint8(o + 4) === 0x45 && view.getUint8(o + 5) === 0x78) { // Exif
                                tiffStart = o + 10;
                                break;
                            }
                        }
                        o += 2 + l;
                    }
                }

                if (tiffStart > 0 && tiffStart + offset + length <= buffer.byteLength) {
                    const thumbBytes = buffer.slice(tiffStart + offset, tiffStart + offset + length);
                    const blob = new Blob([thumbBytes], { type: 'image/jpeg' });
                    const url = URL.createObjectURL(blob);

                    const img = new Image();
                    img.src = url;
                    await new Promise(r => img.onload = r);

                    const mainRatio = this.currentImage.naturalWidth / this.currentImage.naturalHeight;
                    const thumbRatio = img.width / img.height;
                    const ratioDiff = Math.abs(mainRatio - thumbRatio);

                    let verdict = 'Match';
                    let color = 'success';

                    if (ratioDiff > 0.1) {
                        verdict = 'Mismatch (Aspect Ratio)';
                        color = 'danger';
                    }

                    resDiv.innerHTML = `
                         <div style="display:flex; justify-content:center; gap:20px; align-items:center; margin-bottom:16px;">
                             <div style="text-align:center;">
                                 <div style="font-size:12px; margin-bottom:4px; color:var(--text-secondary);">Original</div>
                                 <img src="${this.currentImage.src}" style="max-width:150px; border-radius:4px; max-height:150px; object-fit:contain; border:1px solid #333;">
                             </div>
                             <div style="text-align:center;">
                                 <div style="font-size:12px; margin-bottom:4px; color:var(--text-secondary);">Thumbnail</div>
                                 <img src="${url}" style="max-width:150px; border-radius:4px; max-height:150px; object-fit:contain; border:1px solid #333;">
                             </div>
                         </div>
                         <div class="result-grid">
                             <div class="result-item"><div class="result-label">Thumbnail Size</div><div class="result-value">${img.width} x ${img.height}</div></div>
                             <div class="result-item"><div class="result-label">Ratio Match</div><div class="result-value ${ratioDiff < 0.05 ? 'success' : 'danger'}">${(ratioDiff < 0.05) ? 'Yes' : 'No'}</div></div>
                             <div class="result-item"><div class="result-label">Verdict</div><div class="result-value ${color}">${verdict}</div></div>
                         </div>
                         ${ratioDiff > 0.1 ? '<div style="margin-top:8px; font-size:12px; color:var(--text-warning);">Warning: Thumbnail aspect ratio does not match main image. Image may be cropped or edited without updating thumbnail.</div>' : ''}
                    `;
                } else {
                    resDiv.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:20px;">Thumbnail metadata found, but data extraction failed (offset error).</div>';
                }
            } catch (e) {
                console.error(e);
                resDiv.innerHTML = '<div style="text-align:center; color:var(--error); padding:20px;">Error extracting thumbnail data.</div>';
            }
        } else {
            resDiv.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:20px;">No embedded JPEG thumbnail found in metadata.</div>';
        }
    }

    // JPEG ANALYSIS
    async runJPEGAnalysis() {
        const quality = this.analysisData.estimatedQuality || this.estimateQuality();
        document.getElementById('moduleResults').innerHTML = this.createCard('<svg class="icon"><use href="#icon-bar-chart"/></svg> JPEG Analysis', `
            <div class="result-grid">
                <div class="result-item"><div class="result-label">Estimated Quality</div><div class="result-value">${quality}%</div></div>
                <div class="result-item"><div class="result-label">Compression</div><div class="result-value">${quality > 80 ? 'Low' : quality > 50 ? 'Medium' : 'High'}</div></div>
            </div>
        `);
    }

    // FFT
    async runFFTAnalysis() {
        document.getElementById('moduleResults').innerHTML = this.createCard('<svg class="icon"><use href="#icon-radio"/></svg> FFT Frequency Analysis', `
            <button class="btn btn-primary" id="runFFTBtn"><span><svg class="icon"><use href="#icon-bar-chart"/></svg></span> Generate FFT Spectrum</button>
            <div id="fftResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('runFFTBtn').addEventListener('click', () => this.generateFFT());
    }

    async generateFFT() {
        document.getElementById('fftResults').innerHTML = '<div class="spinner" style="margin: 20px auto;"></div><p style="text-align:center;color:var(--text-muted);">Computing 2D FFT (This may take a moment)...</p>';

        // Allow UI to update
        await new Promise(r => setTimeout(r, 100));

        const size = 256; // Power of 2 for FFT
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Draw resized image
        ctx.drawImage(this.currentImage, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        // Prepare Real and Imaginary components (Grayscale)
        const real = new Float32Array(size * size);
        const imag = new Float32Array(size * size);

        for (let i = 0; i < size * size; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            real[i] = 0.299 * r + 0.587 * g + 0.114 * b;
            imag[i] = 0;
        }

        // FFT Helper (Cooley-Tukey Recursive)
        const fft1D = (re, im, offset, stride, n) => {
            if (n === 1) return;

            fft1D(re, im, offset, stride * 2, n / 2);
            fft1D(re, im, offset + stride, stride * 2, n / 2);

            for (let k = 0; k < n / 2; k++) {
                const angle = -2 * Math.PI * k / n;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);

                const evenIndex = offset + stride * 2 * k;
                const oddIndex = offset + stride * (2 * k + 1); // Bug fix: stride vs count

                // My recursive stride logic is tricky. Let's use a simpler copy-based recursive for clarity and correctness
                // or iterative bit-reversal.
                // Given the constraints and risk of bugs in custom FFT, let's use a known iterative structure or simple recursive with array copies (slower but safer).
                // Actually, for 256x256, simple separate arrays is fast enough.
            }
        };

        // Simple Recursive FFT with allocation (easiest to get right)
        const fft = (inputRe, inputIm) => {
            const n = inputRe.length;
            if (n === 1) return { re: inputRe, im: inputIm };

            const evenRe = new Float32Array(n / 2);
            const evenIm = new Float32Array(n / 2);
            const oddRe = new Float32Array(n / 2);
            const oddIm = new Float32Array(n / 2);

            for (let i = 0; i < n / 2; i++) {
                evenRe[i] = inputRe[2 * i]; evenIm[i] = inputIm[2 * i];
                oddRe[i] = inputRe[2 * i + 1]; oddIm[i] = inputIm[2 * i + 1];
            }

            const even = fft(evenRe, evenIm);
            const odd = fft(oddRe, oddIm);

            const outputRe = new Float32Array(n);
            const outputIm = new Float32Array(n);

            for (let k = 0; k < n / 2; k++) {
                const angle = -2 * Math.PI * k / n;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);

                const tRe = cos * odd.re[k] - sin * odd.im[k];
                const tIm = sin * odd.re[k] + cos * odd.im[k];

                outputRe[k] = even.re[k] + tRe;
                outputIm[k] = even.im[k] + tIm;
                outputRe[k + n / 2] = even.re[k] - tRe;
                outputIm[k + n / 2] = even.im[k] - tIm;
            }
            return { re: outputRe, im: outputIm };
        };

        // Row FFT
        for (let y = 0; y < size; y++) {
            const rowRe = new Float32Array(size);
            const rowIm = new Float32Array(size);
            for (let x = 0; x < size; x++) {
                rowRe[x] = real[y * size + x];
                rowIm[x] = imag[y * size + x];
            }
            const res = fft(rowRe, rowIm);
            for (let x = 0; x < size; x++) {
                real[y * size + x] = res.re[x];
                imag[y * size + x] = res.im[x];
            }
        }

        // Col FFT
        for (let x = 0; x < size; x++) {
            const colRe = new Float32Array(size);
            const colIm = new Float32Array(size);
            for (let y = 0; y < size; y++) {
                colRe[y] = real[y * size + x];
                colIm[y] = imag[y * size + x];
            }
            const res = fft(colRe, colIm);
            for (let y = 0; y < size; y++) {
                real[y * size + x] = res.re[y];
                imag[y * size + x] = res.im[y];
            }
        }

        // Compute Magnitude and Shift
        const magnitude = new Float32Array(size * size);
        let maxMag = 0;

        for (let i = 0; i < size * size; i++) {
            let mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
            mag = Math.log(1 + mag); // Log scale
            magnitude[i] = mag;
            if (mag > maxMag) maxMag = mag;
        }

        // Draw Shifted (Centering zero freq)
        const fftImg = ctx.createImageData(size, size);
        const shiftIdx = (x, y) => {
            const sx = (x + size / 2) % size;
            const sy = (y + size / 2) % size;
            return sy * size + sx;
        };

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = y * size + x;
                const sourceIdx = shiftIdx(x, y);
                const val = Math.floor((magnitude[sourceIdx] / maxMag) * 255);

                fftImg.data[idx * 4] = val;     // R
                fftImg.data[idx * 4 + 1] = val; // G
                fftImg.data[idx * 4 + 2] = val; // B
                fftImg.data[idx * 4 + 3] = 255; // Alpha
            }
        }

        ctx.putImageData(fftImg, 0, 0);

        // Display
        document.getElementById('fftResults').innerHTML = `
        <div style="text-align: center;">
            <canvas class="analysis-canvas" style="border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 100%; height: auto;"></canvas>
            <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">Magnitude Spectrum (Log Scale)</p>
        </div>
    `;
        const container = document.querySelector('#fftResults canvas');
        container.replaceWith(canvas);
        canvas.className = 'analysis-canvas';
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';

        this.analysisImages['fft'] = canvas.toDataURL('image/png');
    }

    // RUN ALL TESTS
    async runAllTests() {
        const btn = document.getElementById('runAllTestsBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span> Running...';
        btn.disabled = true;

        const modules = [
            'metadata', 'file-analysis', 'hashes', 'histogram', 'ela',
            'steganography', 'clone', 'splice', 'noise', 'jpeg-analysis',
            'deepfake', 'fft'
        ];

        this.allTestResults = {};

        // Track results for final report
        let resultsListHTML = '';

        try {
            for (let i = 0; i < modules.length; i++) {
                const module = modules[i];

                // Update Button Status with Progress
                btn.innerHTML = `<span class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span> Running ${module.replace('-', ' ')} (${i + 1}/${modules.length})...`;

                // Run Analysis
                await this.runAnalysis(module, true);

                // Capture Result
                const resultContent = document.getElementById('moduleResults')?.innerHTML || '';

                // Extract a summary
                let summary = "Completed";
                if (resultContent.includes('danger')) summary = "⚠️ Suspicious";
                else if (resultContent.includes('warning')) summary = "⚠️ Warning";
                else summary = "✅ Clean";

                resultsListHTML += `
                    <div class="test-result-item" style="margin-bottom: 8px; padding: 10px; background: var(--bg-elevated); border-radius: 6px; border: 1px solid var(--border-subtle);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong style="color: var(--text-primary); text-transform: capitalize;">${module.replace('-', ' ')}</strong>
                            <span style="font-size: 11px; padding: 2px 8px; border-radius: 12px; background: var(--bg-surface); border: 1px solid var(--border-subtle);">${summary}</span>
                        </div>
                    </div>
                `;

                await new Promise(r => setTimeout(r, 200));
            }

            // Show Modal with Final Results ONLY at the end
            this.showModal('Analysis Report', `
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--success);">Analysis Completed</div>
                    <div style="color: var(--text-secondary); margin-top: 5px;">All forensic checks finished successfully.</div>
                </div>
                <div id="testResultsList" style="max-height: 400px; overflow-y: auto; padding-right: 8px;">
                    ${resultsListHTML}
                </div>
            `);

            // Add "Close" button to footer
            const footer = document.getElementById('modalFooter');
            if (footer) footer.innerHTML = '<button class="btn btn-primary" onclick="document.getElementById(\'closeModal\').click()">Dismiss</button>';

            btn.innerHTML = '<span><svg class="icon"><use href="#icon-check-circle"/></svg></span> Done!';
            this.showToast(`All ${modules.length} tests completed successfully!`, 'success');

        } catch (error) {
            console.error('Run All Tests Failed:', error);
            this.showToast('Test suite failed: ' + error.message, 'danger');
            btn.innerHTML = '<span>⚠️</span> Error';
        } finally {
            btn.disabled = false;
            setTimeout(() => {
                if (btn.innerHTML.includes('Error')) btn.innerHTML = originalText;
                else if (btn.innerHTML.includes('Done')) btn.innerHTML = originalText;
            }, 3000);
        }
    }


    showModal(title, content) {
        const overlay = document.getElementById('modalOverlay');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');

        if (overlay && modalTitle && modalBody) {
            modalTitle.textContent = title;
            modalBody.innerHTML = content;
            modalFooter.innerHTML = ''; // Clear footer
            overlay.style.display = 'flex';

            // Close handler
            document.getElementById('closeModal').onclick = () => this.closeModal();
            overlay.onclick = (e) => {
                if (e.target === overlay) this.closeModal();
            };
        }
    }

    closeModal() {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // GENERATE FULL REPORT
    async generateFullReport() {
        const btn = document.getElementById('fullReportBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span> Generating...';
        btn.disabled = true;

        // First run all tests if not already done
        if (!this.allTestResults || Object.keys(this.allTestResults).length === 0) {
            await this.runAllTests();
        }

        const metadata = this.analysisData.metadata || {};
        const timestamp = new Date().toLocaleString();

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ForensicX Full Report - ${this.currentFile.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, system-ui, sans-serif; background: #0a0b0f; color: #e8eaed; line-height: 1.6; }
        .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid #2a2d35; }
        .header h1 { font-size: 32px; color: #6366f1; margin-bottom: 8px; }
        .header .subtitle { color: #9aa0b0; font-size: 14px; }
        .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 40px; }
        .meta-card { background: #14161d; border: 1px solid #1e232f; border-radius: 12px; padding: 16px; }
        .meta-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .meta-value { font-size: 16px; font-weight: 500; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .section-content { background: #14161d; border: 1px solid #1e232f; border-radius: 12px; padding: 20px; }
        .result-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
        .result-item { background: #1a1d26; border: 1px solid #2a2d35; border-radius: 8px; padding: 12px; }
        .result-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
        .result-value { font-size: 14px; font-weight: 500; margin-top: 4px; }
        .success { color: #22c55e; }
        .warning { color: #f59e0b; }
        .danger { color: #ef4444; }
        .footer { text-align: center; padding-top: 40px; border-top: 1px solid #2a2d35; margin-top: 40px; color: #6b7280; font-size: 13px; }
        @media print { body { background: #fff; color: #000; } .section-content, .meta-card, .result-item { border-color: #ddd; background: #f9f9f9; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><svg class="icon"><use href="#icon-microscope"/></svg> ForensicX Full Analysis Report</h1>
            <p class="subtitle">Generated on ${timestamp}</p>
        </div>

        <div class="meta-grid">
            <div class="meta-card">
                <div class="meta-label">Filename</div>
                <div class="meta-value">${this.escapeHtml(this.currentFile.name)}</div>
            </div>
            <div class="meta-card">
                <div class="meta-label">Dimensions</div>
                <div class="meta-value">${this.currentImage.width} × ${this.currentImage.height}</div>
            </div>
            <div class="meta-card">
                <div class="meta-label">File Size</div>
                <div class="meta-value">${(this.currentFile.size / 1024).toFixed(2)} KB</div>
            </div>
            <div class="meta-card">
                <div class="meta-label">Format</div>
                <div class="meta-value">${this.escapeHtml(this.currentFile.type.split('/')[1]?.toUpperCase() || 'Unknown')}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">📋 EXIF / Metadata Summary</div>
            <div class="section-content">
                <div class="result-grid">
                    ${Object.entries(metadata).slice(0, 20).map(([key, val]) => `
                        <div class="result-item">
                            <div class="result-label">${this.escapeHtml(key)}</div>
                            <div class="result-value">${this.escapeHtml(String(val).substring(0, 50))}${String(val).length > 50 ? '...' : ''}</div>
                        </div>
                    `).join('')}
                </div>
                ${Object.keys(metadata).length > 20 ? `<p style="margin-top: 16px; color: #6b7280; font-size: 13px;">... and ${Object.keys(metadata).length - 20} more fields</p>` : ''}
            </div>
        </div>

        <div class="section">
            <div class="section-title">🔍 Analysis Visuals</div>
            <div class="section-content">
                <div class="result-grid" style="grid-template-columns: 1fr; gap: 24px;">
                    ${this.analysisImages['ela'] ? `
                        <div style="text-align: center;">
                            <h3 style="margin-bottom: 8px; color: #e8eaed;">Error Level Analysis (ELA)</h3>
                            <img src="${this.analysisImages['ela']}" style="max-width: 100%; border-radius: 8px; border: 1px solid #2a2d35;">
                        </div>
                    ` : ''}
                    
                    ${this.analysisImages['stego'] ? `
                        <div style="text-align: center;">
                            <h3 style="margin-bottom: 8px; color: #e8eaed;">Steganography (Bit Plane)</h3>
                            <img src="${this.analysisImages['stego']}" style="max-width: 100%; border-radius: 8px; border: 1px solid #2a2d35;">
                             ${this.analysisData.stego ? `
                                <div style="margin-top: 8px; display: flex; justify-content: center; gap: 16px; font-size: 13px; color: #9aa0b0;">
                                    <span>Entropy: <strong>${this.analysisData.stego.entropy}</strong></span>
                                    <span>Randomness: <strong>${this.analysisData.stego.randomness}</strong></span>
                                    <span>Likelihood: <strong style="color: ${this.analysisData.stego.likelihood === 'Very High' ? '#ef4444' : '#6366f1'}">${this.analysisData.stego.likelihood}</strong></span>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${this.analysisImages['fft'] ? `
                        <div style="text-align: center;">
                            <h3 style="margin-bottom: 8px; color: #e8eaed;">FFT Frequency Analysis</h3>
                            <img src="${this.analysisImages['fft']}" style="max-width: 100%; border-radius: 8px; border: 1px solid #2a2d35;">
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">🔍 Analysis Summary</div>
            <div class="section-content">
                <div class="result-grid">
                    <div class="result-item">
                        <div class="result-label">Total Metadata Fields</div>
                        <div class="result-value">${Object.keys(metadata).length}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">AI Detection</div>
                        <div class="result-value ${metadata['AI Generator'] ? 'danger' : 'success'}">${metadata['AI Generator'] ? 'AI Signatures Found' : 'No AI Detected'}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">GPS Data</div>
                        <div class="result-value ${metadata['GPS Latitude'] ? 'warning' : ''}">${metadata['GPS Latitude'] ? 'Location Found' : 'Not Present'}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">Camera</div>
                        <div class="result-value">${this.escapeHtml(metadata['Camera Make'] || 'Unknown')} ${this.escapeHtml(metadata['Camera Model'] || '')}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">Software</div>
                        <div class="result-value">${this.escapeHtml(metadata['Software'] || 'Not Recorded')}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">Original Date</div>
                        <div class="result-value">${this.escapeHtml(metadata['Date/Time Original'] || 'Unknown')}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">📊 Full Analysis Data</div>
            <div class="section-content">
                <pre style="background: #1a1d26; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 12px; font-family: 'JetBrains Mono', monospace;">${JSON.stringify(this.analysisData, null, 2)}</pre>
            </div>
        </div>

        <div class="footer">
            <p>Generated by <strong>ForensicX</strong> - Professional Image Forensics Suite</p>
            <p style="margin-top: 8px;">Report ID: ${Date.now()}</p>
        </div>
    </div>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `forensicx_full_report_${Date.now()}.html`;
        a.click();

        btn.innerHTML = '<span>✅</span> Report Downloaded!';
        btn.disabled = false;

        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);

        this.showToast('Full report downloaded successfully!', 'success');
    }

    // EXPORT
    exportReport(format) {
        const data = {
            filename: this.currentFile.name, timestamp: new Date().toISOString(),
            dimensions: `${this.currentImage.width} × ${this.currentImage.height}`,
            fileSize: `${(this.currentFile.size / 1024).toFixed(2)} KB`, analysis: this.analysisData
        };
        if (format === 'json') this.downloadJSON(data);
        else if (format === 'pdf') this.downloadPDF(data);
        else this.downloadHTML(data);
    }

    downloadJSON(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `forensicx_report_${Date.now()}.json`; a.click();
        this.showToast('JSON report downloaded!', 'success');
    }

    downloadHTML(data) {
        const html = `<!DOCTYPE html><html><head><title>ForensicX Report</title>
<style>body{font-family:Inter,sans-serif;max-width:800px;margin:40px auto;padding:20px;background:#0a0a0f;color:#f8fafc;}
h1{color:#6366f1;}.meta{background:#1a1a25;padding:16px;border-radius:8px;margin:16px 0;}
.item{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #252535;}</style></head>
<body><h1>🔬 ForensicX Report</h1>
<div class="meta"><div class="item"><span>File:</span><span>${data.filename}</span></div>
<div class="item"><span>Dimensions:</span><span>${data.dimensions}</span></div>
<div class="item"><span>Size:</span><span>${data.fileSize}</span></div></div>
<h2>Analysis</h2><pre style="background:#1a1a25;padding:16px;border-radius:8px;overflow:auto;">${JSON.stringify(data.analysis, null, 2)}</pre></body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `forensicx_report_${Date.now()}.html`; a.click();
        this.showToast('HTML report downloaded!', 'success');
    }

    downloadPDF(data) {
        if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
            this.showToast('PDF library not loaded. Using HTML export.', 'warning');
            return this.downloadHTML(data);
        }

        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        let y = 20;
        const lineHeight = 7;
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;

        const checkPage = (height = lineHeight) => {
            if (y + height > pageHeight - 20) {
                doc.addPage();
                y = 20;
            }
        };

        const addHeader = (text) => {
            checkPage(15);
            y += 5;
            doc.setFontSize(14);
            doc.setTextColor(60, 60, 60);
            doc.setFont(undefined, 'bold');
            doc.text(text, 20, y);
            doc.setFont(undefined, 'normal');
            y += 10;
        };

        const addSubHeader = (text) => {
            checkPage(10);
            y += 5;
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.setFont(undefined, 'bold');
            doc.text(text, 20, y);
            doc.setFont(undefined, 'normal');
            y += 8;
        };

        const addText = (label, value) => {
            checkPage();
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.text(`${label}:`, 20, y);
            doc.setTextColor(0, 0, 0);
            const splitText = doc.splitTextToSize(String(value), pageWidth - 70);
            doc.text(splitText, 60, y);
            y += (splitText.length * 5) + 2;
        };

        const addImage = (imageData, label) => {
            if (imageData) {
                checkPage(90); // Image + Label
                try {
                    const imgProps = doc.getImageProperties(imageData);
                    const ratio = imgProps.height / imgProps.width;
                    const width = 120;
                    const height = width * ratio;

                    if (y + height > pageHeight - 20) { doc.addPage(); y = 20; }

                    doc.addImage(imageData, 'JPEG', (pageWidth - width) / 2, y, width, height);
                    y += height + 5;
                    doc.setFontSize(9);
                    doc.setTextColor(128, 128, 128);
                    doc.text(label, pageWidth / 2, y, { align: 'center' });
                    y += 10;
                } catch (e) {
                    console.error("Error adding image to PDF", e);
                }
            }
        }

        // --- TITLE ---
        doc.setFontSize(22);

        // EXIF Metadata
        if (data.analysis.metadata) {
            addHeader('EXIF Metadata');
            Object.entries(data.analysis.metadata).forEach(([key, val]) => {
                if (typeof val !== 'object') addText(key, val);
            });
        }

        // Hashes
        if (data.analysis.hashes) {
            addHeader('File Hashes');
            if (data.analysis.hashes.sha256) addText('SHA-256', data.analysis.hashes.sha256);
            if (data.analysis.hashes.aHash) addText('Perceptual Hash', data.analysis.hashes.aHash);
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(`ForensicX - Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        doc.save(`forensicx_report_${Date.now()}.pdf`);
        this.showToast('PDF report generated successfully!', 'success');
    }

    // THUMBNAIL ANALYSIS
    async runThumbnailAnalysis() {
        document.getElementById('moduleResults').innerHTML = this.createCard('🖼️ Thumbnail Analysis', `
            <button class="btn btn-primary" id="runThumbBtn"><span>🔍</span> Analyze Thumbnails</button>
            <div id="thumbResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('runThumbBtn').addEventListener('click', () => this.analyzeThumbnail());
    }

    async analyzeThumbnail() {
        const resultsDiv = document.getElementById('thumbResults');
        resultsDiv.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';

        const buffer = await this.fileToArrayBuffer(this.currentFile);
        const bytes = new Uint8Array(buffer);
        let hasEmbeddedThumb = false;
        let thumbOffset = -1;

        // Search for embedded JPEG thumbnail (starts with FFD8)
        for (let i = 0; i < Math.min(bytes.length - 2, 65535); i++) {
            if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8 && i > 20) {
                hasEmbeddedThumb = true;
                thumbOffset = i;
                break;
            }
        }

        const sizeRatio = hasEmbeddedThumb ? (this.currentFile.size - thumbOffset) / this.currentFile.size : 0;
        let status = 'No thumbnail found', statusClass = 'warning';
        if (hasEmbeddedThumb) {
            status = 'Embedded thumbnail detected';
            statusClass = 'success';
        }

        resultsDiv.innerHTML = `
            <div class="result-grid">
                <div class="result-item"><div class="result-label">Embedded Thumbnail</div><div class="result-value ${statusClass}">${hasEmbeddedThumb ? 'Yes' : 'No'}</div></div>
                <div class="result-item"><div class="result-label">Offset Position</div><div class="result-value">${hasEmbeddedThumb ? thumbOffset + ' bytes' : 'N/A'}</div></div>
                <div class="result-item"><div class="result-label">Status</div><div class="result-value">${status}</div></div>
            </div>
            <p style="margin-top: 12px; color: var(--text-muted); font-size: 12px;">
                Embedded thumbnails may contain older versions of the image before editing.
            </p>
        `;
    }

    // STRING EXTRACTION
    async runStringExtraction() {
        document.getElementById('moduleResults').innerHTML = this.createCard('📝 String Extraction', `
            <button class="btn btn-primary" id="runStringsBtn"><span>🔍</span> Extract Strings</button>
            <div id="stringsResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('runStringsBtn').addEventListener('click', () => this.extractStrings());
    }

    async extractStrings() {
        const resultsDiv = document.getElementById('stringsResults');
        resultsDiv.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';

        const buffer = await this.fileToArrayBuffer(this.currentFile);
        const bytes = new Uint8Array(buffer);
        const strings = [];
        let current = '';

        for (let i = 0; i < bytes.length; i++) {
            const char = bytes[i];
            if (char >= 32 && char <= 126) {
                current += String.fromCharCode(char);
            } else {
                if (current.length >= 6) strings.push(current);
                current = '';
            }
        }
        if (current.length >= 6) strings.push(current);

        // Filter interesting strings
        const interesting = strings.filter(s =>
            s.includes('http') || s.includes('www') || s.includes('@') ||
            s.includes('Adobe') || s.includes('GIMP') || s.includes('Photoshop') ||
            s.match(/\d{4}[:-]\d{2}[:-]\d{2}/) || s.length > 20
        ).slice(0, 30);

        resultsDiv.innerHTML = `
            <div class="result-grid">
                <div class="result-item"><div class="result-label">Total Strings Found</div><div class="result-value">${strings.length}</div></div>
                <div class="result-item"><div class="result-label">Interesting Strings</div><div class="result-value">${interesting.length}</div></div>
            </div>
            <div style="margin-top: 16px; max-height: 300px; overflow-y: auto; background: var(--bg-elevated); border-radius: 6px; padding: 12px;">
                ${interesting.length > 0 ? interesting.map(s => `<div style="font-family: var(--font-mono); font-size: 11px; padding: 4px 0; border-bottom: 1px solid var(--border-subtle); word-break: break-all;">${this.escapeHtml(s)}</div>`).join('') : '<p style="color: var(--text-muted);">No interesting strings found.</p>'}
            </div>
        `;
    }

    // GEOLOCATION
    async runGeolocation() {
        const metadata = this.analysisData.metadata || {};
        const hasGPS = (metadata['GPS Latitude'] || metadata['GPSLatitude']) && (metadata['GPS Longitude'] || metadata['GPSLongitude']);

        if (hasGPS) {
            const lat = this.convertDMSToDD(metadata['GPS Latitude'] || metadata['GPSLatitude'], metadata['GPS Latitude Ref'] || metadata['GPSLatitudeRef']);
            const lng = this.convertDMSToDD(metadata['GPS Longitude'] || metadata['GPSLongitude'], metadata['GPS Longitude Ref'] || metadata['GPSLongitudeRef']);

            document.getElementById('moduleResults').innerHTML = this.createCard('<svg class="icon"><use href="#icon-map-pin"/></svg> Geolocation Analysis', `
                <div class="result-grid" style="margin-bottom: 16px;">
                    <div class="result-item"><div class="result-label">Latitude</div><div class="result-value">${lat.toFixed(6)}</div></div>
                    <div class="result-item"><div class="result-label">Longitude</div><div class="result-value">${lng.toFixed(6)}</div></div>
                    <div class="result-item"><div class="result-label">Altitude</div><div class="result-value">${this.escapeHtml(metadata['GPS Altitude'] || 'N/A')}</div></div>
                </div>
                <div id="map" style="height: 300px; width: 100%; border-radius: 8px; z-index: 1;"></div>
                <div style="margin-top: 12px; font-size: 12px; text-align: right;">
                    <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" class="btn btn-sm btn-secondary">Open in Google Maps</a>
                </div>
            `);

            // Initialize Leaflet
            // Wait for DOM
            setTimeout(() => {
                const map = L.map('map').setView([lat, lng], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(map);
                L.marker([lat, lng]).addTo(map)
                    .bindPopup(`<b>Image Location</b><br>${lat.toFixed(6)}, ${lng.toFixed(6)}`).openPopup();
            }, 100);

        } else {
            document.getElementById('moduleResults').innerHTML = this.createCard('🌍 Geolocation Analysis', `
                <div class="result-grid">
                    <div class="result-item"><div class="result-label">GPS Data</div><div class="result-value warning">Not Found</div></div>
                </div>
                <p style="margin-top: 16px; color: var(--text-muted); font-size: 12px;">
                    No GPS coordinates found in image metadata. Location data may have been stripped or was never present.
                </p>
            `);
        }
    }

    convertDMSToDD(dms, ref) {
        if (!dms) return 0;
        let dd = 0;
        // Handle array [deg, min, sec]
        if (Array.isArray(dms)) {
            dd = dms[0] + dms[1] / 60 + dms[2] / 3600;
        }
        // Handle string "34 deg 2' 3.40""
        else if (typeof dms === 'string') {
            const parts = dms.match(/(\d+)\s*deg\s*(\d+)'\s*([\d.]+)"/);
            if (parts) {
                dd = parseFloat(parts[1]) + parseFloat(parts[2]) / 60 + parseFloat(parts[3]) / 3600;
            } else {
                return 0;
            }
        }
        else if (typeof dms === 'number') {
            dd = dms;
        }

        if (ref === 'S' || ref === 'W') {
            dd = dd * -1;
        }
        return dd;
    }

    // TIMELINE ANALYSIS
    async runTimelineAnalysis() {
        const metadata = this.analysisData.metadata || {};
        const dates = [];

        const dateFields = ['Date/Time Original', 'DateTimeOriginal', 'Create Date', 'Modify Date', 'File Modification Date'];
        dateFields.forEach(field => {
            if (metadata[field]) dates.push({ field, value: metadata[field] });
        });

        const fileDate = new Date(this.currentFile.lastModified);

        document.getElementById('moduleResults').innerHTML = this.createCard('⏰ Timeline Analysis', `
            <div class="result-grid">
                <div class="result-item"><div class="result-label">File Modified</div><div class="result-value">${fileDate.toLocaleString()}</div></div>
                <div class="result-item"><div class="result-label">EXIF Dates Found</div><div class="result-value">${dates.length}</div></div>
            </div>
            <div style="margin-top: 16px;">
                <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">Detected Timestamps:</div>
                ${dates.length > 0 ? dates.map(d => `
                    <div class="result-item" style="margin-bottom: 8px;">
                        <div class="result-label">${this.escapeHtml(d.field)}</div>
                        <div class="result-value" style="font-size: 13px;">${this.escapeHtml(d.value)}</div>
                    </div>
                `).join('') : '<p style="color: var(--text-muted); font-size: 12px;">No EXIF timestamps found. Image may have been edited or metadata stripped.</p>'}
            </div>
        `);
    }

    // GAN ARTIFACTS
    async runGANArtifacts() {
        document.getElementById('moduleResults').innerHTML = this.createCard('🎭 GAN Artifact Analysis', `
            <button class="btn btn-primary" id="runGANBtn"><span>🔬</span> Analyze for GAN Artifacts</button>
            <div id="ganResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('runGANBtn').addEventListener('click', () => this.analyzeGAN());
    }

    async analyzeGAN() {
        const resultsDiv = document.getElementById('ganResults');
        resultsDiv.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.currentImage.width;
        canvas.height = this.currentImage.height;
        ctx.drawImage(this.currentImage, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        // Check for checkerboard patterns (common in GAN upscaling)
        let checkerScore = 0;
        for (let y = 0; y < canvas.height - 2; y += 2) {
            for (let x = 0; x < canvas.width - 2; x += 2) {
                const idx = (y * canvas.width + x) * 4;
                const diff1 = Math.abs(data[idx] - data[idx + 4]);
                const diff2 = Math.abs(data[idx] - data[idx + canvas.width * 4]);
                if (diff1 < 3 && diff2 < 3) checkerScore++;
            }
        }
        const checkerPercent = (checkerScore / ((canvas.width / 2) * (canvas.height / 2))) * 100;

        // Symmetry check (GANs often produce unnatural symmetry)
        let symmetryScore = 0, symmetryCount = 0;
        const midX = Math.floor(canvas.width / 2);
        for (let y = 0; y < canvas.height; y += 10) {
            for (let x = 0; x < midX; x += 10) {
                const left = (y * canvas.width + x) * 4;
                const right = (y * canvas.width + (canvas.width - x - 1)) * 4;
                if (Math.abs(data[left] - data[right]) < 20) symmetryScore++;
                symmetryCount++;
            }
        }
        const symmetryPercent = (symmetryScore / symmetryCount) * 100;

        let likelihood = 'Low', likelihoodClass = 'success';
        const combined = (checkerPercent + symmetryPercent) / 2;
        if (combined > 40) { likelihood = 'High'; likelihoodClass = 'danger'; }
        else if (combined > 25) { likelihood = 'Medium'; likelihoodClass = 'warning'; }

        resultsDiv.innerHTML = `
            <div class="result-grid">
                <div class="result-item"><div class="result-label">Checkerboard Pattern</div><div class="result-value">${checkerPercent.toFixed(1)}%</div></div>
                <div class="result-item"><div class="result-label">Symmetry Score</div><div class="result-value">${symmetryPercent.toFixed(1)}%</div></div>
                <div class="result-item"><div class="result-label">GAN Likelihood</div><div class="result-value ${likelihoodClass}">${likelihood}</div></div>
            </div>
        `;
    }

    // DCT ANALYSIS
    async runDCTAnalysis() {
        document.getElementById('moduleResults').innerHTML = this.createCard('🧱 DCT Block Analysis', `
            <button class="btn btn-primary" id="runDCTBtn"><span>📊</span> Analyze DCT Blocks</button>
            <div id="dctResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('runDCTBtn').addEventListener('click', () => this.analyzeDCT());
    }

    async analyzeDCT() {
        const resultsDiv = document.getElementById('dctResults');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = Math.min(500 / this.currentImage.width, 1);
        canvas.width = this.currentImage.width * scale;
        canvas.height = this.currentImage.height * scale;
        canvas.className = 'analysis-canvas';
        canvas.style.maxWidth = '100%';

        ctx.drawImage(this.currentImage, 0, 0, canvas.width, canvas.height);

        // Draw 8x8 DCT block grid
        ctx.strokeStyle = 'rgba(88, 101, 242, 0.4)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 8) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 8) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        const blocksX = Math.floor(canvas.width / 8);
        const blocksY = Math.floor(canvas.height / 8);

        resultsDiv.innerHTML = `
            <div class="result-grid" style="margin-bottom: 16px;">
                <div class="result-item"><div class="result-label">Block Grid</div><div class="result-value">${blocksX} × ${blocksY}</div></div>
                <div class="result-item"><div class="result-label">Total Blocks</div><div class="result-value">${blocksX * blocksY}</div></div>
            </div>
            <div id="dctCanvas"></div>
            <p style="margin-top: 12px; color: var(--text-muted); font-size: 12px;">
                JPEG images use 8×8 DCT blocks. Misaligned blocks may indicate editing.
            </p>
        `;
        document.getElementById('dctCanvas').appendChild(canvas);
    }

    // DOUBLE COMPRESSION
    async runDoubleCompression() {
        document.getElementById('moduleResults').innerHTML = this.createCard('🔄 Double Compression Detection', `
            <button class="btn btn-primary" id="runDCBtn"><span>🔍</span> Detect Double Compression</button>
            <div id="dcResults" style="margin-top: 16px;"></div>
        `);
        document.getElementById('runDCBtn').addEventListener('click', () => this.detectDoubleCompression());
    }

    async detectDoubleCompression() {
        const resultsDiv = document.getElementById('dcResults');
        resultsDiv.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';

        // Analyze DCT coefficient distribution
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.currentImage.width;
        canvas.height = this.currentImage.height;
        ctx.drawImage(this.currentImage, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        // Histogram of differences (double compression creates periodic artifacts)
        const diffs = new Array(256).fill(0);
        for (let i = 0; i < data.length - 4; i += 4) {
            const diff = Math.abs(data[i] - data[i + 4]);
            diffs[Math.min(diff, 255)]++;
        }

        // Check for periodic patterns
        let periodicScore = 0;
        for (let i = 8; i < 64; i += 8) {
            if (diffs[i] > diffs[i - 1] * 1.2 && diffs[i] > diffs[i + 1] * 1.2) {
                periodicScore++;
            }
        }

        const likelihood = periodicScore > 3 ? 'Likely' : periodicScore > 1 ? 'Possible' : 'Unlikely';
        const likelihoodClass = periodicScore > 3 ? 'danger' : periodicScore > 1 ? 'warning' : 'success';

        resultsDiv.innerHTML = `
            <div class="result-grid">
                <div class="result-item"><div class="result-label">Periodic Artifacts</div><div class="result-value">${periodicScore}</div></div>
                <div class="result-item"><div class="result-label">Double Compression</div><div class="result-value ${likelihoodClass}">${likelihood}</div></div>
            </div>
            <p style="margin-top: 12px; color: var(--text-muted); font-size: 12px;">
                Double compression occurs when a JPEG is saved multiple times, leaving detectable artifacts.
            </p>
        `;
    }

    // PRNU ANALYSIS (Camera Fingerprint)
    async runPRNUAnalysis() {
        document.getElementById('moduleResults').innerHTML = this.createCard('📸 Camera Fingerprint (PRNU)', `
            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
                Extracts the Photo-Response Non-Uniformity (PRNU) noise pattern. This "fingerprint" is unique to the specific camera sensor.
                <br>You can compare this image against a reference image to verify if they were taken by the same device.
            </p>
            <div style="display:flex; gap:10px; margin-bottom:16px;">
                <button class="btn btn-primary" id="extractPRNUBtn"><span>🔬</span> Extract Fingerprint</button>
                <button class="btn btn-secondary" id="comparePRNUBtn" disabled><span>🔄</span> Compare with Reference</button>
                <input type="file" id="referenceInput" accept="image/*" style="display:none">
            </div>
            <div id="prnuResults" style="margin-top: 16px;"></div>
        `);

        const extractBtn = document.getElementById('extractPRNUBtn');
        const compareBtn = document.getElementById('comparePRNUBtn');
        const refInput = document.getElementById('referenceInput');

        extractBtn.addEventListener('click', async () => {
            await this.extractFingerprint(this.currentImage, 'prnuResults');
            compareBtn.disabled = false;
        });

        compareBtn.addEventListener('click', () => refInput.click()); // Trigger file input

        refInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const refFile = e.target.files[0];
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const img = new Image();
                    img.onload = async () => {
                        await this.compareFingerprints(this.currentImage, img, 'prnuResults');
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(refFile);
            }
        });
    }

    // Helper to extract noise pattern (Green channel)
    getNoisePattern(image, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, width, height);
        const data = ctx.getImageData(0, 0, width, height).data;

        const noise = new Float32Array(width * height);

        // Simple Denoising (Local Mean Subtraction)
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const i = (y * width + x) * 4;
                const val = data[i + 1]; // Green channel

                // 3x3 Mean
                let sum = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        sum += data[i + (dy * width + dx) * 4 + 1];
                    }
                }
                const mean = sum / 9;
                noise[y * width + x] = val - mean;
            }
        }
        return noise;
    }

    async extractFingerprint(img, targetId) {
        const resDiv = document.getElementById(targetId);
        resDiv.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
        await new Promise(r => setTimeout(r, 50)); // UI Refresh

        // We use a center crop of 512x512 for standardized fingerprinting if image is large enough
        // Or rescale small images.
        let w = img.width;
        let h = img.height;

        if (w > 1024) { w = 1024; h = Math.floor(img.height * (1024 / img.width)); }

        // Visualizing the noise
        const noise = this.getNoisePattern(img, w, h);

        // Create visual canvas
        const visCanvas = document.createElement('canvas');
        visCanvas.width = w;
        visCanvas.height = h;
        const ctx = visCanvas.getContext('2d');
        const imgData = ctx.createImageData(w, h);

        for (let i = 0; i < noise.length; i++) {
            const v = Math.min(255, Math.max(0, 127 + noise[i] * 10)); // Amplify
            imgData.data[i * 4] = v;
            imgData.data[i * 4 + 1] = v;
            imgData.data[i * 4 + 2] = v;
            imgData.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        resDiv.innerHTML = `
            <div style="text-align: center;">
                <canvas style="max-width: 100%; height: auto; border: 1px solid #444;" id="prnuVis"></canvas>
                <div style="margin-top: 8px; color: var(--text-muted); font-size: 12px;">Enhanced Sensor Noise Pattern</div>
            </div>
            <div style="margin-top: 16px; padding: 12px; background: var(--bg-surface); border-radius: 6px; font-size: 13px;">
                <strong>Fingerprint Extracted.</strong> <br>
                Upload a reference image to check if it matches this device.
            </div>
        `;
        document.getElementById('prnuVis').replaceWith(visCanvas);
        visCanvas.className = 'analysis-canvas';
    }

    async compareFingerprints(img1, img2, targetId) {
        const resDiv = document.getElementById(targetId);
        resDiv.innerHTML += '<div class="spinner" style="margin: 20px auto;"></div>';
        await new Promise(r => setTimeout(r, 50));

        const size = 512; // Compare center crop 512x512
        // Ensure both are large enough
        if (img1.width < size || img1.height < size || img2.width < size || img2.height < size) {
            resDiv.innerHTML += `<div style="color: var(--danger); margin-top: 10px;">Error: Images must be at least ${size}x${size} for reliable comparison.</div>`;
            return;
        }

        // Draw center crops
        const getCenterData = (image) => {
            const c = document.createElement('canvas');
            c.width = size; c.height = size;
            c.getContext('2d').drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, size, size);
            return c; // We need the canvas to pass to getNoisePattern? No, getNoisePattern takes image/canvas
        };

        const crop1 = getCenterData(img1);
        const crop2 = getCenterData(img2);

        const n1 = this.getNoisePattern(crop1, size, size);
        const n2 = this.getNoisePattern(crop2, size, size);

        // Compute PCC (Pearson Correlation Coefficient)
        let sum1 = 0, sum2 = 0;
        for (let i = 0; i < n1.length; i++) { sum1 += n1[i]; sum2 += n2[i]; }
        const mean1 = sum1 / n1.length;
        const mean2 = sum2 / n2.length;

        let num = 0, den1 = 0, den2 = 0;
        for (let i = 0; i < n1.length; i++) {
            const a = n1[i] - mean1;
            const b = n2[i] - mean2;
            num += a * b;
            den1 += a * a;
            den2 += b * b;
        }

        const correlation = num / Math.sqrt(den1 * den2);

        // Verdict
        // PRNU correlation is usually low, > 0.05 is significant for small crops
        let match = 'No Match';
        let color = 'danger';

        // Typical thresholds: > 0.1 very strong, > 0.04 likely
        if (correlation > 0.1) { match = 'Strong Match (Same Camera)'; color = 'success'; }
        else if (correlation > 0.035) { match = 'Possible Match'; color = 'warning'; }

        // Remove spinner
        const spinner = resDiv.querySelector('.spinner');
        if (spinner) spinner.remove();

        // Append result
        const resultHTML = `
            <div style="margin-top: 20px; border-top: 1px solid #444; padding-top: 16px;">
                <div class="result-grid">
                    <div class="result-item"><div class="result-label">Correlation (PCC)</div><div class="result-value">${correlation.toFixed(4)}</div></div>
                    <div class="result-item"><div class="result-label">Verdict</div><div class="result-value ${color}">${match}</div></div>
                </div>
            </div>
        `;
        resDiv.insertAdjacentHTML('beforeend', resultHTML);
    }



    // UTILITIES
    async fileToArrayBuffer(file) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsArrayBuffer(file);
        });
    }

    createCard(title, content) {
        return `<div class="card"><div class="card-header"><div class="card-title">${title}</div></div><div class="card-body">${content}</div></div>`;
    }

    // Mobile: Toggle Analysis Panel
    // This logic should ideally be called once, e.g., in the constructor or an init method.
    // For now, placing it here as per instruction, but noting it's not a function.
    // The original instruction had a syntax error here, assuming it meant to add this logic
    // as part of the class's setup, not inside createCard or showToast.
    // I'm placing it as a separate block of code within the class, assuming it's meant to be executed
    // as part of the class's initialization or a dedicated setup method.
    // However, the instruction explicitly places it *between* createCard and showToast,
    // and the provided snippet shows it *inside* createCard after the return.
    // To make it syntactically correct and functional, I'm interpreting it as a new method
    // or a block of code that needs to be called.
    // Given the structure, it's most likely meant to be a new method or part of a setup.
    // I will add it as a new method `setupMobilePanelToggle` and assume it needs to be called.
    // If the user intended it to be directly executed, the placement is problematic.
    setupMobilePanelToggle() {
        const analysisBtn = document.querySelector('.panel-header .btn-icon'); // The "more" button
        const analysisPanel = document.getElementById('analysisContainer');

        analysisBtn?.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                analysisPanel.classList.toggle('active');
            }
        });

        // Also allow clicking the "Findings Dashboard" (if we made it visible in header) to open panel
        // But for now, let's just make sure we can access it. 
        // We might need a button in the main view to "View Results" on mobile.
        // Let's add a "View Results" floating button for mobile if results exist.
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        const icon = type === 'success' ? '✓' : type === 'warning' ? '⚠️' : 'ℹ️';
        const colors = { success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)', info: 'var(--accent)' };
        toast.innerHTML = `<span>${icon}</span> ${message}`;
        toast.style.cssText = `background:var(--bg-elevated);border:1px solid var(--border-default);border-left:4px solid ${colors[type] || colors.info};padding:12px 16px;border-radius:8px;margin-bottom:8px;display:flex;align-items:center;gap:8px;animation:slideIn 0.3s ease;color:var(--text-primary);`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    }
}

// Styles & Init
const style = document.createElement('style');
style.textContent = `.toast-container{position:fixed;bottom:24px;right:24px;z-index:500;}@keyframes slideIn{from{transform:translateX(100%);opacity:0;}to{transform:translateX(0);opacity:1;}}`;
document.head.appendChild(style);
document.addEventListener('DOMContentLoaded', () => { window.forensicX = new ForensicX(); });
