/* js/admin/icons.js */
import { db, storage } from "../firebase-config.js";
import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { checkAuthState, logoutAdmin } from "../auth.js";

// Pastikan admin login
checkAuthState(true);

let selectedFile = null;

document.addEventListener("DOMContentLoaded", () => {
    loadIcons();

    // Event Listeners
    const formIcon = document.getElementById("formIcon");
    const iconFile = document.getElementById("iconFile");
    const btnLogout = document.getElementById("btnLogoutSidebar");

    if (formIcon) formIcon.addEventListener("submit", handleUploadIcon);
    if (iconFile) iconFile.addEventListener("change", handleFileSelect);
    if (btnLogout) btnLogout.addEventListener("click", () => logoutAdmin());
});

function handleFileSelect(e) {
    if (e.target.files && e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        const preview = document.getElementById("iconPreview");
        if (preview) {
            const reader = new FileReader();
            reader.onload = function(event) {
                preview.src = event.target.result;
                preview.style.display = "block";
            };
            reader.readAsDataURL(selectedFile);
        }
    }
}

async function handleUploadIcon(e) {
    e.preventDefault();
    
    const btnSubmit = document.getElementById("btnSubmit");
    const nameInput = document.getElementById("iconName");
    const name = nameInput ? nameInput.value.trim() : (selectedFile ? selectedFile.name : "Icon");

    if (!selectedFile) {
        alert("Pilih file gambar icon terlebih dahulu!");
        return;
    }

    btnSubmit.classList.add("btn-loading");
    btnSubmit.disabled = true;

    try {
        const fileName = `${Date.now()}_${selectedFile.name}`;
        const storageRef = ref(storage, `icons/${fileName}`);
        await uploadBytes(storageRef, selectedFile);
        const url = await getDownloadURL(storageRef);

        await addDoc(collection(db, "icons"), {
            name: name,
            url: url,
            fileName: fileName,
            createdAt: new Date().toISOString()
        });

        alert("Icon berhasil diunggah!");
        
        const form = document.getElementById("formIcon");
        if (form) form.reset();
        
        const preview = document.getElementById("iconPreview");
        if (preview) {
            preview.src = "";
            preview.style.display = "none";
        }
        selectedFile = null;
        
        loadIcons();
    } catch (error) {
        console.error("Gagal upload icon:", error);
        alert("Terjadi kesalahan saat mengunggah icon.");
    } finally {
        btnSubmit.classList.remove("btn-loading");
        btnSubmit.disabled = false;
    }
}

async function loadIcons() {
    const grid = document.getElementById("iconsGrid");
    if (!grid) return;

    grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 20px;">Memuat icon...</p>`;

    try {
        const q = query(collection(db, "icons"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        let html = "";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            html += `
                <div class="icon-card">
                    <img src="${data.url}" alt="${data.name}">
                    <div class="icon-name" title="${data.name}">${data.name}</div>
                    <button type="button" class="btn-icon-delete" onclick="window.deleteIcon('${id}', '${data.fileName}')">
                        ✕
                    </button>
                </div>
            `;
        });

        grid.innerHTML = html || `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 20px;">Belum ada icon yang diunggah.</p>`;
    } catch (error) {
        console.error("Gagal memuat icons:", error);
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 20px;">Gagal memuat data</p>`;
    }
}

window.deleteIcon = async function(id, fileName) {
    if (!confirm("Apakah Anda yakin ingin menghapus icon ini?")) return;

    try {
        await deleteDoc(doc(db, "icons", id));
        
        if (fileName) {
            const storageRef = ref(storage, `icons/${fileName}`);
            await deleteObject(storageRef).catch(e => console.warn("File tidak ditemukan di storage, abaikan.", e));
        }

        loadIcons();
    } catch (error) {
        console.error("Gagal menghapus icon:", error);
        alert("Terjadi kesalahan saat menghapus icon.");
    }
};

