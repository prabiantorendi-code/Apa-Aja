/* js/admin/products.js */
import { db } from "../firebase-config.js";
import {
    collection, addDoc, getDocs, doc,
    getDoc, updateDoc, deleteDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { checkAuthState, logoutAdmin } from "../auth.js";

checkAuthState(true);

let isEditing = false;
let editId = null;
let gamesMap = {};

document.addEventListener("DOMContentLoaded", async () => {
    await loadGamesForSelect();
    loadProducts();

    const btnAddNew     = document.getElementById("btnAddNew");
    const btnCloseModal = document.getElementById("btnCloseModal");
    const formProduct   = document.getElementById("formProduct");
    const btnLogout     = document.getElementById("btnLogoutSidebar");

    if (btnAddNew)     btnAddNew.addEventListener("click", () => openModal());
    if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
    if (formProduct)   formProduct.addEventListener("submit", handleSaveProduct);
    if (btnLogout)     btnLogout.addEventListener("click", () => logoutAdmin());
});

/* ─────────────── LOAD GAME KE DROPDOWN ─────────────── */
async function loadGamesForSelect() {
    const select = document.getElementById("productGame");
    if (!select) return;

    try {
        // Coba dengan orderBy, fallback tanpa orderBy jika index belum ada
        let snapshot;
        try {
            const q = query(collection(db, "games"), orderBy("name", "asc"));
            snapshot = await getDocs(q);
        } catch (_) {
            snapshot = await getDocs(collection(db, "games"));
        }

        gamesMap = {};
        let html = '<option value="">-- Pilih Game --</option>';

        if (snapshot.empty) {
            html += '<option value="" disabled>Belum ada game. Tambah game dulu!</option>';
        } else {
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                gamesMap[docSnap.id] = data.name;
                html += `<option value="${docSnap.id}">${data.name}</option>`;
            });
        }

        select.innerHTML = html;

    } catch (error) {
        console.error("Gagal memuat daftar game:", error);
        if (select) select.innerHTML = '<option value="">Gagal memuat game</option>';
    }
}

/* ─────────────── LOAD DAFTAR PRODUK ─────────────── */
async function loadProducts() {
    const tbody = document.getElementById("productsTableBody");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center; padding:20px;">
                ⏳ Memuat data...
            </td>
        </tr>`;

    try {
        // Fallback tanpa orderBy jika index belum ada
        let snapshot;
        try {
            const q = query(collection(db, "products"), orderBy("order", "asc"));
            snapshot = await getDocs(q);
        } catch (_) {
            snapshot = await getDocs(collection(db, "products"));
        }

        if (snapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:20px;">
                        Belum ada data produk. Klik <strong>+ Tambah Produk</strong> untuk mulai.
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

            const gameName = gamesMap[data.gameId] || '-';

            const harga = data.price
                ? `Rp ${parseInt(data.price).toLocaleString('id-ID')}`
                : '-';

            const iconHtml = data.iconUrl
                ? `<img src="${data.iconUrl}"
                        style="width:40px;height:40px;border-radius:8px;object-fit:cover;"
                        alt="icon"
                        onerror="this.src='https://placehold.co/40x40?text=?'">`
                : `<div style="width:40px;height:40px;border-radius:8px;
                              background:#374151;display:flex;align-items:center;
                              justify-content:center;color:#9ca3af;font-size:18px;">💎</div>`;

            html += `
                <tr>
                    <td>${iconHtml}</td>
                    <td><strong>${data.name || '-'}</strong></td>
                    <td>${harga}</td>
                    <td>${gameName}</td>
                    <td>${data.order ?? 0}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="display:flex; gap:8px;">
                            <button type="button"
                                class="btn btn-sm btn-secondary"
                                onclick="window.editProductData('${id}')">
                                Edit
                            </button>
                            <button type="button"
                                class="btn btn-sm btn-danger"
                                onclick="window.deleteProductData('${id}')">
                                Hapus
                            </button>
                        </div>
                    </td>
                </tr>`;
        });

        tbody.innerHTML = html;

    } catch (error) {
        console.error("Gagal memuat produk:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:20px; color:#ef4444;">
                    ❌ Gagal memuat data.<br>
                    <small>${error.message}</small>
                </td>
            </tr>`;
    }
}

/* ─────────────── SIMPAN / UPDATE PRODUK ─────────────── */
async function handleSaveProduct(e) {
    e.preventDefault();

    const btnSubmit  = document.getElementById("btnSubmit");
    const nameEl     = document.getElementById("productName");
    const priceEl    = document.getElementById("productPrice");
    const gameEl     = document.getElementById("productGame");
    const iconEl     = document.getElementById("productIconUrl");
    const orderEl    = document.getElementById("productOrder");
    const statusEl   = document.getElementById("productStatus");

    const name     = nameEl   ? nameEl.value.trim()          : "";
    const price    = priceEl  ? parseInt(priceEl.value) || 0 : 0;
    const gameId   = gameEl   ? gameEl.value.trim()          : "";
    const iconUrl  = iconEl   ? iconEl.value.trim()          : "";
    const order    = orderEl  ? parseInt(orderEl.value) || 0 : 0;
    const isActive = statusEl ? statusEl.checked             : true;

    // Validasi satu per satu supaya jelas pesannya
    if (!name) {
        alert("⚠️ Nama produk wajib diisi!");
        if (nameEl) nameEl.focus();
        return;
    }
    if (!price || price <= 0) {
        alert("⚠️ Harga wajib diisi dan harus lebih dari 0!");
        if (priceEl) priceEl.focus();
        return;
    }
    if (!gameId) {
        alert("⚠️ Pilih Game terlebih dahulu!\n\nJika dropdown kosong, pastikan sudah menambahkan game di menu Manage Games.");
        if (gameEl) gameEl.focus();
        return;
    }

    if (btnSubmit) {
        btnSubmit.classList.add("btn-loading");
        btnSubmit.disabled = true;
    }

    try {
        const productData = {
            name,
            price,
            gameId,
            iconUrl,
            order,
            isActive,
            updatedAt: new Date().toISOString()
        };

        if (isEditing && editId) {
            await updateDoc(doc(db, "products", editId), productData);
            showToast("✅ Produk berhasil diperbarui!");
        } else {
            productData.createdAt = new Date().toISOString();
            await addDoc(collection(db, "products"), productData);
            showToast("✅ Produk berhasil ditambahkan!");
        }

        closeModal();
        loadProducts();

    } catch (error) {
        console.error("Gagal menyimpan:", error);
        alert(`❌ Gagal menyimpan produk:\n${error.message}\n\nCek koneksi atau Firebase Rules.`);
    } finally {
        if (btnSubmit) {
            btnSubmit.classList.remove("btn-loading");
            btnSubmit.disabled = false;
        }
    }
}

/* ─────────────── EDIT PRODUK ─────────────── */
window.editProductData = async function(id) {
    isEditing = true;
    editId    = id;

    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) modalTitle.innerText = "Edit Produk";

    try {
        const docRef  = doc(db, "products", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            alert("Data produk tidak ditemukan.");
            return;
        }

        const data = docSnap.data();

        const nameEl   = document.getElementById("productName");
        const priceEl  = document.getElementById("productPrice");
        const gameEl   = document.getElementById("productGame");
        const iconEl   = document.getElementById("productIconUrl");
        const orderEl  = document.getElementById("productOrder");
        const statusEl = document.getElementById("productStatus");

        if (nameEl)   nameEl.value     = data.name     || "";
        if (priceEl)  priceEl.value    = data.price    || "";
        if (gameEl)   gameEl.value     = data.gameId   || "";
        if (iconEl)   iconEl.value     = data.iconUrl  || "";
        if (orderEl)  orderEl.value    = data.order    ?? 0;
        if (statusEl) statusEl.checked = data.isActive !== false;

        openModal();

    } catch (error) {
        console.error("Gagal mengambil data edit:", error);
        alert(`❌ Gagal memuat data: ${error.message}`);
    }
};

/* ─────────────── HAPUS PRODUK ─────────────── */
window.deleteProductData = async function(id) {
    if (!confirm("🗑️ Yakin ingin menghapus produk ini? Tindakan ini tidak bisa dibatalkan.")) return;

    try {
        await deleteDoc(doc(db, "products", id));
        showToast("🗑️ Produk berhasil dihapus.");
        loadProducts();
    } catch (error) {
        console.error("Gagal menghapus:", error);
        alert(`❌ Gagal menghapus: ${error.message}`);
    }
};

/* ─────────────── MODAL ─────────────── */
function openModal() {
    const modal = document.getElementById("modalProduct");
    if (modal) modal.classList.add("active");
}

function closeModal() {
    const modal = document.getElementById("modalProduct");
    if (modal) modal.classList.remove("active");

    const form = document.getElementById("formProduct");
    if (form) form.reset();

    isEditing = false;
    editId    = null;

    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) modalTitle.innerText = "Tambah Produk";
}

/* ─────────────── TOAST NOTIFIKASI ─────────────── */
function showToast(msg) {
    const existing = document.getElementById("toastMsg");
    if (existing) {
        existing.innerText = msg;
        existing.style.display  = "block";
        existing.style.opacity  = "1";
        setTimeout(() => {
            existing.style.opacity = "0";
            setTimeout(() => existing.style.display = "none", 400);
        }, 2500);
        return;
    }

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
