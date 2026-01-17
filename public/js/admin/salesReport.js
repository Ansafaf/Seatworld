document.addEventListener('DOMContentLoaded', function () {
    const filterModes = document.querySelectorAll('input[name="filterMode"]');
    const quickSection = document.getElementById('quickFilterSection');
    const customSection = document.getElementById('customDateSection');
    const quickSelect = document.getElementById('quickFilterSelect');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const form = document.getElementById('salesReportForm');

    function toggleFilterMode() {
        const activeMode = document.querySelector('input[name="filterMode"]:checked').value;

        if (activeMode === 'quick') {
            // Show Quick, Hide Custom
            quickSection.classList.remove('hidden');
            customSection.classList.add('hidden');

            // Enable Quick, Disable Custom (to prevent submission)
            quickSelect.disabled = false;
            startDate.disabled = true;
            endDate.disabled = true;

            // Clear Custom values
            startDate.value = '';
            endDate.value = '';
        } else {
            // Show Custom, Hide Quick
            quickSection.classList.add('hidden');
            customSection.classList.remove('hidden');

            // Disable Quick, Enable Custom
            quickSelect.disabled = true;
            startDate.disabled = false;
            endDate.disabled = false;

            // Clear Quick value (optional, but good for pure state)
            // quickSelect.selectedIndex = 2; // Default to 'thisMonth' if cleared? Better keep it.
        }
    }

    // Initial state setup
    toggleFilterMode();

    // Listen for mode changes
    filterModes.forEach(radio => {
        radio.addEventListener('change', toggleFilterMode);
    });

    // Form Validation
    form.addEventListener('submit', function (e) {
        const activeMode = document.querySelector('input[name="filterMode"]:checked').value;

        if (activeMode === 'custom') {
            if (!startDate.value || !endDate.value) {
                e.preventDefault();
                alert('Please select both start and end dates.');
                return;
            }

            if (new Date(startDate.value) > new Date(endDate.value)) {
                e.preventDefault();
                alert('Start date cannot be after end date.');
                return;
            }
        }
    });
});

function downloadReport() {
    // This is still used by the PDF download link if called from ailleurs, but the EJS uses direct <a> tags now.
    // Keeping it for compatibility if needed.
    const activeMode = document.querySelector('input[name="filterMode"]:checked').value;
    let url = '/admin/sales-report/download?';

    if (activeMode === 'quick') {
        url += `quickFilter=${document.getElementById('quickFilterSelect').value}`;
    } else {
        url += `startDate=${document.getElementById('startDate').value}&endDate=${document.getElementById('endDate').value}`;
    }

    window.location.href = url;
}
