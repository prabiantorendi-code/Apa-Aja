/* js/auth.js */
import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

export function checkAuthState(requireAuth = false, redirectUrl = "login.html") {
    onAuthStateChanged(auth, (user) => {
        const currentPath = window.location.pathname;
        
        if (requireAuth && !user) {
            window.location.href = redirectUrl;
        } else if (!requireAuth && user && currentPath.includes("login.html")) {
            window.location.href = "dashboard.html";
        }
    });
}

export async function loginAdmin(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Error kode:", error.code);
        let message = "Terjadi kesalahan saat login.";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            message = "Email atau password salah!";
        } else if (error.code === 'auth/invalid-email') {
            message = "Format email tidak valid!";
        }
        return { success: false, message: message };
    }
}

export async function logoutAdmin(redirectUrl = "login.html") {
    try {
        await signOut(auth);
        window.location.href = redirectUrl;
    } catch (error) {
        console.error("Error logout:", error);
        alert("Gagal logout. Silakan coba lagi.");
    }
}

