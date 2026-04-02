/* js/admin/settings.js */
import { db, auth } from "../firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { updatePassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { checkAuthState, logoutAdmin } from "../auth.js";

// Pastikan admin login
checkAuthState(true);

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inisialisasi Form WhatsApp (jika di halaman admin/whatsapp.html)
    const formWhatsApp = document.getElementById("formWhatsApp");
    if (formWhatsApp) {
        loadWhatsAppSetting();
        formWhatsApp.addEventListener("submit", handleSaveWhatsApp);
    }

    // 2. Inisialisasi Form Contact (jika di halaman admin/contact-edit.html)
    const formContact = document.getElementById("formContact");
    if (formContact) {
        loadContactSetting();
        formContact.addEventListener("submit", handleSaveContact);
    }

    // 3. Inisialisasi Form Ganti Password (jika di halaman admin/settings.html)
    const formPassword = document.getElementById("formPassword");
    if (formPassword) {
        formPassword.addEventListener("submit", handleChangePassword);
    }

    // Event Logout Global
    const btnLogout = document.getElementById("btnLogoutSidebar");
    if (btnLogout) btnLogout.addEventListener("click", () => logoutAdmin());
});

// ==========================================
// PENGATURAN WHATSAPP
// ==========================================
async function loadWhatsAppSetting() {
    const inputPhone = document.getElementById("whatsappNumber");
    if (!inputPhone) return;

    try {
        const docRef = doc(db, "settings", "whatsapp");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            inputPhone.value = docSnap.data().phoneNumber || "";
        } else {
            inputPhone.value = "6285825319756"; // Default
        }
    } catch (error) {
        console.error("Gagal memuat setting WhatsApp:", error);
    }
}

async function handleSaveWhatsApp(e) {
    e.preventDefault();
    
    const btnSubmit = document.getElementById("btnSubmit");
    const phoneNumber = document.getElementById("whatsappNumber").value.trim();
    
    if (!phoneNumber) {
        alert("Nomor WhatsApp tidak boleh kosong!");
        return;
    }

    btnSubmit.classList.add("btn-loading");
    btnSubmit.disabled = true;

    try {
        const docRef = doc(db, "settings", "whatsapp");
        await setDoc(docRef, { 
            phoneNumber: phoneNumber,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        alert("Nomor WhatsApp berhasil disimpan!");
    } catch (error) {
        console.error("Gagal menyimpan nomor WhatsApp:", error);
        alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
        btnSubmit.classList.remove("btn-loading");
        btnSubmit.disabled = false;
    }
}

// ==========================================
// PENGATURAN HALAMAN KONTAK
// ==========================================
async function loadContactSetting() {
    try {
        const docRef = doc(db, "settings", "contact");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("contactEmail").value = data.email || "";
            document.getElementById("contactAddress").value = data.address || "";
            document.getElementById("contactHours").value = data.hours || "";
        }
    } catch (error) {
        console.error("Gagal memuat setting Contact:", error);
    }
}

async function handleSaveContact(e) {
    e.preventDefault();
    
    const btnSubmit = document.getElementById("btnSubmit");
    const email = document.getElementById("contactEmail").value.trim();
    const address = document.getElementById("contactAddress").value.trim();
    const hours = document.getElementById("contactHours").value.trim();

    btnSubmit.classList.add("btn-loading");
    btnSubmit.disabled = true;

    try {
        const docRef = doc(db, "settings", "contact");
        await setDoc(docRef, { 
            email,
            address,
            hours,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        alert("Informasi kontak berhasil disimpan!");
    } catch (error) {
        console.error("Gagal menyimpan informasi kontak:", error);
        alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
        btnSubmit.classList.remove("btn-loading");
        btnSubmit.disabled = false;
    }
}

// ==========================================
// PENGATURAN AKUN (GANTI PASSWORD)
// ==========================================
async function handleChangePassword(e) {
    e.preventDefault();
    
    const btnSubmit = document.getElementById("btnSubmit");
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    
    if (newPassword.length < 6) {
        alert("Password minimal harus 6 karakter!");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("Konfirmasi password tidak cocok!");
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        alert("Anda belum login!");
        return;
    }

    btnSubmit.classList.add("btn-loading");
    btnSubmit.disabled = true;

    try {
        await updatePassword(user, newPassword);
        alert("Password berhasil diubah! Silakan login kembali dengan password baru.");
        document.getElementById("formPassword").reset();
        logoutAdmin(); // Paksa login ulang untuk keamanan
    } catch (error) {
        console.error("Gagal ganti password:", error);
        if (error.code === 'auth/requires-recent-login') {
            alert("Sesi Anda sudah terlalu lama. Silakan logout dan login kembali sebelum mengganti password.");
        } else {
            alert("Gagal mengganti password. Coba lagi nanti.");
        }
    } finally {
        btnSubmit.classList.remove("btn-loading");
        btnSubmit.disabled = false;
    }
}

