document.body.style.overscrollBehavior = 'none';

const CATALOGUE_DATA = {
    available: {
        11: { title: "Mug", size: "", detail: "Industrial Form. Glazed." },
        12: { title: "Mug", size: "", detail: "Industrial Form. Glazed." },
        14: { title: "Little Bawl", size: "", detail: "Handbuilt. Glazed." },
        24: { title: "Small vase", size: "", detail: "Handbuilt Form. Glazed." },
    },
     /*,unavailable: {
        10: { title: "Mug", size: "", detail: "Industrial Form. Glazed. Piece broken below." },
        4: { title: "Box with Lid", size: "", detail: "Handbuilt. Glazed." },
        5: { title: "Small vase", size: "", detail: "Handbuilt. Glazed." },
        18: { title: "Coffee Cup", size: "", detail: "Handbuilt. Glazed." },
        8: { title: "Tiny Box", size: "", detail: "Handbuilt. Glazed." },
        7: { title: "Cup", size: "", detail: "Handbuilt. Glazed." },
    } */
};

const CONFIG = {
    pieces: { minToLoad: 8, maxToLoad: 14, minScale: 0.15, maxScale: 0.20, fileRange: [1, 13] },
    doodles: { minToShow: 6, maxToShow: 10, minScale: 0.35, maxScale: 1.0, minOpacity: 0.15, maxOpacity: 0.3, fileRange: [1, 8] },
    catalogue: { maxToCheck: 50 }
};

const FOLDERS = ['ceramics/favorites/'];
const DOODLE_FOLDER = 'drawings/';
const SELL_CONFIG = [
    { path: 'sell/available/', status: 'available', label: 'For Sale' },
    { path: 'sell/unavailable/', status: 'unavailable', label: '' }
];

const FILE_EXT = '.png';
const doodlesLayer = document.getElementById('doodles-layer');
const ceramicsLayer = document.getElementById('ceramics-layer');
const catalogueOverlay = document.getElementById('catalogue-overlay');
const aboutOverlay = document.getElementById('about-overlay');
const quartoContainer = document.getElementById('quarto-container');
const topNav = document.getElementById('top-nav');

const navQuarto = document.getElementById('nav-quarto');
const navCatalogo = document.getElementById('nav-catalogo');
const navAbout = document.getElementById('nav-about');

let ceramicQueue = []; 
let isPaused = false; 

const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const checkImageExists = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
};

function initDoodles() {
    let pool = [];
    for (let i = CONFIG.doodles.fileRange[0]; i <= CONFIG.doodles.fileRange[1]; i++) pool.push(i);
    pool.sort(() => Math.random() - 0.5);
    const totalDoodles = randomInRange(CONFIG.doodles.minToShow, CONFIG.doodles.maxToShow);

    for (let i = 0; i < totalDoodles; i++) {
        let id = pool[i % pool.length];
        let img = new Image();
        img.src = `${DOODLE_FOLDER}doodle${id}${FILE_EXT}`;
        img.onload = () => {
            const d = document.createElement('div');
            d.className = 'doodle';
            d.style.backgroundImage = `url(${img.src})`;
            let scale = CONFIG.doodles.minScale + Math.random() * (CONFIG.doodles.maxScale - CONFIG.doodles.minScale);
            let w = (img.naturalWidth * scale);
            let h = w * (img.naturalHeight / img.naturalWidth);
            d.style.width = w + "px"; d.style.height = h + "px";
            d.style.left = Math.random() * (window.innerWidth - w) + "px";
            d.style.top = Math.random() * (window.innerHeight - h) + "px";
            d.style.transform = `rotate(${Math.random() * 360}deg)`;
            doodlesLayer.appendChild(d);
            setTimeout(() => { d.style.opacity = randomInRange(CONFIG.doodles.minOpacity * 100, CONFIG.doodles.maxOpacity * 100) / 100; }, 100);
        };
    }
}

function initQuarto() {
    initDoodles();
    let pool = [];
    for (let i = CONFIG.pieces.fileRange[0]; i <= CONFIG.pieces.fileRange[1]; i++) pool.push(i);
    pool.sort(() => Math.random() - 0.5);
    const totalPieces = randomInRange(CONFIG.pieces.minToLoad, CONFIG.pieces.maxToLoad);

    for (let i = 0; i < totalPieces; i++) {
        let id = pool[i % pool.length];
        let img = new Image();
        img.src = `${FOLDERS[0]}${id}${FILE_EXT}`;
        img.onload = () => {
            const canvas = createPieceElement(img);
            ceramicQueue.push(canvas);
            if (ceramicQueue.length === 1) revealPiecesSequentially();
        };
    }
}

function createPieceElement(imgObj) {
    const canvas = document.createElement('canvas');
    canvas.className = 'ceramic';
    const ctx = canvas.getContext('2d');
    canvas.width = imgObj.naturalWidth; 
    canvas.height = imgObj.naturalHeight;
    ctx.drawImage(imgObj, 0, 0);

    let scale = CONFIG.pieces.minScale + Math.random() * (CONFIG.pieces.maxScale - CONFIG.pieces.minScale);
    let w = window.innerWidth * scale;
    if (window.innerWidth < 768) w = window.innerWidth * (scale * 2.5);
    canvas.style.width = w + "px";

    let x = Math.random() * (window.innerWidth - w);
    let y = Math.random() * (window.innerHeight - w);
    let vx = (Math.random() - 0.5) * 0.5;
    let vy = (Math.random() - 0.5) * 0.5;
    
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    function update() {
        if (!isDragging && !isPaused) {
            x += vx; 
            y += vy;
            // Boundary checks
            if (x < 0 || x > window.innerWidth - canvas.offsetWidth) vx *= -1;
            if (y < 0 || y > window.innerHeight - canvas.offsetHeight) vy *= -1;
        }
        canvas.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        requestAnimationFrame(update);
    }

    canvas.addEventListener('pointerdown', (e) => {
        if (!isPaused) {
            isDragging = true;
            canvas.style.cursor = 'grabbing';
            canvas.setPointerCapture(e.pointerId);
            
            // Calculate where inside the piece the user clicked
            dragOffsetX = e.clientX - x;
            dragOffsetY = e.clientY - y;
        }
    });

    canvas.addEventListener('pointermove', (e) => {
        if (isDragging) {
            // Move the piece relative to the initial grab point
            x = e.clientX - dragOffsetX;
            y = e.clientY - dragOffsetY;
        }
    });

    canvas.addEventListener('pointerup', (e) => {
        isDragging = false;
        canvas.style.cursor = 'grab';
        canvas.releasePointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointercancel', (e) => {
        isDragging = false;
        canvas.releasePointerCapture(e.pointerId);
    });

    ceramicsLayer.appendChild(canvas);
    update();
    return canvas;
}

function revealPiecesSequentially() {
    if (ceramicQueue.length === 0) return;
    const nextPiece = ceramicQueue.shift();
    setTimeout(() => {
        nextPiece.classList.add('appeared');
        setTimeout(revealPiecesSequentially, 150);
    }, 50);
}

async function initCatalogue() {
    const grid = document.querySelector('.seamless-grid');
    for (const config of SELL_CONFIG) {
        // Now using the CONFIG number instead of hardcoded 15
        for (let i = 1; i <= CONFIG.catalogue.maxToCheck; i++) {
            const mainSrc = `${config.path}${i}${FILE_EXT}`;
            const imgObj = await checkImageExists(mainSrc);
            
            if (imgObj) {
                const pieceInfo = (CATALOGUE_DATA[config.status] && CATALOGUE_DATA[config.status][i]) || { title: `Piece #${i}`, size: "", detail: "" };
                const item = document.createElement('div');
                item.className = `cat-item ${config.status}`;
                
                const scroller = document.createElement('div'); 
                scroller.className = 'image-scroller';
                
                const dotContainer = document.createElement('div'); 
                dotContainer.className = 'dot-pagination';
                
                const mainImg = document.createElement('img'); 
                mainImg.src = mainSrc;
                scroller.appendChild(mainImg);
                
                const firstDot = document.createElement('div'); 
                firstDot.className = 'dot active';
                dotContainer.appendChild(firstDot);

                // Check for detail images (1 through 4)
                for (let d = 1; d <= 4; d++) {
                    const dSrc = `${config.path}${i}_${d}${FILE_EXT}`;
                    const dImgObj = await checkImageExists(dSrc);
                    if (dImgObj) {
                        const dImg = document.createElement('img'); 
                        dImg.src = dSrc;
                        scroller.appendChild(dImg);
                        const dot = document.createElement('div'); 
                        dot.className = 'dot';
                        dotContainer.appendChild(dot);
                    }
                }

                scroller.addEventListener('scroll', () => {
                    const index = Math.round(scroller.scrollLeft / scroller.clientWidth);
                    const dots = dotContainer.querySelectorAll('.dot');
                    dots.forEach((dot, idx) => dot.classList.toggle('active', idx === index));
                });

                const info = document.createElement('div'); 
                info.className = 'cat-info';
                info.innerHTML = `
                    <div class="info-header">
                        <h3>${pieceInfo.title}</h3>
                        <p class="status">${config.label}</p>
                    </div>
                    <div class="info-details">
                        <p>${pieceInfo.size}</p>
                        <p class="extra">${pieceInfo.detail}</p>
                    </div>
                `;
                
                item.appendChild(scroller); 
                item.appendChild(dotContainer); 
                item.appendChild(info);
                grid.appendChild(item);
            }
        }
    }
}

function resetNav() {
    catalogueOverlay.classList.remove('overlay-open');
    aboutOverlay.classList.remove('overlay-open');
    quartoContainer.classList.remove('dimmed');
    isPaused = false;
    navQuarto.classList.remove('active');
    navCatalogo.classList.remove('active');
    navAbout.classList.remove('active');
}

navQuarto.addEventListener('click', () => { resetNav(); navQuarto.classList.add('active'); });
navCatalogo.addEventListener('click', () => {
    if (catalogueOverlay.classList.contains('overlay-open')) return;
    resetNav();
    catalogueOverlay.classList.add('overlay-open');
    quartoContainer.classList.add('dimmed');
    navCatalogo.classList.add('active');
    isPaused = true;
});
navAbout.addEventListener('click', () => {
    if (aboutOverlay.classList.contains('overlay-open')) return;
    resetNav();
    aboutOverlay.classList.add('overlay-open');
    quartoContainer.classList.add('dimmed');
    navAbout.classList.add('active');
    isPaused = true;
});

window.addEventListener('load', () => { initQuarto(); initCatalogue(); });