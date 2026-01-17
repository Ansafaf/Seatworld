
export const paginate = async (model, query = {}, options = {}) => {
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.max(1, parseInt(options.limit, 9) || 9);
    const skip = (page - 1) * limit;

    const [totalItems, items] = await Promise.all([
        model.countDocuments(query),
        model.find(query)
            .sort(options.sort || { createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate(options.populate || [])
            .lean()
    ]);
    
    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
        items,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            limit
        }
    };
};
