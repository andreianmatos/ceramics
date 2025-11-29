// --- CONFIGURATION ---
let currentFolderPath = 'ceramics/fantasy/'; 
const FILE_EXTENSION = '.png'; 
const MAX_CHECK = 100; 

let currentLoadId = 0; 
window.isGlobalPaused = false; 

// --- DOM ELEMENTS ---
const mobileToggle = document.getElementById('mobile-toggle');
const mobileOverlay = document.getElementById('mobile-overlay');
const navLinks = document.querySelectorAll('.nav-link');

// --- NAVIGATION LOGIC ---
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        const folder = e.target.getAttribute('data-folder');
        document.querySelectorAll(`.nav-link[data-folder="${folder}"]`)
                .forEach(l => l.classList.add('active'));
        
        if (folder !== currentFolderPath) {
            switchCollection(folder);
        }
        closeMobileMenu();
    });
});

mobileToggle.addEventListener('click', () => {
    mobileOverlay.classList.contains('open') ? closeMobileMenu() : openMobileMenu();
});

function openMobileMenu() { mobileOverlay.classList.add('open'); }
function closeMobileMenu() { mobileOverlay.classList.remove('open'); }

// --- LOADER (Canvas Version) ---

function switchCollection(newPath) {
    console.log(`Switching to ${newPath}`);
    // Remove existing canvases
    const existing = document.querySelectorAll('.ceramic');
    existing.forEach(el => el.remove());

    currentFolderPath = newPath;
    currentLoadId++; 
    window.isGlobalPaused = false;

    for (let i = 1; i <= MAX_CHECK; i++) {
        tryLoadImage(i, currentLoadId);
    }
}

function tryLoadImage(number, loadId) {
    // 1. Load the image data first
    const img = new Image();
    img.src = `${currentFolderPath}${number}${FILE_EXTENSION}`;
    
    img.onload = () => {
        if (loadId !== currentLoadId) return;

        // 2. Create a CANVAS instead of an IMG
        // Canvas allows seamless drawing without flashing
        const canvas = document.createElement('canvas');
        canvas.className = 'ceramic';
        
        // Set internal resolution to match the image quality
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Draw the initial static image onto the canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        canvas.style.opacity = '0'; 
        canvas.dataset.id = number; 
        
        // Save the original Image Object for later resetting
        // We attach it directly to the element's memory
        canvas.originalImageObject = img; 
        
        document.body.appendChild(canvas);
        initCeramic(canvas);
    };
    img.onerror = () => {}; 
}

switchCollection(currentFolderPath);

// --- PHYSICS & SPIN ENGINE ---

function initCeramic(canvas) {
    const ctx = canvas.getContext('2d');

    setTimeout(() => { 
        canvas.style.opacity = '1'; 
        canvas.style.transition = 'opacity 0.5s ease'; 
    }, Math.random() * 500);

    let x = Math.random() * (window.innerWidth - 200);
    let y = Math.random() * (window.innerHeight - 200);
    let vx = (Math.random() - 0.5) * 2; 
    let vy = (Math.random() - 0.5) * 2;

    let isDragging = false;
    let startX = 0, startY = 0;
    let lastMouseX = 0, lastMouseY = 0;

    // Spin State
    let spinInterval = null;
    let spinImages = []; 
    let currentFrame = 0;
    let hasCheckedForSpin = false;
    let hasSpin = false; 

    // 1. ANIMATION LOOP (Physics)
    function animate() {
        if (!document.body.contains(canvas)) return;

        if (!isDragging && window.isGlobalPaused) {
            requestAnimationFrame(animate); 
            return; 
        }

        if (!isDragging) {
            x += vx;
            y += vy;
            
            let currentSpeed = Math.sqrt(vx*vx + vy*vy);
            if (currentSpeed > 2) { vx *= 0.96; vy *= 0.96; } 
            else if (currentSpeed < 0.5) { vx *= 1.01; vy *= 1.01; }

            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;
            const bounds = { w: window.innerWidth, h: window.innerHeight };

            if (x + width > bounds.w) { x = bounds.w - width; vx *= -1; }
            if (x < 0) { x = 0; vx *= -1; }
            if (y + height > bounds.h) { y = bounds.h - height; vy *= -1; }
            if (y < 0) { y = 0; vy *= -1; }
        }

        canvas.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        requestAnimationFrame(animate);
    }
    animate();

    // 2. SPIN LOGIC (Canvas Paint Method)
    
    function startSpinning() {
        if (!hasCheckedForSpin) {
            checkForSpinFrames(canvas.dataset.id);
        } else if (hasSpin) {
            playSpin();
        }
    }

    function checkForSpinFrames(id) {
        const url = `${currentFolderPath}${id}_1${FILE_EXTENSION}`;
        const testImg = new Image();
        testImg.src = url;

        testImg.onload = () => {
            hasSpin = true;
            hasCheckedForSpin = true;
            spinImages.push(testImg);
            preloadNextFrame(id, 2);
            playSpin();
        };

        testImg.onerror = () => {
            hasSpin = false;
            hasCheckedForSpin = true;
        };
    }

    function preloadNextFrame(id, frameNum) {
        if (frameNum > 30) return; 

        const url = `${currentFolderPath}${id}_${frameNum}${FILE_EXTENSION}`;
        const img = new Image();
        img.src = url;
        
        img.onload = () => {
            spinImages.push(img);
            preloadNextFrame(id, frameNum + 1);
        };
    }

    function playSpin() {
        if (spinInterval) clearInterval(spinInterval);
        
        spinInterval = setInterval(() => {
            if (spinImages.length > 0) {
                currentFrame = (currentFrame + 1) % spinImages.length;
                
                // --- SEAMLESS DRAWING ---
                // 1. Clear the canvas (optional, but good for transparency)
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // 2. Paint the new frame
                // Since this is a Canvas draw call, there is NO flashing.
                ctx.drawImage(spinImages[currentFrame], 0, 0);
            }
        }, 250); 
    }

    function stopSpinning() {
        if (spinInterval) clearInterval(spinInterval);
        
        // Reset to original image ONLY if we were spinning
        if (hasSpin && canvas.originalImageObject) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvas.originalImageObject, 0, 0);
        }
    }


    // 3. POINTER EVENTS

    function onPointerDown(e) {
        isDragging = true;
        window.isGlobalPaused = true; 
        
        startSpinning();

        canvas.setPointerCapture(e.pointerId); 
        canvas.style.zIndex = 1000; 
        canvas.style.transition = 'none'; 
        startX = e.clientX - x;
        startY = e.clientY - y;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        vx = 0; vy = 0;
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        x = e.clientX - startX;
        y = e.clientY - startY;
        vx = e.clientX - lastMouseX;
        vy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }

    function onPointerUp(e) {
        if (!isDragging) return;
        isDragging = false;
        window.isGlobalPaused = false; 
        
        stopSpinning();

        canvas.releasePointerCapture(e.pointerId);
        canvas.style.zIndex = '';
        const maxSpeed = 20;
        vx = Math.max(Math.min(vx, maxSpeed), -maxSpeed);
        vy = Math.max(Math.min(vy, maxSpeed), -maxSpeed);
        if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) {
            vx = (Math.random() - 0.5) * 2;
            vy = (Math.random() - 0.5) * 2;
        }
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp); 
}