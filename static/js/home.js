// home.js - Frontend untuk form pengaduan dengan analisis sentimen realtime

let currentSentiment = "Tidak Diketahui"
let currentPriority = "Rendah"
let debounceTimer = null

// Analisis sentimen real-time saat user mengetik
document.getElementById("description").addEventListener("input", function () {
  const text = this.value

  // Debounce untuk menghindari terlalu banyak request
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    analyzeText(text)
  }, 500)
})

// Fungsi untuk menganalisis teks via API backend
async function analyzeText(text) {
  if (text.length < 10) {
    updatePriorityIndicator("Rendah")
    return
  }

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: text }),
    })

    const result = await response.json()
    currentSentiment = result.sentiment
    currentPriority = result.priority

    updatePriorityIndicator(result.priority)
    updateSentimentDisplay(result.sentiment, result.confidence)
  } catch (error) {
    console.error("Error analyzing text:", error)
    // Fallback ke analisis lokal jika API gagal
    localAnalysis(text)
  }
}

// Fallback analisis lokal jika API tidak tersedia
function localAnalysis(text) {
  text = text.toLowerCase()
  let priority = "Rendah"

  const urgentKeywords = ["kebakaran", "kecelakaan", "darurat", "mendesak", "bahaya", "tewas", "luka", "kritis"]
  const highKeywords = ["rusak parah", "mengganggu", "penting", "segera", "mogok", "macet total", "banjir"]
  const mediumKeywords = ["perlu perbaikan", "gangguan", "kurang", "lubang", "kotor", "sampah menumpuk"]

  if (urgentKeywords.some((keyword) => text.includes(keyword))) {
    priority = "Sangat Mendesak"
  } else if (highKeywords.some((keyword) => text.includes(keyword))) {
    priority = "Tinggi"
  } else if (mediumKeywords.some((keyword) => text.includes(keyword))) {
    priority = "Sedang"
  }

  currentPriority = priority
  updatePriorityIndicator(priority)
}

// Update tampilan indikator prioritas
function updatePriorityIndicator(priority) {
  const priorityMap = {
    "Sangat Mendesak": "urgent",
    Tinggi: "high",
    Sedang: "medium",
    Rendah: "low",
  }

  // Reset semua indikator
  document.querySelectorAll(".priority-item").forEach((item) => {
    item.classList.remove("priority-active")
  })

  // Highlight indikator yang sesuai
  const priorityClass = priorityMap[priority] || "low"
  const activeIndicator = document.querySelector(`.priority-${priorityClass}`)
  if (activeIndicator) {
    activeIndicator.classList.add("priority-active")
  }
}

// Update tampilan sentimen (opsional - jika ada elemen untuk menampilkan)
function updateSentimentDisplay(sentiment, confidence) {
  const sentimentInfo = document.querySelector(".sentiment-info")
  if (sentimentInfo && sentiment !== "Tidak Diketahui") {
    sentimentInfo.innerHTML = `
            <i class="fas fa-brain"></i>
            Analisis: <strong>${sentiment}</strong> (${confidence.toFixed(1)}% confidence) - 
            Prioritas: <strong>${currentPriority}</strong>
        `
  }
}

// Form submission
document.getElementById("complaintForm").addEventListener("submit", async function (e) {
  e.preventDefault()

  const category = document.getElementById("category").value
  const location = document.getElementById("location").value
  const description = document.getElementById("description").value

  if (!category || !location || !description) {
    showNotification("Semua field harus diisi!", "error")
    return
  }

  // Tampilkan loading
  const submitBtn = this.querySelector('button[type="submit"]')
  const originalText = submitBtn.innerHTML
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...'
  submitBtn.disabled = true

  try {
    const response = await fetch("/api/complaints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: category,
        location: location,
        description: description,
      }),
    })

    const result = await response.json()

    if (result.success) {
      // Tampilkan hasil sukses
      showSuccessModal(result.data)

      // Reset form
      this.reset()
      updatePriorityIndicator("Rendah")

      // Reset sentiment info
      const sentimentInfo = document.querySelector(".sentiment-info")
      if (sentimentInfo) {
        sentimentInfo.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    Sistem akan menganalisis deskripsi Anda secara otomatis untuk menentukan prioritas penanganan.
                `
      }
    } else {
      showNotification(result.message || "Gagal mengirim pengaduan", "error")
    }
  } catch (error) {
    console.error("Error submitting complaint:", error)
    showNotification("Terjadi kesalahan. Silakan coba lagi.", "error")
  } finally {
    submitBtn.innerHTML = originalText
    submitBtn.disabled = false
  }
})

// Tampilkan modal sukses
function showSuccessModal(data) {
  // Hapus modal lama jika ada
  const existingModal = document.querySelector(".success-modal")
  if (existingModal) existingModal.remove()

  const modal = document.createElement("div")
  modal.className = "success-modal"

  const priorityClass = data.priority.toLowerCase().replace(" ", "-")

  modal.innerHTML = `
        <div class="success-modal-content">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>Pengaduan Berhasil Dikirim!</h3>
            <div class="success-details">
                <p><strong>ID Laporan:</strong> ${data.complaint_id}</p>
                <p><strong>Prioritas:</strong> <span class="priority-badge priority-${priorityClass}">${data.priority}</span></p>
                <p><strong>Sentimen:</strong> ${data.sentiment} (${data.confidence}%)</p>
            </div>
            <p class="success-note">
                <i class="fab fa-whatsapp"></i> Notifikasi telah dikirim ke WhatsApp Anda.
            </p>
            <button onclick="closeSuccessModal()" class="btn">Tutup</button>
        </div>
    `

  // Styles untuk modal
  modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `

  document.body.appendChild(modal)
}

function closeSuccessModal() {
  const modal = document.querySelector(".success-modal")
  if (modal) {
    modal.remove()
  }
}

// Notifikasi toast
function showNotification(message, type = "info") {
  // Hapus notifikasi lama
  const existingNotif = document.querySelector(".notification")
  if (existingNotif) existingNotif.remove()

  const notification = document.createElement("div")
  notification.className = `notification notification-${type}`

  const iconMap = {
    success: "check-circle",
    error: "exclamation-circle",
    info: "info-circle",
  }

  notification.innerHTML = `
        <i class="fas fa-${iconMap[type] || "info-circle"}"></i>
        <span>${message}</span>
    `

  const colorMap = {
    success: "#4CAF50",
    error: "#f44336",
    info: "#2196F3",
  }

  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        border-left: 4px solid ${colorMap[type] || colorMap.info};
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
    `

  document.body.appendChild(notification)

  // Auto remove setelah 3 detik
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove()
    }
  }, 3000)
}

// Set default priority saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  const lowPriority = document.querySelector(".priority-low")
  if (lowPriority) {
    lowPriority.classList.add("priority-active")
  }
})
