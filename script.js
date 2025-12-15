document.addEventListener('DOMContentLoaded', () => {

    // --- VARIABLES Y ESTADO ---
    let currentOpenApp = null;
    let appHistory = [];
    let qsPanelOpen = false;
    let notesDB = JSON.parse(localStorage.getItem('android_notes')) || [];
    let galleryDB = JSON.parse(localStorage.getItem('android_gallery')) || [];
    let serverPhotos = [];
    let gallerySelectionMode = false;
    let currentModalImageId = null;

    // -- Variables Paginación Galería --
    const ITEMS_PER_PAGE = 50;
    let currentPage = 1;

    // --- ELEMENTOS DOM ---
    const phone = document.getElementById('phone');
    const screen = document.getElementById('screen');
    const dock = document.querySelector('.dock');
    const screenBackdrop = document.getElementById('screen-backdrop');
    const quickSettingsPanel = document.getElementById('quick-settings-panel');
    const appWindows = document.querySelectorAll('.app-window');
    
    // ===============================================
    // 1. SISTEMA DE NAVEGACIÓN (CORE)
    // ===============================================

    function goToHome() {
        // Ocultar todas las ventanas
        appWindows.forEach(win => win.style.display = 'none');
        // Mostrar el Dock (Quitar clase hidden)
        dock.classList.remove('hidden');
        // Quitar blur
        screenBackdrop.classList.remove('active');
        // Cerrar panel ajustes
        quickSettingsPanel.classList.remove('active');
        qsPanelOpen = false;
        
        // Resetear estados
        currentOpenApp = null;
        if(gallerySelectionMode) toggleGallerySelectMode();
        document.getElementById('gallery-modal').classList.add('hidden');
    }

    function openApp(appId) {
        if(currentOpenApp === appId) return;

        // 1. Ocultar el Dock
        dock.classList.add('hidden');
        
        // 2. Ocultar otras apps
        appWindows.forEach(win => win.style.display = 'none');

        // 3. Mostrar la app deseada
        const app = document.getElementById(appId);
        if(app) {
            app.style.display = 'flex';
            currentOpenApp = appId;
            
            // Gestionar historial
            const idx = appHistory.indexOf(appId);
            if(idx > -1) appHistory.splice(idx, 1);
            appHistory.push(appId);

            // Configuraciones especiales
            if(appId === 'app-recents') {
                screenBackdrop.classList.add('active'); // Blur solo en recientes
                renderRecents();
            } else {
                screenBackdrop.classList.remove('active');
            }

            // Inicializar apps específicas
            if(appId === 'app-notes') renderNoteList();
            if(appId === 'app-gallery') loadGallery();
            if(appId === 'app-game') startGame();
            if(appId === 'app-file-manager') loadFileManager();
        }
    }

    function goBack() {
        // Si hay modal, cerrarlo
        const modal = document.getElementById('gallery-modal');
        if(!modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
            return;
        }
        // Si panel abierto, cerrarlo
        if(qsPanelOpen) {
            quickSettingsPanel.classList.remove('active');
            qsPanelOpen = false;
            return;
        }
        // Historial
        if(currentOpenApp) {
            appHistory.pop(); 
            if(appHistory.length > 0) {
                openApp(appHistory[appHistory.length - 1]);
            } else {
                goToHome();
            }
        }
    }

    // ===============================================
    // 2. LISTENERS GENERALES
    // ===============================================

    // Botones de Navegación
    document.getElementById('nav-home').addEventListener('click', goToHome);
    document.getElementById('nav-back').addEventListener('click', goBack);
    document.getElementById('nav-recents').addEventListener('click', () => openApp('app-recents'));

    // Iconos del Dock
    document.querySelectorAll('.app-icon').forEach(icon => {
        icon.addEventListener('click', () => {
            const appId = icon.dataset.app;
            openApp(appId);
        });
    });

    // Teclas: A (Dock), E (Ajustes), Escape (Atrás)
    document.addEventListener('keydown', (e) => {
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        // --- CAMBIO SOLICITADO: TECLA 'A' PARA MENU ---
        if(e.key.toLowerCase() === 'a') {
            dock.classList.toggle('hidden');
        }

        if(e.key.toLowerCase() === 'e') {
            if(qsPanelOpen) {
                quickSettingsPanel.classList.remove('active');
                if(currentOpenApp !== 'app-recents') screenBackdrop.classList.remove('active');
            } else {
                quickSettingsPanel.classList.add('active');
                screenBackdrop.classList.add('active');
            }
            qsPanelOpen = !qsPanelOpen;
        }
        
        if(e.key === 'Escape') goBack();
    });

    // Panel de Ajustes Rápidos
    document.getElementById('qs-settings-btn').addEventListener('click', () => {
        openApp('app-settings');
        quickSettingsPanel.classList.remove('active');
    });

    // ===============================================
    // 3. LÓGICA DE APPS
    // ===============================================

    // --- FONDO DE PANTALLA ---
    function loadWallpaper() {
        const wp = localStorage.getItem('android_wallpaper');
        if(wp) screen.style.backgroundImage = `url("${wp}")`;
        else screen.style.backgroundImage = 'linear-gradient(to top, #6a11cb 0%, #2575fc 100%)';
        
        screen.style.setProperty('--wp-fit', localStorage.getItem('android_wp_fit') || 'cover');
        screen.style.setProperty('--wp-pos', localStorage.getItem('android_wp_pos') || 'center');
    }
    // Listeners Wallpaper
    const wpUpload = document.getElementById('wallpaper-upload');
    if(wpUpload) wpUpload.addEventListener('change', (e) => {
        const r = new FileReader();
        r.onload = ev => { localStorage.setItem('android_wallpaper', ev.target.result); loadWallpaper(); };
        r.readAsDataURL(e.target.files[0]);
    });
    document.getElementById('remove-wallpaper-btn').addEventListener('click', () => {
        localStorage.removeItem('android_wallpaper'); loadWallpaper();
    });
    document.getElementById('wp-fit-select').addEventListener('change', (e) => {
        localStorage.setItem('android_wp_fit', e.target.value); loadWallpaper();
    });
    document.getElementById('wp-pos-select').addEventListener('change', (e) => {
        localStorage.setItem('android_wp_pos', e.target.value); loadWallpaper();
    });

    // --- GALERÍA ---
    async function loadGallery() {
        const grid = document.getElementById('gallery-grid');
        grid.innerHTML = '<p>Cargando...</p>';
        try {
            const res = await fetch('http://localhost:3000/api/fotos');
            serverPhotos = res.ok ? await res.json() : [];
        } catch(e) { serverPhotos = []; }
        renderGallery();
    }

    // --- CAMBIO SOLICITADO: PAGINACIÓN DE 50 EN 50 ---
    function renderGallery() {
        const grid = document.getElementById('gallery-grid');
        grid.innerHTML = '';
        
        const allImages = [...galleryDB, ...serverPhotos];
        
        if(allImages.length === 0) { grid.innerHTML = '<p>Vacío</p>'; return; }
        
        // Paginación
        const totalPages = Math.ceil(allImages.length / ITEMS_PER_PAGE);
        if(currentPage > totalPages) currentPage = totalPages;
        if(currentPage < 1) currentPage = 1;

        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const itemsToShow = allImages.slice(start, end);

        // Renderizado
        itemsToShow.forEach(img => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            if(String(img.id).startsWith('server-')) item.style.border = '2px solid #2575fc';
            item.innerHTML = `<img src="${img.data}">`;
            item.addEventListener('click', () => {
                if(gallerySelectionMode) {
                    if(String(img.id).startsWith('server-')) alert("No borrar fotos PC");
                    else item.classList.toggle('selected');
                } else {
                    document.getElementById('gallery-modal-image').src = img.data;
                    currentModalImageId = img.id;
                    document.getElementById('gallery-modal').classList.remove('hidden');
                }
            });
            grid.appendChild(item);
        });

        // Actualizar Botones
        document.getElementById('gal-page-info').innerText = `Pág ${currentPage} de ${totalPages}`;
        document.getElementById('gal-prev-btn').disabled = (currentPage === 1);
        document.getElementById('gal-next-btn').disabled = (currentPage === totalPages);
    }

    // Botones Paginación
    document.getElementById('gal-prev-btn').addEventListener('click', () => {
        if(currentPage > 1) { currentPage--; renderGallery(); }
    });
    document.getElementById('gal-next-btn').addEventListener('click', () => {
        const allImages = [...galleryDB, ...serverPhotos];
        const totalPages = Math.ceil(allImages.length / ITEMS_PER_PAGE);
        if(currentPage < totalPages) { currentPage++; renderGallery(); }
    });

    // Listeners Galería
    document.getElementById('gallery-upload').addEventListener('change', (e) => {
        const r = new FileReader();
        r.onload = ev => {
            galleryDB.push({id:Date.now(), name:'Foto', data:ev.target.result});
            localStorage.setItem('android_gallery', JSON.stringify(galleryDB));
            renderGallery();
        };
        r.readAsDataURL(e.target.files[0]);
    });
    document.getElementById('gallery-select-btn').addEventListener('click', toggleGallerySelectMode);
    document.getElementById('gallery-cancel-select-btn').addEventListener('click', toggleGallerySelectMode);
    
    function toggleGallerySelectMode() {
        gallerySelectionMode = !gallerySelectionMode;
        document.getElementById('gallery-delete-selected-btn').style.display = gallerySelectionMode ? 'inline-block' : 'none';
        document.getElementById('gallery-cancel-select-btn').style.display = gallerySelectionMode ? 'inline-block' : 'none';
        document.getElementById('gallery-upload-btn').style.display = gallerySelectionMode ? 'none' : 'inline-block';
        document.getElementById('gallery-select-btn').style.display = gallerySelectionMode ? 'none' : 'inline-block';
    }
    
    document.getElementById('gallery-delete-selected-btn').addEventListener('click', () => {
        const sel = document.querySelectorAll('.gallery-item.selected');
        const ids = Array.from(sel).map(i => Number(i.dataset.id)); // OJO: ids server son string
        galleryDB = galleryDB.filter(x => !ids.includes(x.id)); // Solo borra locales
        localStorage.setItem('android_gallery', JSON.stringify(galleryDB));
        renderGallery(); toggleGallerySelectMode();
    });

    // Modal Galería
    document.getElementById('gallery-modal-close').addEventListener('click', () => {
        document.getElementById('gallery-modal').classList.add('hidden');
    });
    document.getElementById('set-wallpaper-btn').addEventListener('click', () => {
        localStorage.setItem('android_wallpaper', document.getElementById('gallery-modal-image').src);
        loadWallpaper(); document.getElementById('gallery-modal').classList.add('hidden');
    });
    document.getElementById('modal-delete-btn').addEventListener('click', () => {
        if(String(currentModalImageId).startsWith('server-')) return alert("No borrar PC");
        galleryDB = galleryDB.filter(x => x.id !== currentModalImageId);
        localStorage.setItem('android_gallery', JSON.stringify(galleryDB));
        renderGallery(); document.getElementById('gallery-modal').classList.add('hidden');
    });

    // --- NOTAS ---
    function renderNoteList() {
        const container = document.getElementById('notes-list-container');
        container.innerHTML = '';
        notesDB.forEach(n => {
            const div = document.createElement('div');
            div.className = 'note-item';
            div.innerHTML = `<span>${n.title || 'Nota'}</span> <button class="danger-btn" style="padding:5px;">X</button>`;
            div.querySelector('span').addEventListener('click', () => {
                document.getElementById('note-id-input').value = n.id;
                document.getElementById('note-title-input').value = n.title;
                document.getElementById('note-content-input').value = n.content;
                document.getElementById('notes-list-view').style.display = 'none';
                document.getElementById('note-editor-view').style.display = 'flex';
            });
            div.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                notesDB = notesDB.filter(x => x.id !== n.id);
                localStorage.setItem('android_notes', JSON.stringify(notesDB));
                renderNoteList();
            });
            container.appendChild(div);
        });
    }
    document.getElementById('new-note-btn').addEventListener('click', () => {
        document.getElementById('note-id-input').value = '';
        document.getElementById('note-title-input').value = '';
        document.getElementById('note-content-input').value = '';
        document.getElementById('notes-list-view').style.display = 'none';
        document.getElementById('note-editor-view').style.display = 'flex';
    });
    document.getElementById('save-note-btn').addEventListener('click', () => {
        const id = document.getElementById('note-id-input').value;
        const title = document.getElementById('note-title-input').value;
        const content = document.getElementById('note-content-input').value;
        if(id) {
            const n = notesDB.find(x => x.id == id);
            if(n) { n.title = title; n.content = content; }
        } else {
            notesDB.push({id: Date.now(), title, content});
        }
        localStorage.setItem('android_notes', JSON.stringify(notesDB));
        renderNoteList();
        document.getElementById('notes-list-view').style.display = 'block';
        document.getElementById('note-editor-view').style.display = 'none';
    });
    document.getElementById('back-to-list-btn').addEventListener('click', () => {
        document.getElementById('notes-list-view').style.display = 'block';
        document.getElementById('note-editor-view').style.display = 'none';
    });

    // --- SNAKE ---
    let snakeLoop;
    function startGame() {
        const canvas = document.getElementById('snake-canvas');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        let snake = [{x:10, y:10}];
        let food = {x:15, y:15};
        let dir = 'right';
        if(snakeLoop) clearInterval(snakeLoop);
        
        document.addEventListener('keydown', e => {
            if(currentOpenApp !== 'app-game') return;
            if(e.key === 'ArrowUp') dir = 'up';
            if(e.key === 'ArrowDown') dir = 'down';
            if(e.key === 'ArrowLeft') dir = 'left';
            if(e.key === 'ArrowRight') dir = 'right';
        });

        snakeLoop = setInterval(() => {
            let x = snake[0].x, y = snake[0].y;
            if(dir === 'right') x++; if(dir === 'left') x--;
            if(dir === 'up') y--; if(dir === 'down') y++;
            
            if(x<0 || x>39 || y<0 || y>21) { // 800/20=40, 450/20=22.5
                snake = [{x:10,y:10}]; x=10; y=10;
            }
            snake.unshift({x,y});
            if(x===food.x && y===food.y) {
                food = {x:Math.floor(Math.random()*39), y:Math.floor(Math.random()*21)};
                document.getElementById('score').innerText = snake.length;
            } else snake.pop();

            ctx.fillStyle = '#222'; ctx.fillRect(0,0,800,450);
            ctx.fillStyle = 'lime'; snake.forEach(s => ctx.fillRect(s.x*20, s.y*20, 18, 18));
            ctx.fillStyle = 'red'; ctx.fillRect(food.x*20, food.y*20, 18, 18);
        }, 100);
    }

    // --- CALCULADORA ---
    let calcStr = '0';
    document.getElementById('calc-grid').addEventListener('click', (e) => {
        if(!e.target.classList.contains('calc-button')) return;
        const type = e.target.dataset.type;
        const val = e.target.dataset.val;
        
        if(type === 'num') {
            if(calcStr === '0') calcStr = val; else calcStr += val;
        } else if(type === 'op') {
            calcStr += val;
        } else if(type === 'eq') {
            try { calcStr = String(eval(calcStr)); } catch { calcStr = 'Error'; }
        } else if(type === 'clear') {
            calcStr = '0';
        } else if(type === 'back') {
            calcStr = calcStr.slice(0, -1) || '0';
        }
        document.getElementById('calc-display').innerText = calcStr;
    });

    // --- ARCHIVOS ---
    function loadFileManager() {
        const cont = document.getElementById('file-list-container');
        cont.innerHTML = '';
        const files = [
            ...notesDB.map(n => ({name: n.title, type: 'Nota'})),
            ...galleryDB.map(g => ({name: g.name, type: 'Foto'}))
        ];
        files.forEach(f => {
            const div = document.createElement('div');
            div.style.padding = '10px'; div.style.background = 'white'; div.style.margin = '5px 0';
            div.innerHTML = `<b>${f.name}</b> <small>(${f.type})</small>`;
            cont.appendChild(div);
        });
        document.getElementById('storage-usage-text').innerText = `Archivos: ${files.length}`;
        document.getElementById('storage-bar').value = files.length; // Simbólico
    }

    // --- RECIENTES ---
    function renderRecents() {
        const cont = document.getElementById('recents-container');
        cont.innerHTML = '';
        [...appHistory].reverse().forEach(id => {
            if(id === 'app-recents') return;
            const div = document.createElement('div');
            div.className = 'recent-card';
            div.innerHTML = `<span>App: ${id.replace('app-','')}</span> <button>X</button>`;
            div.addEventListener('click', () => openApp(id));
            div.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                appHistory = appHistory.filter(h => h !== id);
                renderRecents();
            });
            cont.appendChild(div);
        });
    }
    document.getElementById('recents-close-all').addEventListener('click', () => {
        appHistory = []; goToHome();
    });

    // --- HORA ---
    setInterval(() => {
        const d = new Date();
        document.getElementById('current-time').innerText = 
            `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }, 1000);

    // INICIO
    loadWallpaper();
    goToHome();
});