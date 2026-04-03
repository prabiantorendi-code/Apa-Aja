/* js/admin/games.js */
import { db } from "../firebase-config.js";
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { checkAuthState, logoutAdmin } from "../auth.js";

// Pastikan admin login
checkAuthState(true);

let isEditing = false;
let editId = null;

document.addEventListener("DOMContentLoaded", () => {
    loadCategories();
    loadGames();

    // Event Listeners
    const btnAddNew = document.getElementById("btnAddNew");
    const btnCloseModal = document.getElementById("btnCloseModal");
    const formGame = document.getElementById("formGame");
    const btnLogout = document.getElementById("btnLogoutSidebar");

    if (btnAddNew) btnAddNew.addEventListener("click", () => openModal());
    if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
    if (formGame) formGame.addEventListener("submit", handleSaveGame);
    if (btnLogout) btnLogout.addEventListener("click", () => logoutAdmin());
});

async function loadCategories() {
    const select = document.getElementById("gameCategory");
    if (!select) return;

    try {
        const q = query(collection(db, "categories"), orderBy("name", "asc"));
        const snapshot = await getDocs(q);
        
        let html = '<option value="">Pilih Kategori</option>';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            html += `<option value="${data.name}">${data.name}</option>`;
        });
        select.innerHTML = html;
    } catch (error) {
        console.error("Gagal memuat kategori:", error);
    }
}

async function loadGames() {
    const tbody = document.getElementById("gamesTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Memuat data...</td></tr>`;
    
    try {
        const q = query(collection(db, "games"), orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        
        let html = "";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const statusBadge = data.isActive !== false ? 
                '<span class="badge badge-active">Aktif</span>' : 
                '<span class="badge badge-inactive">Nonaktif</span>';

            html += `
                <tr>
                    <td><img src="${data.iconUrl || ''}" class="table-img" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;" alt="icon"></td>
                    <td><strong>${data.name}</strong></td>
                    <td>${data.category || '-'}</td>
                    <td>${data.order || 0}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="window.editGameData('${id}')">Edit</button>
                            <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteGameData('${id}')">Hapus</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || `<tr><td colspan="6" style="text-align: center; padding: 20px;">Belum ada data game</td></tr>`;
    } catch (error) {
        console.error("Gagal memuat game:", error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #ef4444;">Gagal memuat data</td></tr>`;
    }
}

async function handleSaveGame(e) {
    e.preventDefault();
    
    const btnSubmit = document.getElementById("btnSubmit");
    const name = document.getElementById("gameName").value.trim();
    const category = document.getElementById("gameCategory").value;
    const iconUrl = document.getElementById("gameIconUrl").value.trim(); // Ambil nilai dari input URL
    const order = parseInt(document.getElementById("gameOrder").value) || 0;
    const isActive = document.getElementById("gameStatus").checked;
    
    if (!name || !category) {
        alert("Nama dan Kategori wajib diisi!");
        return;
    }

    btnSubmit.classList.add("btn-loading");
    btnSubmit.disabled = true;

    try {
        const gameData = {
            name,
            category,
            iconUrl, // Disimpan langsung sebagai string URL
            order,
            isActive,
            updatedAt: new Date().toISOString()
        };

        if (isEditing && editId) {
            await updateDoc(doc(db, "games", editId), gameData);
        } else {
            gameData.createdAt = new Date().toISOString();
            await addDoc(collection(db, "games"), gameData);
        }

        closeModal();
        loadGames();
    } catch (error) {
        console.error("Gagal menyimpan:", error);
        alert("Terjadi kesalahan saat menyimpan data game.");
    } finally {
        btnSubmit.classList.remove("btn-loading");
        btnSubmit.disabled = false;
    }
}

window.editGameData = async function(id) {
    isEditing = true;
    editId = id;
    
    const modalTitle = document.getElementById("modalTitle");
    if(modalTitle) modalTitle.innerText = "Edit Game";
    
    try {
        const docRef = doc(db, "games", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("gameName").value = data.name;
            document.getElementById("gameCategory").value = data.category || "";
            document.getElementById("gameIconUrl").value = data.iconUrl || "";
            document.getElementById("gameOrder").value = data.order || 0;
            document.getElementById("gameStatus").checked = data.isActive !== false;
            
            openModal();
        }
    } catch (error) {
        console.error("Gagal mengambil data edit:", error);
        alert("Gagal memuat data untuk diedit.");
    }
};

window.deleteGameData = async function(id) {
    if (confirm("Apakah Anda yakin ingin menghapus game ini?")) {
        try {
            await deleteDoc(doc(db, "games", id));
            loadGames();
        } catch (error) {
            console.error("Gagal menghapus:", error);
            alert("Terjadi kesalahan saat menghapus game.");
        }
    }
};

function openModal() {
    const modal = document.getElementById("modalGame");
    if(modal) modal.classList.add("active");
}

function closeModal() {
    const modal = document.getElementById("modalGame");
    if(modal) modal.classList.remove("active");
    
    const form = document.getElementById("formGame");
    if(form) form.reset();
    
    isEditing = false;
    editId = null;
    
    const modalTitle = document.getElementById("modalTitle");
    if(modalTitle) modalTitle.innerText = "Tambah Game";
}
