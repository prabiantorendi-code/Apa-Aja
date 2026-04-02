/* js/admin/messages.js */
import { db } from "../firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { checkAuthState, logoutAdmin } from "../auth.js";

// Pastikan admin login
checkAuthState(true);

document.addEventListener("DOMContentLoaded", () => {
    loadMessageTemplate();

    // Event Listeners
    const formMessage = document.getElementById("formMessage");
    const btnLogout = document.getElementById("btnLogoutSidebar");

    if (formMessage) formMessage.addEventListener("submit", handleSaveMessage);
    if (btnLogout) btnLogout.addEventListener("click", () => logoutAdmin());
});

async function loadMessageTemplate() {
    const templateInput = document.getElementById("messageTemplate");
    if (!templateInput) return;

    try {
        const docRef = doc(db, "settings", "messages");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            templateInput.value = docSnap.data().template;
        } else {
            // Default template jika belum ada di database
            templateInput.value = `Halo Admin, saya ingin top up:

Game: {gameName}
ID / User ID: {userId}
Nominal: {productName}

Mohon diproses ya, terima kasih.`;
        }
    } catch (error) {
        console.error("Gagal memuat template pesan:", error);
        alert("Gagal memuat template pesan dari database.");
    }
}

async function handleSaveMessage(e) {
    e.preventDefault();
    
    const btnSubmit = document.getElementById("btnSubmit");
    const template = document.getElementById("messageTemplate").value.trim();
    
    if (!template) {
        alert("Template pesan tidak boleh kosong!");
        return;
    }

    btnSubmit.classList.add("btn-loading");
    btnSubmit.disabled = true;

    try {
        const docRef = doc(db, "settings", "messages");
        await setDoc(docRef, { 
            template: template,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        alert("Template pesan berhasil disimpan!");
    } catch (error) {
        console.error("Gagal menyimpan template pesan:", error);
        alert("Terjadi kesalahan saat menyimpan template pesan.");
    } finally {
        btnSubmit.classList.remove("btn-loading");
        btnSubmit.disabled = false;
    }
}

