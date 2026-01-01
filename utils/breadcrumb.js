
export const buildBreadcrumb = (items = []) => {
    return [
        { label: "Home", url: "/home" },
        ...items
    ];
};
