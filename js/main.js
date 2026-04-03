async function loadProducts(gameId) {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;
    try {
        const q = query(collection(db, "products"), where("gameId", "==", gameId));
        const snapshot = await getDocs(q);
        
        const docs = []; 
        snapshot.forEach(d => docs.push({id: d.id, ...d.data()})); 
        docs.sort((a,b) => (a.order||0) - (b.order||0));

        let productsHTML = "";
        docs.forEach(p => {
            if(p.isActive !== false) {
                productsHTML += `<div class="product-card" data-id="${p.id}" data-name="${p.name}">${p.iconUrl ? `<img src="${p.iconUrl}" class="product-card-icon" alt="${p.name}">` : ''}<div class="product-card-info"><h4 class="product-card-name">${p.name}</h4><span class="product-card-price">Rp ${p.price.toLocaleString('id-ID')}</span></div></div>`;
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
