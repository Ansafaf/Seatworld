
export const buildBreadcrumb = (items = []) => {
    return [
        { label: "Home", url: "/" },
        ...items
    ];
};
