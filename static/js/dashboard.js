// Simulasi analisis sentimen sederhana
document.getElementById('description').addEventListener('input', function() {
    const text = this.value.toLowerCase();
    let priority = 'low';
    
    // Kata kunci untuk setiap tingkat prioritas
    const urgentKeywords = ['kebakaran', 'kecelakaan', 'darurat', 'mendesak', 'bahaya', 'tewas', 'luka', 'kritis'];
    const highKeywords = ['rusak parah', 'mengganggu', 'penting', 'segera', 'mogok', 'macet total', 'banjir'];
    const mediumKeywords = ['perlu perbaikan', 'gangguan', 'kurang', 'lubang', 'kotor', 'sampah menumpuk'];
    
    // Cek kata kunci untuk menentukan prioritas
    if (urgentKeywords.some(keyword => text.includes(keyword))) {
        priority = 'urgent';
    } else if (highKeywords.some(keyword => text.includes(keyword))) {
        priority = 'high';
    } else if (mediumKeywords.some(keyword => text.includes(keyword))) {
        priority = 'medium';
    }
    
    // Reset semua indikator
    document.querySelectorAll('.priority-item').forEach(item => {
        item.classList.remove('priority-active');
    });
    
    // Highlight indikator yang sesuai
    const activeIndicator = document.querySelector(`.priority-${priority}`);
    activeIndicator.classList.add('priority-active');
});

// Form submission
document.getElementById('complaintForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Ambil nilai prioritas aktif
    const activePriority = document.querySelector('.priority-active');
    const priorityText = activePriority ? activePriority.textContent : 'Rendah';
    
    // Tampilkan konfirmasi
    alert(`Pengaduan Anda telah berhasil dikirim dengan prioritas: ${priorityText}.\n\nAnda akan menerima notifikasi melalui WhatsApp mengenai status pengaduan Anda.`);
    
    // Reset form
    this.reset();
    
    // Reset indikator prioritas
    document.querySelectorAll('.priority-item').forEach(item => {
        item.classList.remove('priority-active');
    });
    document.querySelector('.priority-low').classList.add('priority-active');
});

// Set default priority
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.priority-low').classList.add('priority-active');
});