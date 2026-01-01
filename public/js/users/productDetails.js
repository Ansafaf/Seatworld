// Image Switcher
function changeImage(src, el) {
    document.getElementById('main-image').src = src;
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    el.classList.add('active');

    // Reset zoom
    setupZoom();
}

// Zoom Functionality
function setupZoom() {
    const container = document.getElementById('img-container');
    const img = document.getElementById('main-image');

    container.addEventListener('mousemove', function (e) {
        const { left, top, width, height } = container.getBoundingClientRect();
        const x = (e.clientX - left) / width;
        const y = (e.clientY - top) / height;

        img.style.transformOrigin = `${x * 100}% ${y * 100}%`;
        img.style.transform = "scale(2)"; // Zoom level
    });

    container.addEventListener('mouseleave', function () {
        img.style.transform = "scale(1)";
        setTimeout(() => {
            img.style.transformOrigin = "center center";
        }, 300);
    });
}

// Initialize
setupZoom();
