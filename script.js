document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. SELECTORES DE ELEMENTOS (GLOBALES)
    // ==========================================
    const phone = document.getElementById('phone');
    const screen = document.getElementById('screen');
    const currentTimeDisplay = document.getElementById('current-time');
    
    // Panel de Ajustes y Blur
    const quickSettingsPanel = document.getElementById('quick-settings-panel');
    const screenBackdrop = document.getElementById('screen-backdrop');
    const qsWifiTile = document.getElementById('qs-wifi-tile');
    const qsFontTile = document.getElementById('qs-font-tile');
    const qsSettingsBtn = document.getElementById('qs-settings-btn');
    const statusBarWifiIcon = document.getElementById('status-bar-wifi-icon');
    
    // Navegación y Dock
    const navHome = document.getElementById('nav-home');
    const navBack = document.getElementById('nav-back');
    const navRecents = document.getElementById('nav-recents');
    const dock = document.querySelector('.dock');
    
    // Iconos y Ventanas
    const appIcons = document.querySelectorAll('.app-icon');
    const appWindows = document.querySelectorAll('.app-window');
    
    // App Recientes
    const recentsContainer = document.getElementById('recents-container');
    const recentsCloseAllBtn = document.getElementById('recents-close-all');
    
    // App Ajustes (Fondo)
    const wallpaperUpload = document.getElementById('wallpaper-upload');
    const removeWallpaperBtn = document.getElementById('remove-wallpaper-btn');
    const defaultWallpaper = 'linear-gradient(to top, #6a11cb 0%, #2575fc 100%)';

    // App Notas
    const notesListView = document.getElementById('notes-list-view');
    const noteEditorView = document.getElementById('note-editor-view');
    const newNoteBtn = document.getElementById('new-note-btn');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const backToListBtn = document.getElementById('back-to-list-btn');
    const notesListContainer = document.getElementById('notes-list-container');
    const noteIdInput = document.getElementById('note-id-input');
    const noteTitleInput = document.getElementById('note-title-input');
    const noteContentInput = document.getElementById('note-content-input');
    
    // App Juego (Snake)
    const canvas = document.getElementById('snake-canvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('score');

    // App Calculadora
    const calcDisplay = document.getElementById('calc-display');
    const calcGrid = document.getElementById('calc-grid');
    
    // App Gestor de Archivos
    const storageBar = document.getElementById('storage-bar');
    const storageUsageText = document.getElementById('storage-usage-text');
    const storageAvailableText = document.getElementById('storage-available-text');
    const fileListContainer = document.getElementById('file-list-container');
    const deleteSelectedFilesBtn = document.getElementById('delete-selected-files-btn');

    // App Galería (Elementos Principales)
    const galleryGrid = document.getElementById('gallery-grid');
    const galleryStorageInfo = document.getElementById('gallery-storage-info');
    
    // App Galería (Botones de Control)
    const galleryUpload = document.getElementById('gallery-upload'); // Input file
    const galleryUploadBtn = document.getElementById('gallery-upload-btn'); // Label botón
    const gallerySelectBtn = document.getElementById('gallery-select-btn');
    const galleryDeleteSelectedBtn = document.getElementById('gallery-delete-selected-btn');
    const galleryCancelSelectBtn = document.getElementById('gallery-cancel-select-btn');

    // Modal de Galería (NUEVO: Incluye botón borrar y wallpaper)
    const galleryModal = document.getElementById('gallery-modal');
    const galleryModalImage = document.getElementById('gallery-modal-image');
    const galleryModalClose = document.getElementById('gallery-modal-close');
    const setWallpaperBtn = document.getElementById('set-wallpaper-btn');
    const modalDeleteBtn = document.getElementById('modal-delete-btn'); // Botón borrar en modal


    // ==========================================
    // 2. CONSTANTES Y ESTADO
    // ==========================================
    const TOTAL_STORAGE_MB = 5;
    const TOTAL_STORAGE_BYTES = TOTAL_STORAGE_MB * 1024 * 1024;

    let currentOpenApp = null;
    let appHistory = [];
    let qsPanelOpen = false;
    let isWifiOn = false;
    const systemFonts = ['Arial, sans-serif', '"Times New Roman", Times, serif', '"Courier New", Courier, monospace', 'Verdana, sans-serif'];
    let currentFontIndex = 0;
    
    // Bases de datos
    let notesDB = [];
    let galleryDB = [];
    let serverPhotos = []; // Fotos de Node.js

    // Estados internos
    let noteEditorOpen = false;
    let gallerySelectionMode = false;
    let currentModalImageId = null; // ID de la foto abierta actualmente
    
    // Estado Calculadora
    let calcCurrentInput = '0';
    let calcPreviousInput = '';
    let calcOperator = null;


    // ==========================================
    // 3. FUNCIONES DE ALMACENAMIENTO Y SISTEMA
    // ==========================================

    function getStorageUsage() {
        let totalUsed = 0;
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalUsed += localStorage.getItem(key).length * 2;
            }
        }
        const available = TOTAL_STORAGE_BYTES - totalUsed;
        return {
            total: TOTAL_STORAGE_BYTES,
            used: totalUsed,
            available: available < 0 ? 0 : available,
            percent: (totalUsed / TOTAL_STORAGE_BYTES) * 100
        };
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function updateStorageDisplays() {
        const usage = getStorageUsage();
        if(galleryStorageInfo) galleryStorageInfo.textContent = `Disp: ${formatBytes(usage.available)}`;
        if(storageBar) {
            storageBar.value = usage.percent;
            storageUsageText.textContent = `Usado: ${formatBytes(usage.used)}`;
            storageAvailableText.textContent = `Libre: ${formatBytes(usage.available)}`;
        }
    }

    function updateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        currentTimeDisplay.textContent = `${hours}:${minutes}`;
    }


    // ==========================================
    // 4. NAVEGACIÓN Y APPS
    // ==========================================
    
    function goToHome() {
        appWindows.forEach(win => win.style.display = 'none');
        screenBackdrop.classList.remove('active'); // Quitar blur
        closeQsPanel();
        currentOpenApp = null;
        noteEditorOpen = false;
        stopGame();
        dock.classList.add('hidden');
        
        // Si estábamos seleccionando fotos, salir de ese modo
        if (gallerySelectionMode) toggleGallerySelectMode();
        // Cerrar modal si estaba abierto
        closeGalleryModal();
    }

    function openApp(appId) {
        if (currentOpenApp === appId) return;
        goToHome(); // Limpiar pantalla
        
        const appToOpen = document.getElementById(appId);
        if (appToOpen) {
            appToOpen.style.display = 'flex';
            currentOpenApp = appId;
            
            // Historial
            const appIndex = appHistory.indexOf(appId);
            if (appIndex > -1) appHistory.splice(appIndex, 1);
            appHistory.push(appId);

            // Inicialización específica
            switch (appId) {
                case 'app-notes': renderNoteList(); showNotesList(); break;
                case 'app-game': startGame(); break;
                case 'app-recents': screenBackdrop.classList.add('active'); renderRecents(); break;
                case 'app-gallery': loadGallery(); break;
                case 'app-file-manager': loadFileManager(); break;
                case 'app-calculator': resetCalculator(); break;
            }
        }
    }

    function goBack() {
        if (qsPanelOpen) { closeQsPanel(); return; }
        
        // Cerrar modal con botón atrás
        if (!galleryModal.classList.contains('hidden')) { closeGalleryModal(); return; }
        
        // Comportamientos específicos
        if (currentOpenApp === 'app-notes' && noteEditorOpen) { showNotesList(); return; }
        if (currentOpenApp === 'app-gallery' && gallerySelectionMode) { toggleGallerySelectMode(); return; }

        if (currentOpenApp) {
            appHistory.pop();
            const lastApp = appHistory[appHistory.length - 1];
            goToHome();
            if (lastApp) openApp(lastApp);
        }
    }

    // --- Panel de Ajustes y Dock ---
    function openQsPanel() { quickSettingsPanel.classList.add('active'); screenBackdrop.classList.add('active'); qsPanelOpen = true; }
    function closeQsPanel() { 
        quickSettingsPanel.classList.remove('active'); 
        if (currentOpenApp !== 'app-recents') screenBackdrop.classList.remove('active'); 
        qsPanelOpen = false; 
    }
    function toggleDock() {
        dock.classList.toggle('hidden');
        // Esta es la línea mágica que faltaba:
        screenBackdrop.classList.toggle('active');
    }

    // --- Ajustes Rápidos ---
    function toggleWifi() { isWifiOn = !isWifiOn; localStorage.setItem('android_wifi', isWifiOn); updateWifiVisuals(); }
    function updateWifiVisuals() {
        qsWifiTile.classList.toggle('active', isWifiOn);
        statusBarWifiIcon.style.display = isWifiOn ? 'inline' : 'none';
    }
    function cycleFont() { currentFontIndex = (currentFontIndex + 1) % systemFonts.length; localStorage.setItem('android_font_index', currentFontIndex); applyFont(); }
    function applyFont() { phone.style.setProperty('--system-font', systemFonts[currentFontIndex]); }


    // ==========================================
    // 5. FONDO DE PANTALLA
    // ==========================================
    function loadWallpaper() {
        const savedWallpaper = localStorage.getItem('android_wallpaper');
        if (savedWallpaper) {
            // CORRECCIÓN: Agregamos comillas "${ }" para soportar URLs con espacios (Node.js)
            screen.style.backgroundImage = `url("${savedWallpaper}")`;
        } else {
            screen.style.backgroundImage = defaultWallpaper;
        }
    }
    
    // Carga de archivo manual (Desde app Ajustes)
    if(wallpaperUpload) {
        wallpaperUpload.addEventListener('change', (e) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                localStorage.setItem('android_wallpaper', event.target.result);
                loadWallpaper();
            };
            reader.readAsDataURL(file);
        });
    }
    
    if(removeWallpaperBtn) {
        removeWallpaperBtn.addEventListener('click', () => {
            localStorage.removeItem('android_wallpaper');
            loadWallpaper();
        });
    }


    // ==========================================
    // 6. LÓGICA APP GALERÍA (MODAL, NODE.JS Y BORRADO)
    // ==========================================

    function loadGalleryFromStorage() { galleryDB = JSON.parse(localStorage.getItem('android_gallery')) || []; }
    function saveGalleryToStorage() { localStorage.setItem('android_gallery', JSON.stringify(galleryDB)); }

    // Conexión con Servidor
    async function fetchServerPhotos() {
        try {
            const response = await fetch('http://localhost:3000/api/fotos');
            if (response.ok) {
                serverPhotos = await response.json();
                console.log("Fotos PC:", serverPhotos.length);
            }
        } catch (error) {
            serverPhotos = [];
        }
    }

    async function loadGallery() {
        if(galleryGrid) galleryGrid.innerHTML = '<p style="text-align:center;width:100%;margin-top:20px;">Cargando...</p>';
        await fetchServerPhotos();
        renderGallery();
        updateStorageDisplays();
    }

    function renderGallery() {
        if (!galleryGrid) return;
        galleryGrid.innerHTML = '';
        
        const allImages = [...galleryDB, ...serverPhotos];

        if (allImages.length === 0) { galleryGrid.innerHTML = '<p style="text-align:center;width:100%;">No hay imágenes.</p>'; return; }
        
        allImages.forEach(img => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.dataset.id = img.id;
            
            // Borde azul si es PC
            if (img.id.toString().startsWith('server-')) item.style.border = '1px solid #2575fc';

            item.innerHTML = `
                <img src="${img.data}" alt="${img.name}" loading="lazy">
                <span class="gallery-item-name">${img.name}</span>
                ${img.id.toString().startsWith('server-') ? '<i class="material-icons" style="position:absolute;top:2px;left:2px;font-size:14px;color:#2575fc;background:rgba(255,255,255,0.9);border-radius:50%;padding:2px;">computer</i>' : ''}
            `;
            
            // CLIC: Seleccionar o Abrir Modal
            item.addEventListener('click', () => {
                if (gallerySelectionMode) {
                    // Modo Selección
                    if (img.id.toString().startsWith('server-')) alert("No puedes borrar archivos del PC.");
                    else item.classList.toggle('selected');
                } else {
                    // Modo Normal: Abrir Modal
                    openGalleryModal(img.data, img.id);
                }
            });
            galleryGrid.appendChild(item);
        });
    }

    // --- MODAL, WALLPAPER Y BORRADO INDIVIDUAL ---

    function openGalleryModal(src, id) {
        galleryModalImage.src = src;
        currentModalImageId = id; // Guardamos ID actual
        galleryModal.classList.remove('hidden');
    }

    function closeGalleryModal() {
        galleryModal.classList.add('hidden');
        setTimeout(() => { galleryModalImage.src = ''; }, 300);
        currentModalImageId = null;
    }

    // Botón Fondo de Pantalla (En el Modal)
    if (setWallpaperBtn) {
        setWallpaperBtn.addEventListener('click', () => {
            if (galleryModalImage.src) {
                localStorage.setItem('android_wallpaper', galleryModalImage.src);
                loadWallpaper();
                closeGalleryModal();
                alert("Fondo actualizado");
            }
        });
    }

    // Botón Borrar (En el Modal)
    if (modalDeleteBtn) {
        modalDeleteBtn.addEventListener('click', () => {
            if (!currentModalImageId) return;

            // Verificar si es del servidor
            if (currentModalImageId.toString().startsWith('server-')) {
                alert("No puedes borrar fotos del PC desde aquí.");
                return;
            }

            if (confirm("¿Borrar esta foto permanentemente?")) {
                // Borrar de la DB local
                galleryDB = galleryDB.filter(img => img.id !== currentModalImageId);
                saveGalleryToStorage();
                renderGallery(); // Refrescar cuadrícula
                updateStorageDisplays();
                closeGalleryModal(); // Cerrar modal
            }
        });
    }

    // --- Selección y Subida Manual ---
    function handleImageUpload(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const name = prompt("Nombre:", `Img${galleryDB.length + 1}`) || `Img${galleryDB.length + 1}`;
            galleryDB.push({ id: Date.now(), name, data: event.target.result });
            saveGalleryToStorage(); renderGallery(); updateStorageDisplays();
        };
        reader.readAsDataURL(file);
        e.target.value = null;
    }

    function toggleGallerySelectMode() {
        gallerySelectionMode = !gallerySelectionMode;
        if (gallerySelectionMode) {
            galleryUploadBtn.style.display = 'none'; gallerySelectBtn.style.display = 'none';
            galleryDeleteSelectedBtn.style.display = 'inline-flex'; galleryCancelSelectBtn.style.display = 'inline-flex';
        } else {
            galleryUploadBtn.style.display = 'inline-flex'; gallerySelectBtn.style.display = 'inline-flex';
            galleryDeleteSelectedBtn.style.display = 'none'; galleryCancelSelectBtn.style.display = 'none';
            document.querySelectorAll('.gallery-item.selected').forEach(el => el.classList.remove('selected'));
        }
    }

    function deleteSelectedImages() {
        const selected = document.querySelectorAll('.gallery-item.selected');
        if (selected.length === 0) return;
        if (confirm(`¿Borrar ${selected.length} fotos?`)) {
            const ids = Array.from(selected).map(i => Number(i.dataset.id));
            galleryDB = galleryDB.filter(img => !ids.includes(img.id));
            saveGalleryToStorage(); renderGallery(); updateStorageDisplays(); toggleGallerySelectMode();
        }
    }


    // ==========================================
    // 7. LÓGICA OTRAS APPS
    // ==========================================
    
    // Notas
    function loadNotesFromStorage() { notesDB = JSON.parse(localStorage.getItem('android_notes')) || []; }
    function saveNotesToStorage() { localStorage.setItem('android_notes', JSON.stringify(notesDB)); }
    function showNotesList() { notesListView.style.display = 'block'; noteEditorView.style.display = 'none'; noteEditorOpen = false; }
    function showNoteEditor(note) {
        notesListView.style.display = 'none'; noteEditorView.style.display = 'flex'; noteEditorView.style.flexDirection = 'column'; noteEditorOpen = true;
        if(note) { noteIdInput.value = note.id; noteTitleInput.value = note.title; noteContentInput.value = note.content; }
        else { noteIdInput.value = ''; noteTitleInput.value = ''; noteContentInput.value = ''; }
    }
    function renderNoteList() {
        notesListContainer.innerHTML = '';
        if (notesDB.length === 0) { notesListContainer.innerHTML = '<p>No hay notas.</p>'; return; }
        notesDB.forEach(note => {
            const el = document.createElement('div'); el.className = 'note-item';
            el.innerHTML = `<span class="note-item-title">${note.title||'Nota'}</span><i class="material-icons delete-note-btn" data-id="${note.id}">delete</i>`;
            el.querySelector('.note-item-title').addEventListener('click', () => showNoteEditor(note));
            el.querySelector('.delete-note-btn').addEventListener('click', (e) => { e.stopPropagation(); deleteNote(note.id); });
            notesListContainer.appendChild(el);
        });
    }
    function saveNote() {
        const id = noteIdInput.value; const title = noteTitleInput.value; const content = noteContentInput.value;
        if (id) { const n = notesDB.find(x => x.id == id); if(n) { n.title = title; n.content = content; } }
        else { notesDB.push({ id: Date.now(), title, content }); }
        saveNotesToStorage(); renderNoteList(); showNotesList();
    }
    function deleteNote(id) { notesDB = notesDB.filter(n => n.id != id); saveNotesToStorage(); renderNoteList(); }

    // Snake
    let snake = [{x:10,y:10}], food = {}, direction = 'right', score = 0, gameLoop;
    const gridSize = 20, canvasWidth = 340, canvasHeight = 400;
    function resetGame() { snake = [{x:10,y:10}]; direction = 'right'; score = 0; scoreDisplay.textContent = 0; moveFood(); }
    function moveFood() { food = {x: Math.floor(Math.random()*(canvasWidth/gridSize)), y: Math.floor(Math.random()*(canvasHeight/gridSize))}; }
    function draw() {
        ctx.clearRect(0,0,canvasWidth,canvasHeight);
        for(let i=0; i<snake.length; i++) { ctx.fillStyle = i===0?'lime':'green'; ctx.fillRect(snake[i].x*gridSize, snake[i].y*gridSize, gridSize, gridSize); }
        ctx.fillStyle = 'red'; ctx.fillRect(food.x*gridSize, food.y*gridSize, gridSize, gridSize);
        let hX = snake[0].x, hY = snake[0].y;
        if (direction==='right') hX++; if (direction==='left') hX--; if (direction==='up') hY--; if (direction==='down') hY++;
        if (hX<0 || hX*gridSize>=canvasWidth || hY<0 || hY*gridSize>=canvasHeight || snake.some(s=>s.x===hX && s.y===hY)) { resetGame(); return; }
        if (hX===food.x && hY===food.y) { score++; scoreDisplay.textContent = score; moveFood(); } else { snake.pop(); }
        snake.unshift({x:hX, y:hY});
    }
    function startGame() { if(gameLoop) clearInterval(gameLoop); resetGame(); gameLoop = setInterval(draw, 100); document.addEventListener('keydown', changeDirection); }
    function stopGame() { if(gameLoop) clearInterval(gameLoop); document.removeEventListener('keydown', changeDirection); }
    function changeDirection(e) {
        if(currentOpenApp !== 'app-game') return;
        const k = e.key;
        if(k==='ArrowLeft'&&direction!=='right') direction='left';
        if(k==='ArrowUp'&&direction!=='down') direction='up';
        if(k==='ArrowRight'&&direction!=='left') direction='right';
        if(k==='ArrowDown'&&direction!=='up') direction='down';
    }

    // Calculadora
    function resetCalculator() { calcCurrentInput = '0'; calcPreviousInput = ''; calcOperator = null; updateCalcDisplay(); }
    function updateCalcDisplay() { if(calcDisplay) calcDisplay.textContent = calcCurrentInput; }
    function handleCalcInput(e) {
        const t = e.target; if(!t.matches('.calc-button')) return;
        const type = t.dataset.type, val = t.dataset.value;
        if(type==='number') { if(calcCurrentInput==='0') calcCurrentInput=''; calcCurrentInput+=val; }
        if(type==='operator') { if(calcOperator && calcPreviousInput) calculate(); calcOperator=val; calcPreviousInput=calcCurrentInput; calcCurrentInput='0'; }
        if(type==='equals') { if(calcOperator && calcPreviousInput) { calculate(); calcOperator=null; } }
        if(type==='clear') resetCalculator();
        if(type==='backspace') { calcCurrentInput = calcCurrentInput.slice(0,-1) || '0'; }
        updateCalcDisplay();
    }
    function calculate() {
        const p = parseFloat(calcPreviousInput), c = parseFloat(calcCurrentInput);
        if(isNaN(p)||isNaN(c)) return;
        let res = 0;
        if(calcOperator==='+') res = p+c; if(calcOperator==='-') res = p-c; if(calcOperator==='*') res = p*c; if(calcOperator==='/') res = p/c;
        calcCurrentInput = String(res); calcPreviousInput = '';
    }

    // Archivos
    function loadFileManager() { updateStorageDisplays(); renderFileList(); }
    function renderFileList() {
        if(!fileListContainer) return;
        fileListContainer.innerHTML = '';
        const notesFiles = notesDB.map(n=>({id:n.id, name:n.title||'Nota', type:'Nota', size:100, src:'notes'}));
        const imageFiles = galleryDB.map(img=>({id:img.id, name:img.name, type:'Img', size:img.data.length, src:'gallery'}));
        const allFiles = [...notesFiles, ...imageFiles];
        
        if(allFiles.length===0) { fileListContainer.innerHTML='<p>Vacío</p>'; return; }
        allFiles.forEach(f => {
            const el = document.createElement('div'); el.className = 'file-list-item';
            el.innerHTML = `<input type="checkbox" class="file-checkbox" data-id="${f.id}" data-src="${f.src}"><div class="file-info"><span class="file-name">${f.name}</span><span class="file-meta">${f.type}</span></div>`;
            fileListContainer.appendChild(el);
        });
    }
    if(deleteSelectedFilesBtn) deleteSelectedFilesBtn.addEventListener('click', () => {
        const chk = document.querySelectorAll('.file-checkbox:checked');
        if(chk.length===0) return;
        chk.forEach(c => {
            if(c.dataset.src==='notes') notesDB = notesDB.filter(n=>n.id!=c.dataset.id);
            if(c.dataset.src==='gallery') galleryDB = galleryDB.filter(g=>g.id!=c.dataset.id);
        });
        saveNotesToStorage(); saveGalleryToStorage(); loadFileManager();
    });

    // Recientes
    function renderRecents() {
        if(!recentsContainer) return;
        recentsContainer.innerHTML = '';
        if(appHistory.length===0) recentsContainer.innerHTML = '<p>Vacío</p>';
        [...appHistory].reverse().forEach(id => {
            if(id==='app-recents') return;
            const name = document.querySelector(`.app-icon[data-app="${id}"] span`).textContent;
            const el = document.createElement('div'); el.className = 'recent-card';
            el.innerHTML = `<span>${name}</span><i class="material-icons close-recent-btn">close</i>`;
            el.addEventListener('click', () => openApp(id));
            el.querySelector('i').addEventListener('click', (e) => { e.stopPropagation(); appHistory=appHistory.filter(h=>h!=id); renderRecents(); });
            recentsContainer.appendChild(el);
        });
    }
    if(recentsCloseAllBtn) recentsCloseAllBtn.addEventListener('click', () => { appHistory = []; goToHome(); });


    // ==========================================
    // 8. EVENT LISTENERS GENERALES
    // ==========================================
    
    // Nav
    if(navHome) navHome.addEventListener('click', goToHome);
    if(navBack) navBack.addEventListener('click', goBack);
    if(navRecents) navRecents.addEventListener('click', () => openApp('app-recents'));
    appIcons.forEach(i => i.addEventListener('click', () => openApp(i.dataset.app)));
    
    // Panel
    if(qsWifiTile) qsWifiTile.addEventListener('click', toggleWifi);
    if(qsFontTile) qsFontTile.addEventListener('click', cycleFont);
    if(qsSettingsBtn) qsSettingsBtn.addEventListener('click', () => { openApp('app-settings'); closeQsPanel(); });
    
    // Teclado
    document.addEventListener('keydown', (e) => {
        if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
        if(e.key.toLowerCase()==='e') { if(qsPanelOpen) closeQsPanel(); else openQsPanel(); }
        if(e.key==='Escape') { if(qsPanelOpen) closeQsPanel(); }
        if(e.key.toLowerCase()==='a') toggleDock();
    });

    // Galería (Botones)
    if(galleryUpload) galleryUpload.addEventListener('change', handleImageUpload);
    if(gallerySelectBtn) gallerySelectBtn.addEventListener('click', toggleGallerySelectMode);
    if(galleryCancelSelectBtn) galleryCancelSelectBtn.addEventListener('click', toggleGallerySelectMode);
    if(galleryDeleteSelectedBtn) galleryDeleteSelectedBtn.addEventListener('click', deleteSelectedImages);
    if(galleryModalClose) galleryModalClose.addEventListener('click', closeGalleryModal);
    if(galleryModal) galleryModal.addEventListener('click', (e) => { if(e.target===galleryModal) closeGalleryModal(); });

    // Notas
    if(newNoteBtn) newNoteBtn.addEventListener('click', () => showNoteEditor(null));
    if(backToListBtn) backToListBtn.addEventListener('click', showNotesList);
    if(saveNoteBtn) saveNoteBtn.addEventListener('click', saveNote);

    // Calc
    if(calcGrid) calcGrid.addEventListener('click', handleCalcInput);


    // ==========================================
    // 9. INICIALIZACIÓN
    // ==========================================
    loadWallpaper();
    loadNotesFromStorage();
    loadGalleryFromStorage();
    loadWifiState();
    
    const savedFont = localStorage.getItem('android_font_index');
    if(savedFont) { currentFontIndex = parseInt(savedFont); applyFont(); }
    
    function loadWifiState() { isWifiOn = localStorage.getItem('android_wifi')==='true'; updateWifiVisuals(); }
    
    updateTime();
    setInterval(updateTime, 1000);
    goToHome();
});