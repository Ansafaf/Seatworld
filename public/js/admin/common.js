// Tailwind Configuration
if (typeof tailwind !== 'undefined') {
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    primary: "#F97316",
                    secondary: "#1F2937",
                },
                fontFamily: {
                    display: ["Inter", "sans-serif"],
                },
            },
        },
    };
}

// Sidebar Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById("adminSidebar");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    if (sidebar && mobileMenuBtn && sidebarOverlay) {
        const toggleSidebar = () => {
            const isClosed = sidebar.classList.contains("-translate-x-full");
            if (isClosed) {
                sidebar.classList.remove("-translate-x-full");
                sidebarOverlay.classList.remove("hidden");
                document.body.classList.add("overflow-hidden");
            } else {
                sidebar.classList.add("-translate-x-full");
                sidebarOverlay.classList.add("hidden");
                document.body.classList.remove("overflow-hidden");
            }
        };

        mobileMenuBtn.addEventListener("click", toggleSidebar);
        sidebarOverlay.addEventListener("click", toggleSidebar);
    }
});
