export const apiRequest = async (url, method = "GET", data = null) => {
    const options = {
        method: method,
        headers: {
            "Content-Type": "application/json"
        }
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            const error = new Error(result.message || `HTTP error: ${response.status}`);
            error.status = response.status;
            error.data = result;
            throw error;
        }

        return result;
    } catch (err) {
        if (err.status) throw err; // Re-throw if it's already an error with status (our custom error)
        throw new Error(err.message || 'Network error or invalid JSON');
    }
}