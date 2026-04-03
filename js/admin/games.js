/* js/admin/games.js */
import { db } from "../firebase-config.js";
import {
    collection, addDoc, getDocs, doc,
    getDoc, updateDoc, deleteDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { checkAuthState, logoutAdmin } from "../auth.js";

checkAuthState(true);

let isEditing = false;
let editId = null;

document.addEventListener("DOMContentLoaded", () => {
    loadCategories();
    loadGames();

    const btnAddNew     = document.getElementById("btnAddNew");
    const btnCloseModal = document.getElementById("btnCloseModal");
    const formGame      = document.getElementById("formGame");
    const btnLogout     = document.getElementById("btnLogoutSidebar");

    if (btnAddNew)     btnAddNew.addEventListener("click", () => openModal());
    if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
    if (formGame)      formGame.addEventListener("submit", handleSaveGame);
    if (btnLogout)     btnLogout.addEventListener("click", () => logoutAdmin());
});

/* ─────────────── LOAD KATEGORI ─────────────── */
async function loadCategories() {
    const select = document.getElementById("gameCategory");
    if (!select) return;

    try {
        // Coba dengan orderBy dulu
        let snapshot;
        try {
            const q = query(collection(db, "categories"), orderBy("name", "asc"));
            snapshot = await getDocs(q);
        } catch (_) {
            // Kalau index belum ada, fallback tanpa orderBy
            snapshot = await getDocs(collection(db, "categories"));
        }

        let html = '<option value="">-- Pilih Kategori (Opsional) --</option>';

        if (snapshot.empty) {
            // Kalau belum ada kategori, tetap bisa pakai input manual
            html += '<option value="Mobile" selected>Mobile</option>';
            html += '<option value="PC">PC</option>';
            html += '<option value="Console">Console</option>';
        } else {
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                html += `<option value="${data.name}">${data.name}</option>`;
            });
        }

        select.innerHTML = html;
    } catch (error) {
        console.error("Gagal memuat kategori:", error);
        // Fallback: isi manual supaya tidak stuck
        select.innerHTML = `
            <option value="">-- Pilih Kategori --</option>
            <option value="Mobile">Mobile</option>
            <option value="PC">PC</option>
            <option value="Console">Console</option>
        `;
    }
}

/* ─────────────── LOAD DAFTAR GAME ─────────────── */
async function loadGames() {
    const tbody = document.getElementById("gamesTableBody");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align:center; padding:20px;">
                ⏳ Memuat data...
            </td>
        </tr>`;

    try {
        // Coba dengan orderBy, fallback tanpa orderBy jika index belum ada
        let snapshot;
        try {
            const q = query(collection(db, "games"), orderBy("order", "asc"));
            snapshot = await getDocs(q);
        } catch (_) {
            snapshot = await getDocs(collection(db, "games"));
        }

        if (snapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:20px;">
                        Belum ada data game. Klik <strong>+ Tambah Game</strong> untuk mulai.
                    </td>
                </tr>`;
            return;
        }

        let html = "";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id   = docSnap.id;

            const statusBadge = data.isActive !== false
                ? '<span class="badge badge-active">● Aktif</span>'
                : '<span class="badge badge-inactive">● Nonaktif</span>';

            const iconHtml = data.iconUrl
                ? `<img src="${data.iconUrl}" 
                        style="width:40px;height:40px;border-radius:8px;object-fit:cover;" 
                        alt="icon"
                        onerror="this.src='https://placehold.co/40x40?text=?'">`
                : `<div style="width:40px;height:40px;border-radius:8px;
                              background:#374151;display:flex;align-items:center;
                              justify-content:center;color:#9ca3af;font-size:18px;">🎮</div>`;

            html += `
                <tr>
                    <td>${iconHtml}</td>
                    <td><strong>${data.name || '-'}</strong></td>
                    <td>${data.category || '-'}</td>
                    <td>${data.order ?? 0}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="display:flex;gap:8px;">
                            <button type="button"
                                class="btn btn-sm btn-secondary"
                                onclick="window.editGameData('${id}')">
                                Edit
                            </button>
                            <button type="button"
                                class="btn btn-sm btn-danger"
                                onclick="window.deleteGameData('${id}')">
                                Hapus
                            </button>
                        </div>
                    </td>
                </tr>`;
        });

        tbody.innerHTML = html;

    } catch (error) {
        console.error("Gagal memuat game:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:20px;color:#ef4444;">
                    ❌ Gagal memuat data. Cek koneksi atau Firebase Rules.<br>
                    <small>${error.message}</small>
                </td>
            </tr>`;
    }
}

/* ─────────────── SIMPAN / UPDATE GAME ─────────────── */
async function handleSaveGame(e) {
    e.preventDefault();

    const btnSubmit = document.getElementById("btnSubmit");
    const nameEl    = document.getElementById("gameName");
    const catEl     = document.getElementById("gameCategory");
    const iconEl    = document.getElementById("gameIconUrl");
    const orderEl   = document.getElementById("gameOrder");
    const statusEl  = document.getElementById("gameStatus");

    const name     = nameEl ? nameEl.value.trim() : "";
    const category = catEl  ? catEl.value.trim()  : "";
    const iconUrl  = iconEl ? iconEl.value.trim()  : "";
    const order    = orderEl ? (parseInt(orderEl.value) || 0) : 0;
    const isActive = statusEl ? statusEl.checked : true;

    // Validasi — hanya nama wajib, kategori opsional
    if (!name) {
        alert("⚠️ Nama game wajib diisi!");
        if (nameEl) nameEl.focus();
        return;
    }

    if (btnSubmit) {
        btnSubmit.classList.add("btn-loading");
        btnSubmit.disabled = true;
    }

    try {
        const gameData = {
            name,
            category,
            iconUrl,
            order,
            isActive,
            updatedAt: new Date().toISOString()
        };

        if (isEditing && editId) {
            await updateDoc(doc(db, "games", editId), gameData);
            showToast("✅ Game berhasil diperbarui!");
        } else {
            gameData.createdAt = new Date().toISOString();
            await addDoc(collection(db, "games"), gameData);
            showToast("✅ Game berhasil ditambahkan!");
        }

        closeModal();
        loadGames();

    } catch (error) {
        console.error("Gagal menyimpan:", error);
        alert(`❌ Gagal menyimpan: ${error.message}\n\nCek Firebase Rules atau koneksi internet.`);
    } finally {
        if (btnSubmit) {
            btnSubmit.classList.remove("btn-loading");
            btnSubmit.disabled = false;
        }
    }
}

/* ─────────────── EDIT GAME ─────────────── */
window.editGameData = async function(id) {
    isEditing = true;
    editId    = id;

    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) modalTitle.innerText = "Edit Game";

    try {
        const docRef  = doc(db, "games", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            alert("Data game tidak ditemukan.");
            return;
        }

        const data = docSnap.data();

        const nameEl   = document.getElementById("gameName");
        const catEl    = document.getElementById("gameCategory");
        const iconEl   = document.getElementById("gameIconUrl");
        const orderEl  = document.getElementById("gameOrder");
        const statusEl = document.getElementById("gameStatus");

        if (nameEl)   nameEl.value   = data.name     || "";
        if (catEl)    catEl.value    = data.category  || "";
        if (iconEl)   iconEl.value   = data.iconUrl   || "";
        if (orderEl)  orderEl.value  = data.order     ?? 0;
        if (statusEl) statusEl.checked = data.isActive !== false;

        openModal();

    } catch (error) {
        console.error("Gagal mengambil data edit:", error);
        alert(`❌ Gagal memuat data: ${error.message}`);
    }
};

/* ─────────────── HAPUS GAME ─────────────── */
window.deleteGameData = async function(id) {
    if (!confirm("🗑️ Yakin ingin menghapus game ini? Tindakan ini tidak bisa dibatalkan.")) return;

    try {
        await deleteDoc(doc(db, "games", id));
        showToast("🗑️ Game berhasil dihapus.");
        loadGames();
    } catch (error) {
        console.error("Gagal menghapus:", error);
        alert(`❌ Gagal menghapus: ${error.message}`);
    }
};

/* ─────────────── MODAL ─────────────── */
function openModal() {
    const modal = document.getElementById("modalGame");
    if (modal) modal.classList.add("active");
}

function closeModal() {
    const modal = document.getElementById("modalGame");
    if (modal) modal.classList.remove("active");

    const form = document.getElementById("formGame");
    if (form) form.reset();

    isEditing = false;
    editId    = null;

    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) modalTitle.innerText = "Tambah Game";
}

/* ─────────────── TOAST NOTIFIKASI ─────────────── */
function showToast(msg) {
    // Cek kalau sudah ada toast element di HTML, pakai itu
    const existing = document.getElementById("toastMsg");
    if (existing) {
        existing.innerText = msg;
        existing.style.display = "block";
        existing.style.opacity = "1";
        setTimeout(() => {
            existing.style.opacity = "0";
            setTimeout(() => existing.style.display = "none", 400);
        }, 2500);
        return;
    }

    // Kalau tidak ada, buat sendiri
    const toast = document.createElement("div");
    toast.innerText = msg;
    toast.style.cssText = `
        position:fixed; bottom:24px; right:24px;
        background:#10b981; color:#fff;
        padding:12px 20px; border-radius:10px;
        font-size:14px; font-weight:600;
        box-shadow:0 4px 16px rgba(0,0,0,0.3);
        z-index:9999; transition:opacity 0.4s;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}
