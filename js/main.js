/* js/main.js */
import { db } from "./firebase-config.js";
import { collection, getDocs, doc, getDoc, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { sendToWhatsApp } from "./whatsapp.js";

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    if (path.includes("index.html") || path === "/" || path === "") {
        initHome();
    } else if (path.includes("detail-game.html")) {
        initDetailGame();
    }
});

// ==========================================
// HOME PAGE LOGIC
// ==========================================
async function initHome() {
    await loadBanners();
    await loadGames();
    initSearch();
}

async function loadBanners() {
    const bannerTrack = document.querySelector(".banner-track");
    const bannerDots = document.querySelector(".banner-dots");
    if (!bannerTrack || !bannerDots) return;

    try {
        const q = query(collection(db, "banners"), orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        
        bannerTrack.innerHTML = "";
        bannerDots.innerHTML = "";

        if (snapshot.empty) return;

        let slidesHTML = "";
        let dotsHTML = "";
        
        snapshot.forEach((doc, index) => {
            const data = doc.data();
            if(data.isActive !== false) {
                slidesHTML += `
                    <div class="banner-slide">
                        <img src="${data.imageUrl}" alt="${data.title}">
                        <div class="banner-slide-overlay">
                            <span class="banner-slide-tag">PROMO</span>
                            <h2 class="banner-slide-title">${data.title}</h2>
                            <p class="banner-slide-subtitle">${data.subtitle || ''}</p>
                        </div>
                    </div>
                `;
                dotsHTML += `<div class="banner-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`;
            }
        });

        bannerTrack.innerHTML = slidesHTML;
        bannerDots.innerHTML = dotsHTML;

        initSlider();
    } catch (error) {
        console.error("Error loading banners:", error);
    }
}

function initSlider() {
    const track = document.querySelector(".banner-track");
    const slides = document.querySelectorAll(".banner-slide");
    const dots = document.querySelectorAll(".banner-dot");
    const prevBtn = document.querySelector(".banner-nav-btn.prev");
    const nextBtn = document.querySelector(".banner-nav-btn.next");
    
    if(!track || slides.length === 0) return;

    let currentIndex = 0;
    let slideInterval;

    const updateSlider = () => {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach(dot => dot.classList.remove("active"));
        if(dots[currentIndex]) dots[currentIndex].classList.add("active");
    };

    const nextSlide = () => {
        currentIndex = (currentIndex + 1) % slides.length;
        updateSlider();
    };

    const prevSlide = () => {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        updateSlider();
    };

    if (nextBtn) nextBtn.addEventListener("click", () => { nextSlide(); resetInterval(); });
    if (prevBtn) prevBtn.addEventListener("click", () => { prevSlide(); resetInterval(); });

    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            currentIndex = index;
            updateSlider();
            resetInterval();
        });
    });

    const startInterval = () => { slideInterval = setInterval(nextSlide, 5000); };
    const resetInterval = () => { clearInterval(slideInterval); startInterval(); };

    startInterval();
}

let allGames = [];
async function loadGames() {
    const grid = document.querySelector("#gamesGrid");
    if (!grid) return;

    try {
        const q = query(collection(db, "games"), orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        
        allGames = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if(data.isActive !== false) {
                allGames.push({ id: doc.id, ...data });
            }
        });

        renderGames(allGames);
    } catch (error) {
        console.error("Error loading games:", error);
    }
}

function renderGames(games) {
    const grid = document.querySelector("#gamesGrid");
    if (!grid) return;

    if (games.length === 0) {
        grid.innerHTML = `<p class="text-muted" style="grid-column: 1/-1; text-align: center;">Tidak ada game ditemukan.</p>`;
        return;
    }

    grid.innerHTML = games.map(game => `
        <a href="detail-game.html?id=${game.id}" class="game-card">
            <img src="${game.iconUrl}" alt="${game.name}" class="game-card-icon">
            <h3 class="game-card-name">${game.name}</h3>
            <span class="game-card-category">${game.category || 'Game'}</span>
        </a>
    `).join("");
}

function initSearch() {
    const searchInput = document.querySelector("#searchInput");
    if (!searchInput) return;

    searchInput.addEventListener("input", (e) => {
        const keyword = e.target.value.toLowerCase();
        const filteredGames = allGames.filter(game => 
            game.name.toLowerCase().includes(keyword) || 
            (game.category && game.category.toLowerCase().includes(keyword))
        );
        renderGames(filteredGames);
    });
}


// ==========================================
// DETAIL GAME PAGE LOGIC
// ==========================================
let currentGame = null;
let selectedProduct = null;

async function initDetailGame() {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('id');

    if (!gameId) {
        alert("Game tidak ditemukan!");
        window.location.href = "index.html";
        return;
    }

    await loadGameDetail(gameId);
    await loadProducts(gameId);
    initOrderForm();
}

async function loadGameDetail(gameId) {
    try {
        const docRef = doc(db, "games", gameId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentGame = docSnap.data();
            document.getElementById("gameName").textContent = currentGame.name;
            document.getElementById("gameIcon").src = currentGame.iconUrl;
            document.getElementById("gameDesc").textContent = currentGame.description || "Top up diamond dan item game dengan aman dan cepat.";
        } else {
            alert("Game tidak ditemukan!");
            window.location.href = "index.html";
        }
    } catch (error) {
        console.error("Error fetching game detail:", error);
    }
}

async function loadProducts(gameId) {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;

    try {
        const q = query(collection(db, "products"), where("gameId", "==", gameId), orderBy("order", "asc"));
        const snapshot = await getDocs(q);

        let productsHTML = "";
        snapshot.forEach(doc => {
            const p = doc.data();
            if(p.isActive !== false) {
                productsHTML += `
                    <div class="product-card" data-id="${doc.id}" data-name="${p.name}">
                        ${p.iconUrl ? `<img src="${p.iconUrl}" class="product-card-icon" alt="${p.name}">` : ''}
                        <div class="product-card-info">
                            <h4 class="product-card-name">${p.name}</h4>
                            <span class="product-card-price">Rp ${p.price.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                `;
            }
        });

        if(productsHTML === "") {
            grid.innerHTML = `<p class="text-muted">Belum ada produk untuk game ini.</p>`;
        } else {
            grid.innerHTML = productsHTML;
            attachProductListeners();
        }
    } catch (error) {
        console.error("Error fetching products:", error);
    }
}

function attachProductListeners() {
    const cards = document.querySelectorAll(".product-card");
    cards.forEach(card => {
        card.addEventListener("click", () => {
            cards.forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
            selectedProduct = card.getAttribute("data-name");
        });
    });
}

function initOrderForm() {
    const orderBtn = document.getElementById("btnOrder");
    if (!orderBtn) return;

    orderBtn.addEventListener("click", async () => {
        const userIdInput = document.getElementById("userId");
        const zoneIdInput = document.getElementById("zoneId"); // Optional/depending on game

        const userId = userIdInput ? userIdInput.value.trim() : "";
        const zoneId = zoneIdInput ? zoneIdInput.value.trim() : "";

        // Validasi
        if (!userId && !zoneId) {
            alert("Harap isi ID Game / User ID!");
            return;
        }

        if (!selectedProduct) {
            alert("Harap pilih produk/nominal top up!");
            return;
        }

        const fullId = zoneId ? `${userId} (${zoneId})` : userId;

        // Ambil nomor WA admin dari Settings
        let targetPhone = "6285825319756"; // Default
        try {
            const settingsDoc = await getDoc(doc(db, "settings", "whatsapp"));
            if(settingsDoc.exists()) {
                targetPhone = settingsDoc.data().phoneNumber || targetPhone;
            }
        } catch(e) {
            console.error("Gagal load setting WA:", e);
        }

        sendToWhatsApp(targetPhone, currentGame.name, fullId, selectedProduct);
    });
}

