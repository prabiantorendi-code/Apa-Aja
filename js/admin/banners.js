/* js/admin/banners.js */
import { db, storage } from "../firebase-config.js";
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { checkAuthState, logoutAdmin } from "../auth.js";

// Pastikan admin login
checkAuthState(true);

let isEditing = false;
let editId = null;
let selectedFile = null;

document.addEventListener("DOMContentLoaded", () => {
    loadBanners();

    // Event Listeners
    const btnAddNew = document.getElementById("btnAddNew");
    const btnCloseModal = document.getElementById("btnCloseModal");
    const formBanner = document.getElementById("formBanner");
    const bannerImageFile = document.getElementById("bannerImageFile");
    const btnLogout = document.getElementById("btnLogoutSidebar");

    if (btnAddNew) btnAddNew.addEventListener("click", () => openModal());
    if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
    if (formBanner) formBanner.addEventListener("submit", handleSaveBanner);
    if (bannerImageFile) bannerImageFile.addEventListener("change", handleFileSelect);
    if (btnLogout) btnLogout.addEventListener("click", () => logoutAdmin());
});

async function loadBanners() {
    const tbody = document.getElementById("bannersTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Memuat data...</td></tr>`;
    
    try {
        const q = query(collection(db, "banners"), orderBy("order", "asc"));
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
                    <td><img src="${data.imageUrl || ''}" class="table-img" style="width: 80px; height: 40px; border-radius: 4px;" alt="banner"></td>
                    <td><strong>${data.title || '-'}</strong></td>
                    <td>${data.subtitle || '-'}</td>
                    <td>${data.order || 0}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="window.editBannerData('${id}')">Edit</button>
                            <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteBannerData('${id}')">Hapus</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">Belum ada data banner</td></tr>`;
    } catch (error) {
        console.error("Gagal memuat banner:", error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #ef4444;">Gagal memuat data</td></tr>`;
    }
}

function handleFileSelect(e) {
    if (e.target.files && e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(event) {
            const preview = document.getElementById("imagePreview");
            if(preview) {
                preview.src = event.target.result;
                preview.style.display = "block";
            }
        };
        reader.readAsDataURL(selectedFile);
    }
}

async function handleSaveBanner(e) {
    e.preventDefault();
    
    const btnSubmit = document.getElementById("btnSubmit");
    const title = document.getElementById("bannerTitle").value.trim();
    const subtitle = document.getElementById("bannerSubtitle").value.trim();
    const order = parseInt(document.getElementById("bannerOrder").value) || 0;
    const isActive = document.getElementById("bannerStatus").checked;
    
    btnSubmit.classList.add("btn-loading");
    btnSubmit.disabled = true;

    try {
        let imageUrl = "";
        const previewEl = document.getElementById("imagePreview");
        if(previewEl) imageUrl = previewEl.src;
        
        if (selectedFile) {
            const storageRef = ref(storage, `banners/${Date.now()}_${selectedFile.name}`);
            await uploadBytes(storageRef, selectedFile);
            imageUrl = await getDownloadURL(storageRef);
        }

        const bannerData = {
            title,
            subtitle,
            order,
            isActive,
            imageUrl,
            updatedAt: new Date().toISOString()
        };

        if (isEditing && editId) {
            await updateDoc(doc(db, "banners", editId), bannerData);
        } else {
            if (!selectedFile && !imageUrl) {
                alert("Wajib upload gambar banner!");
                btnSubmit.classList.remove("btn-loading");
                btnSubmit.disabled = false;
                return;
            }
            bannerData.createdAt = new Date().toISOString();
            await addDoc(collection(db, "banners"), bannerData);
        }

        closeModal();
        loadBanners();
    } catch (error) {
        console.error("Gagal menyimpan:", error);
        alert("Terjadi kesalahan saat menyimpan data banner.");
    } finally {
        btnSubmit.classList.remove("btn-loading");
        btnSubmit.disabled = false;
    }
}

window.editBannerData = async function(id) {
    isEditing = true;
    editId = id;
    
    const modalTitle = document.getElementById("modalTitle");
    if(modalTitle) modalTitle.innerText = "Edit Banner";
    
    try {
        const docRef = doc(db, "banners", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("bannerTitle").value = data.title || "";
            document.getElementById("bannerSubtitle").value = data.subtitle || "";
            document.getElementById("bannerOrder").value = data.order || 0;
            document.getElementById("bannerStatus").checked = data.isActive !== false;
            
            const preview = document.getElementById("imagePreview");
            if(preview) {
                preview.src = data.imageUrl || '';
                preview.style.display = data.imageUrl ? "block" : "none";
            }
            
            selectedFile = null;
            openModal();
        }
    } catch (error) {
        console.error("Gagal mengambil data edit:", error);
        alert("Gagal memuat data untuk diedit.");
    }
};

window.deleteBannerData = async function(id) {
    if (confirm("Apakah Anda yakin ingin menghapus banner ini?")) {
        try {
            await deleteDoc(doc(db, "banners", id));
            loadBanners();
        } catch (error) {
            console.error("Gagal menghapus:", error);
            alert("Terjadi kesalahan saat menghapus banner.");
        }
    }
};

function openModal() {
    const modal = document.getElementById("modalBanner");
    if(modal) modal.classList.add("active");
}

function closeModal() {
    const modal = document.getElementById("modalBanner");
    if(modal) modal.classList.remove("active");
    
    const form = document.getElementById("formBanner");
    if(form) form.reset();
    
    const preview = document.getElementById("imagePreview");
    if(preview) {
        preview.src = "";
        preview.style.display = "none";
    }
    
    selectedFile = null;
    isEditing = false;
    editId = null;
    
    const modalTitle = document.getElementById("modalTitle");
    if(modalTitle) modalTitle.innerText = "Tambah Banner";
}

