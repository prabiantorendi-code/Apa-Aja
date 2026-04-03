/* js/main.js */
import { db } from "./firebase-config.js";
import {
    collection, getDocs, doc, getDoc,
    query, orderBy, where, addDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ══════════════════════════════════════
   INIT — jalankan semua saat halaman buka
══════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
    loadBanners();
    loadGames();
    initSearch();
});

/* ══════════════════════════════════════
   LOAD BANNER SLIDER
══════════════════════════════════════ */
async function loadBanners() {
    const sliderTrack = document.getElementById("bannerTrack");
    const sliderWrap  = document.getElementById("bannerSlider");
    if (!sliderTrack && !sliderWrap) return;

    const target = sliderTrack || sliderWrap;

    try {
        let snapshot;
        try {
            const q = query(collection(db, "banners"), orderBy("order", "asc"));
            snapshot = await getDocs(q);
        } catch (_) {
            snapshot = await getDocs(collection(db, "banners"));
        }

        if (snapshot.empty) {
            target.innerHTML = `<div class="banner-slide" style="display:flex;align-items:center;justify-content:center;color:#9ca3af;">Belum ada banner</div>`;
            return;
        }

        let html = "";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.isActive !== false) {
                html += `
                    <div class="banner-slide">
                        <img src="${data.imageUrl || ''}" 
                             alt="${data.title || 'Banner'}"
                             style="width:100%;height:100%;object-fit:cover;border-radius:12px;"
                             onerror="this.style.display='none'">
                        ${data.title ? `<div class="banner-caption">${data.title}</div>` : ''}
                    </div>`;
            }
        });

        target.innerHTML = html || `<div class="banner-slide" style="display:flex;align-items:center;justify-content:center;color:#9ca3af;">Belum ada banner aktif</div>`;

        // Auto slide jika lebih dari 1 banner
        const slides = target.querySelectorAll(".banner-slide");
        if (slides.length > 1) initSlider(slides);

    } catch (error) {
        console.error("Gagal memuat banner:", error);
        if (target) target.innerHTML = `<div class="banner-slide"></div>`;
    }
}

function initSlider(slides) {
    let current = 0;
    const total = slides.length;

    function showSlide(index) {
        slides.forEach((s, i) => {
            s.style.display = i === index ? "block" : "none";
        });
    }

    showSlide(0);
    setInterval(() => {
        current = (current + 1) % total;
        showSlide(current);
    }, 4000);

    // Tombol prev / next
    const btnPrev = document.getElementById("btnPrev");
    const btnNext = document.getElementById("btnNext");
    if (btnPrev) btnPrev.addEventListener("click", () => {
        current = (current - 1 + total) % total;
        showSlide(current);
    });
    if (btnNext) btnNext.addEventListener("click", () => {
        current = (current + 1) % total;
        showSlide(current);
    });
}

/* ══════════════════════════════════════
   LOAD DAFTAR GAME (Halaman Publik)
══════════════════════════════════════ */
async function loadGames() {
    // Cari elemen tampungan game — sesuaikan dengan id di index.html kamu
    const container = document.getElementById("gamesGrid")
                   || document.getElementById("gamesList")
                   || document.getElementById("popularGames")
                   || document.querySelector(".games-grid");

    if (!container) return;

    container.innerHTML = `<p style="color:#9ca3af;text-align:center;">Memuat daftar game...</p>`;

    try {
        let snapshot;
        try {
            const q = query(collection(db, "games"), orderBy("order", "asc"));
            snapshot = await getDocs(q);
        } catch (_) {
            snapshot = await getDocs(collection(db, "games"));
        }

        if (snapshot.empty) {
            container.innerHTML = `<p style="color:#9ca3af;text-align:center;">Belum ada game tersedia.</p>`;
            return;
        }

        let html = "";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id   = docSnap.id;
            if (data.isActive !== false) {
                html += `
                    <a href="detail-game.html?id=${id}" class="game-card">
                        <div class="game-card-img">
                            <img src="${data.iconUrl || ''}" 
                                 alt="${data.name}"
                                 onerror="this.src='https://placehold.co/120x120?text=Game'">
                        </div>
                        <div class="game-card-name">${data.name}</div>
                    </a>`;
            }
        });

        container.innerHTML = html || `<p style="color:#9ca3af;text-align:center;">Belum ada game aktif.</p>`;

    } catch (error) {
        console.error("Gagal memuat game:", error);
        container.innerHTML = `<p style="color:#ef4444;text-align:center;">Gagal memuat game.</p>`;
    }
}

/* ══════════════════════════════════════
   LOAD PRODUK (Halaman Detail Game)
══════════════════════════════════════ */
async function loadProducts(gameId) {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;

    grid.innerHTML = `<p style="color:#9ca3af;">Memuat produk...</p>`;

    try {
        const q = query(collection(db, "products"), where("gameId", "==", gameId));
        const snapshot = await getDocs(q);

        const docs = [];
        snapshot.forEach(d => docs.push({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (a.order || 0) - (b.order || 0));

        let productsHTML = "";
        docs.forEach(p => {
            if (p.isActive !== false) {
                productsHTML += `
                    <div class="product-card" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}">
                        ${p.iconUrl ? `<img src="${p.iconUrl}" class="product-card-icon" alt="${p.name}">` : '<span style="font-size:28px;">💎</span>'}
                        <div class="product-card-info">
                            <h4 class="product-card-name">${p.name}</h4>
                            <span class="product-card-price">Rp ${parseInt(p.price).toLocaleString('id-ID')}</span>
                        </div>
                    </div>`;
            }
        });

        if (productsHTML === "") {
            grid.innerHTML = `<p class="text-muted">Belum ada produk untuk game ini.</p>`;
        } else {
            grid.innerHTML = productsHTML;
            attachProductListeners();
        }

    } catch (error) {
        console.error("Error fetching products:", error);
        grid.innerHTML = `<p style="color:#ef4444;">Gagal memuat produk.</p>`;
    }
}

/* ══════════════════════════════════════
   PILIH PRODUK — highlight & simpan ke state
══════════════════════════════════════ */
function attachProductListeners() {
    const cards = document.querySelectorAll(".product-card");
    cards.forEach(card => {
        card.addEventListener("click", () => {
            // Hapus highlight lama
            cards.forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");

            // Simpan produk yang dipilih ke state global
            window.selectedProduct = {
                id    : card.dataset.id,
                name  : card.dataset.name,
                price : card.dataset.price
            };

            // Update ringkasan order jika ada
            const summaryName  = document.getElementById("summaryProductName");
            const summaryPrice = document.getElementById("summaryProductPrice");
            if (summaryName)  summaryName.innerText  = card.dataset.name;
            if (summaryPrice) summaryPrice.innerText  =
                "Rp " + parseInt(card.dataset.price).toLocaleString('id-ID');
        });
    });
}

/* ══════════════════════════════════════
   LOAD DETAIL GAME (Halaman detail-game.html)
══════════════════════════════════════ */
async function loadGameDetail() {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");
    if (!gameId) {
        window.location.href = "index.html";
        return;
    }

    try {
        const docRef  = doc(db, "games", gameId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            window.location.href = "index.html";
            return;
        }

        const data = docSnap.data();

        // Isi elemen halaman
        const nameEl  = document.getElementById("gameDetailName");
        const iconEl  = document.getElementById("gameDetailIcon");
        const titleEl = document.querySelector("title");

        if (nameEl)  nameEl.innerText   = data.name;
        if (iconEl)  iconEl.src         = data.iconUrl || "";
        if (titleEl) titleEl.innerText  = `Top Up ${data.name} | Naufal Gaming`;

        // Load produk untuk game ini
        loadProducts(gameId);

    } catch (error) {
        console.error("Gagal memuat detail game:", error);
    }
}

/* ══════════════════════════════════════
   SEARCH GAME
══════════════════════════════════════ */
function initSearch() {
    const searchInput = document.getElementById("searchInput")
                     || document.querySelector("input[type='search']")
                     || document.querySelector(".search-input");

    if (!searchInput) return;

    searchInput.addEventListener("input", (e) => {
        const keyword = e.target.value.toLowerCase().trim();
        const cards   = document.querySelectorAll(".game-card");

        cards.forEach(card => {
            const name = card.querySelector(".game-card-name")?.innerText.toLowerCase() || "";
            card.style.display = name.includes(keyword) ? "" : "none";
        });
    });
}

/* ══════════════════════════════════════
   EXPORT fungsi yang dipakai halaman lain
══════════════════════════════════════ */
export { loadGameDetail, loadProducts };
