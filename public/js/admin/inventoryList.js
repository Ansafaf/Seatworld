async function viewHistory(variantId, name) {
    try {
        const response = await fetch(`/admin/inventory/history/${variantId}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        let historyHtml = `
            <div class="max-h-[60vh] overflow-y-auto px-2">
                <table class="w-full text-xs">
                    <thead>
                        <tr class="border-b-2 border-gray-100 text-gray-400 uppercase font-black">
                            <th class="py-2 text-left">Date</th>
                            <th class="py-2 text-center">Change</th>
                            <th class="py-2 text-left">Reason</th>
                            <th class="py-2 text-center">Stock</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        ${data.history.length === 0 ? '<tr><td colspan="4" class="py-8 text-center text-gray-400">No history found</td></tr>' : ''}
                        ${data.history.map(h => `
                            <tr>
                                <td class="py-3 text-gray-500">${new Date(h.createdAt).toLocaleDateString()} ${new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                <td class="py-3 text-center font-bold ${h.change > 0 ? 'text-green-500' : 'text-red-500'}">
                                    ${h.change > 0 ? '+' : ''}${h.change}
                                </td>
                                <td class="py-3 text-left">
                                    <div class="flex flex-col">
                                        <span class="font-bold text-gray-700 capitalize">${h.reason.replace(/_/g, ' ')}</span>
                                        <span class="text-[10px] text-gray-400 font-medium">${h.orderId ? 'Order: ' + h.orderId : (h.notes || '')}</span>
                                    </div>
                                </td>
                                <td class="py-3 text-center text-gray-400">
                                    ${h.previousStock} → <span class="text-gray-900 font-black">${h.currentStock}</span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        Swal.fire({
            title: `<div class="text-left"><p class="text-sm font-black text-gray-400 uppercase mb-1">Stock History</p><h3 class="text-lg font-black text-gray-800">${name}</h3></div>`,
            html: historyHtml,
            width: '600px',
            showConfirmButton: true,
            confirmButtonText: 'Close',
            confirmButtonColor: '#f97316'
        });
    } catch (error) {
        Swal.fire('Error', error.message || 'Failed to fetch history', 'error');
    }
}

async function openAdjustmentModal(variantId, name, currentStock) {
    const { value: formValues } = await Swal.fire({
        title: `<div class="text-left border-b pb-4"><p class="text-xs font-black text-gray-400 uppercase mb-1">Inventory Adjustment</p><h3 class="text-lg font-black text-gray-800">${name}</h3></div>`,
        html: `
            <div class="text-left space-y-4 pt-4">
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span class="text-xs font-black text-gray-400 uppercase">Current Stock</span>
                    <span class="text-xl font-black text-gray-900">${currentStock}</span>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Type</label>
                        <select id="adj-type" class="w-full p-3 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold bg-white appearance-none transition-all">
                            <option value="increment">Add Stock (+)</option>
                            <option value="decrement">Remove Stock (-)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Quantity</label>
                        <input id="adj-qty" type="number" min="1" class="w-full p-3 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold bg-white transition-all" value="1">
                    </div>
                </div>
                
                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Reason</label>
                    <select id="adj-reason" class="w-full p-3 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold bg-white appearance-none transition-all">
                        <option value="restock">Restock</option>
                        <option value="damage">Damage/Correction</option>
                        <option value="manual_adjustment">Other Manual Adjustment</option>
                    </select>
                </div>

                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Notes (Optional)</label>
                    <textarea id="adj-notes" class="w-full p-3 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold bg-white transition-all resize-none" rows="2" placeholder="Brief explanation..."></textarea>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Update Inventory',
        confirmButtonColor: '#f97316',
        preConfirm: () => {
            return {
                variantId,
                quantity: document.getElementById('adj-qty').value,
                type: document.getElementById('adj-type').value,
                reason: document.getElementById('adj-reason').value,
                notes: document.getElementById('adj-notes').value
            }
        }
    });

    if (formValues) {
        try {
            const response = await fetch('/admin/inventory/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues)
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Stock Updated',
                    text: data.message,
                    showConfirmButton: false,
                    timer: 1500
                });

                // Update the row dynamically
                const row = document.querySelector(`button[onclick*="${variantId}"]`).closest('tr');
                if (row) {
                    // Update stock number
                    const stockSpan = row.querySelector('.text-lg.font-black');
                    if (stockSpan) stockSpan.textContent = data.newStock;

                    // Update status badge
                    const statusSpan = row.querySelector('.rounded-full.text-\\[10px\\]');
                    if (statusSpan) {
                        statusSpan.textContent = data.stockLabel;
                        // Update class for colors
                        statusSpan.className = `px-3 py-1 rounded-full text-[10px] font-black uppercase bg-${data.stockColor}-50 text-${data.stockColor}-600 border border-${data.stockColor}-100`;
                    }

                    // Update modal trigger price/stock if stored there (though it's usually dynamic from row)
                    const adjustBtn = row.querySelector('button[onclick*="openAdjustmentModal"]');
                    if (adjustBtn) {
                        adjustBtn.setAttribute('onclick', `openAdjustmentModal('${variantId}', '${name}', '${data.newStock}')`);
                    }
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Update Failed',
                    text: data.message
                });
            }
        } catch (error) {
            Swal.fire('Error', 'Connection failed', 'error');
        }
    }
}
// Real-time debounced search for inventory
const searchInput = document.getElementById('inventorySearchInput');
let timeout = null;

if (searchInput) {
    // Focus search input and move cursor to end if it has a value
    if (searchInput.value) {
        searchInput.focus();
        const len = searchInput.value.length;
        searchInput.setSelectionRange(len, len);
    }

    searchInput.addEventListener('input', function () {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            document.getElementById('inventorySearchForm').submit();
        }, 500);
    });
}
