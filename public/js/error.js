function goBack() {
    if (document.referrer && document.referrer.indexOf(window.location.host) !== -1) {
        history.back();
    } else {
        // Check if the current URL path starts with /admin
        const isAdmin = window.location.pathname.startsWith('/admin');
        if (isAdmin) {
            window.location.href = '/admin/dashboard';
        } else {
            window.location.href = '/';
        }
    }
}
