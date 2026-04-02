/* js/admin/categories.js */
import { db } from "../firebase-config.js";
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { checkAuthState, logoutAdmin } from "../auth.js";

// Pastikan admin login
checkAuthState(true);

let isEditing = false;
let editId = null;

document.addEventListener("DOMContentLoaded", () => {
    loadCategories();

    // Event Listeners
    const btnAddNew = document.getElementById("btnAddNew");
    const btnCloseModal = document.getElementById("btnCloseModal");
    const formCategory = document.getElementById("formCategory");
    const btnLogout = document.getElementById("btnLogoutSidebar");

    if (btnAddNew) btnAddNew.addEventListener("click", () => openModal());
    if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
    if (formCategory) formCategory.addEventListener("submit", handleSaveCategory);
    if (btnLogout) btnLogout.addEventListener("click", () => logoutAdmin());
});

async function loadCategories() {
    const tbody = document.getElementById("categoriesTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px;">Memuat data...</td></tr>`;
    
    try {
        const q = query(collection(db, "categories"), orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        
        let html = "";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;

            html += `
                <tr>
                    <td><strong>${data.name}</strong></td>
                    <td>${data.order || 0}</td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="window.editCategoryData('${id}')">Edit</button>
                            <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteCategoryData('${id}')">Hapus</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || `<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--text-muted);">Belum ada data kategori</td></tr>`;
    } catch (error) {
        console.error("Gagal memuat kategori:", error);
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #ef4444;">Gagal memuat data</td></tr>`;
    }
}

async function handleSaveCategory(e) {
    e.preventDefault();
    
    const btnSubmit = document.getElementById("btnSubmit");
    const name = document.getElementById("categoryName").value.trim();
    const order = parseInt(document.getElementById("categoryOrder").value) || 0;
    
    if (!name) {
        alert("Nama Kategori wajib diisi!");
        return;
    }

    btnSubmit.classList.add("btn-loading");
    btnSubmit.disabled = true;

    try {
        const categoryData = {
            name,
            order,
            updatedAt: new Date().toISOString()
        };

        if (isEditing && editId) {
            await updateDoc(doc(db, "categories", editId), categoryData);
        } else {
            categoryData.createdAt = new Date().toISOString();
            await addDoc(collection(db, "categories"), categoryData);
        }

        closeModal();
        loadCategories();
    } catch (error) {
        console.error("Gagal menyimpan:", error);
        alert("Terjadi kesalahan saat menyimpan data kategori.");
    } finally {
        btnSubmit.classList.remove("btn-loading");
        btnSubmit.disabled = false;
    }
}

window.editCategoryData = async function(id) {
    isEditing = true;
    editId = id;
    
    const modalTitle = document.getElementById("modalTitle");
    if(modalTitle) modalTitle.innerText = "Edit Kategori";
    
    try {
        const docRef = doc(db, "categories", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("categoryName").value = data.name;
            document.getElementById("categoryOrder").value = data.order || 0;
            
            openModal();
        }
    } catch (error) {
        console.error("Gagal mengambil data edit:", error);
        alert("Gagal memuat data untuk diedit.");
    }
};

window.deleteCategoryData = async function(id) {
    if (confirm("Apakah Anda yakin ingin menghapus kategori ini?")) {
        try {
            await deleteDoc(doc(db, "categories", id));
            loadCategories();
        } catch (error) {
            console.error("Gagal menghapus:", error);
            alert("Terjadi kesalahan saat menghapus kategori.");
        }
    }
};

function openModal() {
    const modal = document.getElementById("modalCategory");
    if(modal) modal.classList.add("active");
}

function closeModal() {
    const modal = document.getElementById("modalCategory");
    if(modal) modal.classList.remove("active");
    
    const form = document.getElementById("formCategory");
    if(form) form.reset();
    
    isEditing = false;
    editId = null;
    
    const modalTitle = document.getElementById("modalTitle");
    if(modalTitle) modalTitle.innerText = "Tambah Kategori";
}

