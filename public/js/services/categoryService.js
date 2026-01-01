import { apiRequest } from "../utils/fetchClient.js";

export const addCategory = (name) => {
    return apiRequest("/admin/add-category", "POST", { categoryName: name });
}

export const editCategory = (id, name) => {
    return apiRequest(`/admin/edit-category/${id}`, "POST", { categoryName: name });
}

export const blockCategory = (id) => {
    return apiRequest(`/admin/block-category/${id}`, "POST");
}

export const unblockCategory = (id) => {
    return apiRequest(`/admin/unblock-category/${id}`, "POST");
}
