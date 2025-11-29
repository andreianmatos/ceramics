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
    const img = new Image();
    // Cache buster to ensure images update if you resize them
    img.src = `${currentFolderPath}${number}${FILE_EXTENSION}?v=${Date.now()}`;
    
    img.onload = () => {
        if (loadId !== currentLoadId) return;

        const canvas = document.createElement('canvas');
        canvas.className = 'ceramic';
        
        // 1. Internal Resolution (High Quality)
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // 2. Draw image
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        canvas.style.opacity = '0'; 
        canvas.dataset.id = number; 
        canvas.originalImageObject = img; 

        // --- INTELLIGENT SIZING LOGIC ---
        
        // Base size: 15% of screen width
        let displayWidth = window.innerWidth * 0.15; 
        
        // Limits: Don't get smaller than 120px or bigger than 300px (for normal items)
        if (displayWidth < 120) displayWidth = 120; 
        if (displayWidth > 300) displayWidth = 300; 

        // Glazed Folder Boost
        if (currentFolderPath.includes('glazed')) {
            // 1.8x is a good balance. 2.0x might be too crowded.
            displayWidth = displayWidth * 1.8; 
        }

        // Apply size to CSS
        canvas.style.width = Math.floor(displayWidth) + 'px';
        canvas.style.height = 'auto'; 
        
        document.body.appendChild(canvas);
        initCeramic(canvas);
    };
    img.onerror = () => {}; 
}

switchCollection(currentFolderPath);

// --- PHYSICS & SPIN ENGINE ---

function initCeramic(canvas) {
    const ctx = canvas.getContext('2d');

    // Fade in effect
    setTimeout(() => { 
        canvas.style.opacity = '1'; 
        canvas.style.transition = 'opacity 0.5s ease'; 
    }, Math.random() * 500);

    // --- SMART SPAWN LOGIC ---
    // This prevents Big Mugs from spawning inside walls
    
    // 1. Measure the object
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    // 2. Measure the top ceiling (Nav Bar)
    const desktopNav = document.getElementById('desktop-nav');
    let topBoundary = 0;
    if (desktopNav && getComputedStyle(desktopNav).display !== 'none') {
        topBoundary = desktopNav.offsetHeight; 
    }

    // 3. Calculate safe spawn coordinates
    // Ensure x is within screen width minus object width
    let x = Math.random() * (window.innerWidth - width);
    if (x < 0) x = 0; // Safety check

    // Ensure y is between the Nav Bar and the Bottom
    let availableHeight = window.innerHeight - height - topBoundary;
    if (availableHeight < 0) availableHeight = 0; // Safety check
    let y = topBoundary + (Math.random() * availableHeight);

    // Initial Velocity
    let vx = (Math.random() - 0.5) * 2; 
    let vy = (Math.random() - 0.5) * 2;

    let isDragging = false;
    let startX = 0, startY = 0;
    let lastMouseX = 0, lastMouseY = 0;

    // Spin State
    let spinInterval = null;
    let spinPauseTimeout = null; 
    let spinImages = []; 
    let currentFrame = 0;
    let spinDirection = 1; 
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
            
            // Speed Clamping (keeps them drifting gently)
            let currentSpeed = Math.sqrt(vx*vx + vy*vy);
            if (currentSpeed > 2) { vx *= 0.96; vy *= 0.96; } 
            else if (currentSpeed < 0.5) { vx *= 1.01; vy *= 1.01; }

            const currentWidth = canvas.offsetWidth;
            const currentHeight = canvas.offsetHeight;
            const bounds = { w: window.innerWidth, h: window.innerHeight };

            // --- NAV BAR COLLISION CHECK ---
            let currentTopBoundary = 0;
            if (desktopNav && getComputedStyle(desktopNav).display !== 'none') {
                currentTopBoundary = desktopNav.offsetHeight; 
            }

            // Wall Bouncing
            if (x + currentWidth > bounds.w) { x = bounds.w - currentWidth; vx *= -1; }
            if (x < 0) { x = 0; vx *= -1; }
            
            // Floor Bouncing
            if (y + currentHeight > bounds.h) { y = bounds.h - currentHeight; vy *= -1; }
            
            // Ceiling (Nav Bar) Bouncing
            if (y < currentTopBoundary) { 
                y = currentTopBoundary; 
                vy *= -1; 
            }
        }

        canvas.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        requestAnimationFrame(animate);
    }
    animate();

    // 2. SPIN LOGIC
    
    function startSpinning() {
        if (!hasCheckedForSpin) {
            checkForSpinFrames(canvas.dataset.id);
        } else if (hasSpin) {
            playSpin();
        }
    }

    function checkForSpinFrames(id) {
        spinImages.push(canvas.originalImageObject);

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
        if (spinInterval || spinPauseTimeout) return;
        
        spinInterval = setInterval(() => {
            if (spinImages.length > 1) {
                
                currentFrame += spinDirection;
                let hitEdge = false;

                // Pendulum Logic
                if (currentFrame >= spinImages.length - 1) {
                    currentFrame = spinImages.length - 1; 
                    hitEdge = true;
                    spinDirection = -1; // Reverse
                } else if (currentFrame <= 0) {
                    currentFrame = 0; 
                    hitEdge = true;
                    spinDirection = 1; // Forward
                }
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(spinImages[currentFrame], 0, 0);

                // Pause at the edges
                if (hitEdge) {
                    clearInterval(spinInterval);
                    spinInterval = null;

                    spinPauseTimeout = setTimeout(() => {
                        spinPauseTimeout = null;
                        playSpin(); 
                    }, 1000); // 1 Second Pause
                }
            }
        }, 180); 
    }

    function stopSpinning() {
        if (spinInterval) clearInterval(spinInterval);
        if (spinPauseTimeout) clearTimeout(spinPauseTimeout);
        
        spinInterval = null;
        spinPauseTimeout = null;
        
        // Reset to original image
        if (canvas.originalImageObject) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvas.originalImageObject, 0, 0);
            
            // Reset animation state
            currentFrame = 0; 
            spinDirection = 1;
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