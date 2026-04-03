/* js/main.js */
import { db } from "./firebase-config.js";
import {
    collection, getDocs, doc, getDoc,
    query, orderBy, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { sendToWhatsApp } from "./whatsapp.js";

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {

    // Halaman index.html
    if (document.getElementById("gamesGrid")) {
        loadBanners();
        loadGames();
        initSearch();
    }

    // Halaman detail-game.html
    if (document.getElementById("gameName")) {
        loadGameDetail();
        initOrderButton();
    }

});

/* ══════════════════════════════════════
   LOAD BANNER (index.html)
══════════════════════════════════════ */
async function loadBanners() {
    const track = document.getElementById("bannerTrack");
    if (!track) return;

    try {
        let snapshot;
        try {
            const q = query(collection(db, "banners"), orderBy("order", "asc"));
            snapshot = await getDocs(q);
        } catch (_) {
            snapshot = await getDocs(collection(db, "banners"));
        }

        if (snapshot.empty) {
            track.innerHTML = `
                <div class="banner-slide">
                    <div class="banner-slide-overlay">
                        <h2 class="banner-slide-title">Naufal Gaming Studio</h2>
                    </div>
                </div>`;
            return;
        }

        let slides = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.isActive !== false) slides.push(data);
        });

        if (slides.length === 0) return;

        track.innerHTML = slides.map(data => `
            <div class="banner-slide">
                ${data.imageUrl
                    ? `<img src="${data.imageUrl}" alt="${data.title || 'Banner'}"
                           style="width:100%;height:100%;object-fit:cover;"
                           onerror="this.style.display='none'">`
                    : ''}
                <div class="banner-slide-overlay">
                    <h2 class="banner-slide-title">${data.title || ''}</h2>
                </div>
            </div>`
        ).join("");

        const dotsEl = document.getElementById("bannerDots");
        if (dotsEl && slides.length > 1) {
            dotsEl.innerHTML = slides.map((_, i) =>
                `<span class="banner-dot${i === 0 ? ' active' : ''}" data-index="${i}"></span>`
            ).join("");
        }

        if (slides.length > 1) initSlider();

    } catch (error) {
        console.error("Gagal memuat banner:", error);
    }
}

function initSlider() {
    const track    = document.getElementById("bannerTrack");
    const slideEls = track ? track.querySelectorAll(".banner-slide") : [];
    const dots     = document.querySelectorAll(".banner-dot");
    const btnPrev  = document.querySelector(".banner-nav-btn.prev");
    const btnNext  = document.querySelector(".banner-nav-btn.next");

    if (slideEls.length === 0) return;

    let current = 0;
    const total = slideEls.length;

    function showSlide(index) {
        current = (index + total) % total;
        if (track) track.style.transform = `translateX(-${current * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle("active", i === current));
    }

    if (btnPrev) btnPrev.addEventListener("click", () => showSlide(current - 1));
    if (btnNext) btnNext.addEventListener("click", () => showSlide(current + 1));
    dots.forEach(dot => {
        dot.addEventListener("click", () => showSlide(parseInt(dot.dataset.index)));
    });

    setInterval(() => showSlide(current + 1), 4000);
}

/* ══════════════════════════════════════
   LOAD DAFTAR GAME (index.html)
══════════════════════════════════════ */
async function loadGames() {
    const container = document.getElementById("gamesGrid");
    if (!container) return;

    try {
        let snapshot;
        try {
            const q = query(collection(db, "games"), orderBy("order", "asc"));
            snapshot = await getDocs(q);
        } catch (_) {
            snapshot = await getDocs(collection(db, "games"));
        }

        if (snapshot.empty) {
            container.innerHTML = `<p class="text-muted" style="grid-column:1/-1;text-align:center;">Belum ada game tersedia.</p>`;
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
                            <img src="${data.iconUrl || ''}" alt="${data.name}"
                                onerror="this.src='https://placehold.co/120x120?text=Game'">
                        </div>
                        <div class="game-card-name">${data.name}</div>
                    </a>`;
            }
        });

        container.innerHTML = html || `<p class="text-muted" style="grid-column:1/-1;text-align:center;">Belum ada game aktif.</p>`;

    } catch (error) {
        console.error("Gagal memuat game:", error);
        container.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#ef4444;">Gagal memuat game.</p>`;
    }
}

/* ══════════════════════════════════════
   SEARCH (index.html)
══════════════════════════════════════ */
function initSearch() {
    const searchInput = document.getElementById("searchInput");
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
   LOAD DETAIL GAME (detail-game.html)
══════════════════════════════════════ */
async function loadGameDetail() {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (!gameId) {
        window.location.href = "index.html";
        return;
    }

    try {
        const docSnap = await getDoc(doc(db, "games", gameId));

        if (!docSnap.exists()) {
            window.location.href = "index.html";
            return;
        }

        const data = docSnap.data();

        // Simpan nama game untuk dipakai tombol WA
        window.currentGameName = data.name || "Game";

        const nameEl  = document.getElementById("gameName");
        const iconEl  = document.getElementById("gameIcon");
        const descEl  = document.getElementById("gameDesc");
        const titleEl = document.querySelector("title");

        if (nameEl)  nameEl.innerText  = data.name || "Game";
        if (iconEl)  iconEl.src        = data.iconUrl || "";
        if (descEl)  descEl.innerText  = data.description || "Top up cepat, aman, dan terpercaya.";
        if (titleEl) titleEl.innerText = `Top Up ${data.name} | Naufal Gaming`;

        await loadProducts(gameId);

    } catch (error) {
        console.error("Gagal memuat detail game:", error);
    }
}

/* ══════════════════════════════════════
   LOAD PRODUK (detail-game.html)
══════════════════════════════════════ */
async function loadProducts(gameId) {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;

    grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1;">Memuat produk...</p>`;

    try {
        const q        = query(collection(db, "products"), where("gameId", "==", gameId));
        const snapshot = await getDocs(q);

        const docs = [];
        snapshot.forEach(d => docs.push({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (a.order || 0) - (b.order || 0));

        const aktif = docs.filter(p => p.isActive !== false);

        if (aktif.length === 0) {
            grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1;">Belum ada produk untuk game ini.</p>`;
            return;
        }

        grid.innerHTML = aktif.map(p => `
            <div class="product-card"
                 data-id="${p.id}"
                 data-name="${p.name}"
                 data-price="${p.price}">
                ${p.iconUrl
                    ? `<img src="${p.iconUrl}" class="product-card-icon" alt="${p.name}">`
                    : `<span style="font-size:28px;">💎</span>`}
                <div class="product-card-info">
                    <h4 class="product-card-name">${p.name}</h4>
                    <span class="product-card-price">Rp ${parseInt(p.price).toLocaleString('id-ID')}</span>
                </div>
            </div>`
        ).join("");

        attachProductListeners();

    } catch (error) {
        console.error("Error memuat produk:", error);
        grid.innerHTML = `<p style="grid-column:1/-1;color:#ef4444;">Gagal memuat produk: ${error.message}</p>`;
    }
}

/* ══════════════════════════════════════
   PILIH PRODUK
══════════════════════════════════════ */
function attachProductListeners() {
    const cards = document.querySelectorAll(".product-card");
    cards.forEach(card => {
        card.addEventListener("click", () => {
            cards.forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");

            window.selectedProduct = {
                id    : card.dataset.id,
                name  : card.dataset.name,
                price : card.dataset.price
            };

            const summaryName  = document.getElementById("summaryProductName");
            const summaryPrice = document.getElementById("summaryProductPrice");
            if (summaryName)  summaryName.innerText = card.dataset.name;
            if (summaryPrice) summaryPrice.innerText =
                "Rp " + parseInt(card.dataset.price).toLocaleString('id-ID');
        });
    });
}

/* ══════════════════════════════════════
   TOMBOL PESAN VIA WHATSAPP
   — ini yang sebelumnya tidak ada sama sekali
══════════════════════════════════════ */
function initOrderButton() {
    const btnOrder = document.getElementById("btnOrder");
    if (!btnOrder) return;

    btnOrder.addEventListener("click", () => {
        const userId  = document.getElementById("userId")?.value.trim();
        const zoneId  = document.getElementById("zoneId")?.value.trim();
        const product = window.selectedProduct;
        const game    = window.currentGameName || "Game";

        // Validasi user ID
        if (!userId) {
            alert("⚠️ Masukkan ID Pemain terlebih dahulu!");
            document.getElementById("userId")?.focus();
            return;
        }

        // Validasi produk dipilih
        if (!product) {
            alert("⚠️ Pilih nominal top up terlebih dahulu!");
            return;
        }

        // Gabungkan userId + zoneId kalau ada
        const fullUserId = zoneId ? `${userId} (Zone: ${zoneId})` : userId;

        // Nomor WA admin — sesuai whatsapp.js fallback
        const adminPhone = "6285825319756";

        // Kirim ke WA
        sendToWhatsApp(adminPhone, game, fullUserId, product.name);
    });
}
