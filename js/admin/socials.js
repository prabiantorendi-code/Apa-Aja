/* js/admin/socials.js */
import { db, storage } from "../firebase-config.js";
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { checkAuthState, logoutAdmin } from "../auth.js";

// Pastikan admin login
checkAuthState(true);

let isEditing = false;
let editId = null;
let selectedFile = null;

document.addEventListener("DOMContentLoaded", () => {
    loadSocials();

    // Event Listeners
    const btnAddNew = document.getElementById("btnAddNew");
    const btnCloseModal = document.getElementById("btnCloseModal");
    const formSocial = document.getElementById("formSocial");
    const socialIconFile = document.getElementById("socialIconFile");
    const btnLogout = document.getElementById("btnLogoutSidebar");

    if (btnAddNew) btnAddNew.addEventListener("click", () => openModal());
    if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
    if (formSocial) formSocial.addEventListener("submit", handleSaveSocial);
    if (socialIconFile) socialIconFile.addEventListener("change", handleFileSelect);
    if (btnLogout) btnLogout.addEventListener("click", () => logoutAdmin());
});

async function loadSocials() {
    const tbody = document.getElementById("socialsTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Memuat data...</td></tr>`;
    
    try {
        const q = query(collection(db, "socials"), orderBy("order", "asc"));
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
                    <td><img src="${data.iconUrl || ''}" class="table-img" style="width: 32px; height: 32px; border-radius: 50%;" alt="icon"></td>
                    <td><strong>${data.name}</strong></td>
                    <td><a href="${data.url}" target="_blank" style="color: var(--color-cyan);">${data.url}</a></td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="window.editSocialData('${id}')">Edit</button>
                            <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteSocialData('${id}')">Hapus</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">Belum ada data sosial media</td></tr>`;
    } catch (error) {
        console.error("Gagal memuat sosial media:", error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ef4444;">Gagal memuat data</td></tr>`;
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

async function handleSaveSocial(e) {
    e.preventDefault();
    
    const btnSubmit = document.getElementById("btnSubmit");
    const name = document.getElementById("socialName").value.trim();
    const url = document.getElementById("socialUrl").value.trim();
    const order = parseInt(document.getElementById("socialOrder").value) || 0;
    const isActive = document.getElementById("socialStatus").checked;
    
    if (!name || !url) {
        alert("Nama Platform dan URL wajib diisi!");
        return;
    }

    btnSubmit.classList.add("btn-loading");
    btnSubmit.disabled = true;

    try {
        let iconUrl = "";
        const previewEl = document.getElementById("iconPreview");
        if(previewEl) iconUrl = previewEl.src;
        
        if (selectedFile) {
            const storageRef = ref(storage, `socials/${Date.now()}_${selectedFile.name}`);
            await uploadBytes(storageRef, selectedFile);
            iconUrl = await getDownloadURL(storageRef);
        }

        const socialData = {
            name,
            url,
            order,
            isActive,
            iconUrl,
            updatedAt: new Date().toISOString()
        };

        if (isEditing && editId) {
            await updateDoc(doc(db, "socials", editId), socialData);
        } else {
            socialData.createdAt = new Date().toISOString();
            await addDoc(collection(db, "socials"), socialData);
        }

        closeModal();
        loadSocials();
    } catch (error) {
        console.error("Gagal menyimpan:", error);
        alert("Terjadi kesalahan saat menyimpan data sosial media.");
    } finally {
        btnSubmit.classList.remove("btn-loading");
        btnSubmit.disabled = false;
    }
}

window.editSocialData = async function(id) {
    isEditing = true;
    editId = id;
    
    const modalTitle = document.getElementById("modalTitle");
    if(modalTitle) modalTitle.innerText = "Edit Sosial Media";
    
    try {
        const docRef = doc(db, "socials", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("socialName").value = data.name;
            document.getElementById("socialUrl").value = data.url;
            document.getElementById("socialOrder").value = data.order || 0;
            document.getElementById("socialStatus").checked = data.isActive !== false;
            
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

window.deleteSocialData = async function(id) {
    if (confirm("Apakah Anda yakin ingin menghapus sosial media ini?")) {
        try {
            await deleteDoc(doc(db, "socials", id));
            loadSocials();
        } catch (error) {
            console.error("Gagal menghapus:", error);
            alert("Terjadi kesalahan saat menghapus sosial media.");
        }
    }
};

function openModal() {
    const modal = document.getElementById("modalSocial");
    if(modal) modal.classList.add("active");
}

function closeModal() {
    const modal = document.getElementById("modalSocial");
    if(modal) modal.classList.remove("active");
    
    const form = document.getElementById("formSocial");
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
    if(modalTitle) modalTitle.innerText = "Tambah Sosial Media";
}

