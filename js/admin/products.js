/* js/admin/products.js */
import { db, storage } from "../firebase-config.js";
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { checkAuthState, logoutAdmin } from "../auth.js";

// Pastikan admin login
checkAuthState(true);

let isEditing = false;
let editId = null;
let selectedFile = null;
let gamesMap = {};

document.addEventListener("DOMContentLoaded", async () => {
    await loadGamesForSelect();
    loadProducts();

    // Event Listeners
    const btnAddNew = document.getElementById("btnAddNew");
    const btnCloseModal = document.getElementById("btnCloseModal");
    const formProduct = document.getElementById("formProduct");
    const productIconFile = document.getElementById("productIconFile");
    const btnLogout = document.getElementById("btnLogoutSidebar");

    if (btnAddNew) btnAddNew.addEventListener("click", () => openModal());
    if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
    if (formProduct) formProduct.addEventListener("submit", handleSaveProduct);
    if (productIconFile) productIconFile.addEventListener("change", handleFileSelect);
    if (btnLogout) btnLogout.addEventListener("click", () => logoutAdmin());
});

async function loadGamesForSelect() {
    const select = document.getElementById("productGame");
    try {
        const q = query(collection(db, "games"), orderBy("name", "asc"));
        const snapshot = await getDocs(q);
        
        let html = '<option value="">Pilih Game</option>';
        gamesMap = {};
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            gamesMap[docSnap.id] = data.name;
            html += `<option value="${docSnap.id}">${data.name}</option>`;
        });
        
        if (select) select.innerHTML = html;
    } catch (error) {
        console.error("Gagal memuat daftar game:", error);
    }
}

async function loadProducts() {
    const tbody = document.getElementById("productsTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">Memuat data...</td></tr>`;
    
    try {
        const q = query(collection(db, "products"), orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        
        let html = "";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const statusBadge = data.isActive !== false ? 
                '<span class="badge badge-active">Aktif</span>' : 
                '<span class="badge badge-inactive">Nonaktif</span>';
            const gameName = gamesMap[data.gameId] || '-';

            html += `
                <tr>
                    <td><img src="${data.iconUrl || ''}" class="table-img" alt="icon"></td>
                    <td><strong>${data.name}</strong></td>
                    <td>Rp ${parseInt(data.price).toLocaleString('id-ID')}</td>
                    <td>${gameName}</td>
                    <td>${data.order || 0}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="window.editProductData('${id}')">Edit</button>
                            <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteProductData('${id}')">Hapus</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">Belum ada data produk</td></tr>`;
    } catch (error) {
        console.error("Gagal memuat produk:", error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #ef4444;">Gagal memuat data</td></tr>`;
    }
}

function handleFileSelect(e) {
    if (e.target.files && e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(event) {
            const preview = document.getElementById("iconPreview");
            if(preview) {
                preview.src = event.target.result;
                preview.style.display = "block";
            }
        };
        reader.readAsDataURL(selectedFile);
    }
}

async function handleSaveProduct(e) {
    e.preventDefault();
    
    const btnSubmit = document.getElementById("btnSubmit");
    const name = document.getElementById("productName").value.trim();
    const price = parseInt(document.getElementById("productPrice").value) || 0;
    const gameId = document.getElementById("productGame").value;
    const order = parseInt(document.getElementById("productOrder").value) || 0;
    const isActive = document.getElementById("productStatus").checked;
    
    if (!name || !price || !gameId) {
        alert("Nama, Harga, dan Game wajib diisi!");
        return;
    }

    btnSubmit.classList.add("btn-loading");
    btnSubmit.disabled = true;

    try {
        let iconUrl = "";
        const previewEl = document.getElementById("iconPreview");
        if(previewEl) iconUrl = previewEl.src;
        
        if (selectedFile) {
            const storageRef = ref(storage, `products/${Date.now()}_${selectedFile.name}`);
            await uploadBytes(storageRef, selectedFile);
            iconUrl = await getDownloadURL(storageRef);
        }

        const productData = {
            name,
            price,
            gameId,
            order,
            isActive,
            iconUrl,
            updatedAt: new Date().toISOString()
        };

        if (isEditing && editId) {
            await updateDoc(doc(db, "products", editId), productData);
        } else {
            productData.createdAt = new Date().toISOString();
            await addDoc(collection(db, "products"), productData);
        }

        closeModal();
        loadProducts();
    } catch (error) {
        console.error("Gagal menyimpan:", error);
        alert("Terjadi kesalahan saat menyimpan data produk.");
    } finally {
        btnSubmit.classList.remove("btn-loading");
        btnSubmit.disabled = false;
    }
}

window.editProductData = async function(id) {
    isEditing = true;
    editId = id;
    
    const modalTitle = document.getElementById("modalTitle");
    if(modalTitle) modalTitle.innerText = "Edit Produk";
    
    try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("productName").value = data.name;
            document.getElementById("productPrice").value = data.price;
            document.getElementById("productGame").value = data.gameId || "";
            document.getElementById("productOrder").value = data.order || 0;
            document.getElementById("productStatus").checked = data.isActive !== false;
            
            const preview = document.getElementById("iconPreview");
            if(preview) {
                preview.src = data.iconUrl || '';
                preview.style.display = data.iconUrl ? "block" : "none";
            }
            
            selectedFile = null;
            openModal();
        }
    } catch (error) {
        console.error("Gagal mengambil data edit:", error);
        alert("Gagal memuat data untuk diedit.");
    }
};

window.deleteProductData = async function(id) {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
        try {
            await deleteDoc(doc(db, "products", id));
            loadProducts();
        } catch (error) {
            console.error("Gagal menghapus:", error);
            alert("Terjadi kesalahan saat menghapus produk.");
        }
    }
};

function openModal() {
    const modal = document.getElementById("modalProduct");
    if(modal) modal.classList.add("active");
}

function closeModal() {
    const modal = document.getElementById("modalProduct");
    if(modal) modal.classList.remove("active");
    
    const form = document.getElementById("formProduct");
    if(form) form.reset();
    
    const preview = document.getElementById("iconPreview");
    if(preview) {
        preview.src = "";
        preview.style.display = "none";
    }
    
    selectedFile = null;
    isEditing = false;
    editId = null;
    
    const modalTitle = document.getElementById("modalTitle");
    if(modalTitle) modalTitle.innerText = "Tambah Produk";
}

