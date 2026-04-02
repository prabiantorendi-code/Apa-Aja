/* js/whatsapp.js */

export function formatWhatsAppMessage(gameName, userId, productName) {
    const message = `Halo Admin, saya ingin top up:

Game: ${gameName}
ID / User ID: ${userId}
Nominal: ${productName}

Mohon diproses ya, terima kasih.`;

    return encodeURIComponent(message);
}

export function getWhatsAppLink(phoneNumber, message) {
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
    }

    return `https://wa.me/${formattedPhone}?text=${message}`;
}

export function sendToWhatsApp(phoneNumber, gameName, userId, productName) {
    const targetPhone = phoneNumber || "6285825319756"; 
    const messageEncoded = formatWhatsAppMessage(gameName, userId, productName);
    const waLink = getWhatsAppLink(targetPhone, messageEncoded);
    
    window.open(waLink, '_blank');
}

