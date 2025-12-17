// status.js - Halaman status pengaduan user

document.addEventListener("DOMContentLoaded", () => {
  loadUserComplaints()

  // Search button click
  document.getElementById("searchBtn").addEventListener("click", searchComplaint)

  // Enter key pada input search
  document.getElementById("searchInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchComplaint()
    }
  })
})

// Load pengaduan user yang login
async function loadUserComplaints() {
  const complaintList = document.getElementById("complaintList")

  try {
    const response = await fetch("/api/user/complaints")
    const data = await response.json()

    if (data.success && data.complaints.length > 0) {
      renderComplaints(data.complaints)
    } else {
      complaintList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Anda belum memiliki pengaduan</p>
                    <a href="/home" class="btn">Buat Pengaduan Baru</a>
                </div>
            `
    }
  } catch (error) {
    console.error("Error loading complaints:", error)
    complaintList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Gagal memuat data. Silakan login terlebih dahulu.</p>
                <a href="/login" class="btn">Login</a>
            </div>
        `
  }
}

// Search pengaduan berdasarkan ID
async function searchComplaint() {
  const searchTerm = document.getElementById("searchInput").value.trim()

  if (!searchTerm) {
    showNotification("Masukkan ID laporan atau nomor telepon", "error")
    return
  }

  try {
    const response = await fetch(`/api/complaints/search?q=${encodeURIComponent(searchTerm)}`)
    const data = await response.json()

    if (data.success && data.complaints.length > 0) {
      renderComplaints(data.complaints)
    } else {
      document.getElementById("complaintList").innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>Tidak ditemukan pengaduan dengan ID: ${searchTerm}</p>
                </div>
            `
    }
  } catch (error) {
    console.error("Error searching:", error)
    showNotification("Gagal mencari data", "error")
  }
}

// Render daftar pengaduan
function renderComplaints(complaints) {
  const complaintList = document.getElementById("complaintList")

  complaintList.innerHTML = complaints
    .map((complaint) => {
      const priorityClass = complaint.priority.toLowerCase().replace(" ", "-")
      const statusClass = complaint.status.toLowerCase()

      // Status progress
      const statusProgress = {
        Diterima: 1,
        Diproses: 2,
        Selesai: 3,
      }
      const progress = statusProgress[complaint.status] || 1

      return `
            <div class="complaint-card">
                <div class="complaint-header">
                    <span class="complaint-id">${complaint.id}</span>
                    <span class="complaint-date">${formatDate(complaint.date)}</span>
                </div>
                
                <div class="complaint-body">
                    <div class="complaint-info">
                        <span class="info-label">Kategori:</span>
                        <span class="info-value">${complaint.category}</span>
                    </div>
                    <div class="complaint-info">
                        <span class="info-label">Lokasi:</span>
                        <span class="info-value">${complaint.location}</span>
                    </div>
                    <div class="complaint-info">
                        <span class="info-label">Deskripsi:</span>
                        <span class="info-value">${complaint.description}</span>
                    </div>
                </div>
                
                <div class="complaint-footer">
                    <div class="badges">
                        <span class="priority-badge priority-${priorityClass}">${complaint.priority}</span>
                        <span class="status-badge status-${statusClass}">${complaint.status}</span>
                    </div>
                    
                    <div class="progress-tracker">
                        <div class="progress-step ${progress >= 1 ? "active" : ""}">
                            <div class="step-icon"><i class="fas fa-inbox"></i></div>
                            <span>Diterima</span>
                        </div>
                        <div class="progress-line ${progress >= 2 ? "active" : ""}"></div>
                        <div class="progress-step ${progress >= 2 ? "active" : ""}">
                            <div class="step-icon"><i class="fas fa-cog"></i></div>
                            <span>Diproses</span>
                        </div>
                        <div class="progress-line ${progress >= 3 ? "active" : ""}"></div>
                        <div class="progress-step ${progress >= 3 ? "active" : ""}">
                            <div class="step-icon"><i class="fas fa-check"></i></div>
                            <span>Selesai</span>
                        </div>
                    </div>
                </div>
                
                ${
                  complaint.admin_notes
                    ? `
                <div class="admin-notes">
                    <strong>Catatan Admin:</strong> ${complaint.admin_notes}
                </div>
                `
                    : ""
                }
            </div>
        `
    })
    .join("")
}

// Format tanggal
function formatDate(dateString) {
  if (!dateString) return "-"
  const options = {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
  return new Date(dateString).toLocaleDateString("id-ID", options)
}

// Notifikasi
function showNotification(message, type = "info") {
  const existingNotif = document.querySelector(".notification")
  if (existingNotif) existingNotif.remove()

  const notification = document.createElement("div")
  notification.className = `notification notification-${type}`

  const colorMap = {
    success: "#4CAF50",
    error: "#f44336",
    info: "#2196F3",
  }

  notification.innerHTML = `
        <i class="fas fa-${type === "error" ? "exclamation" : "info"}-circle"></i>
        <span>${message}</span>
    `

  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        border-left: 4px solid ${colorMap[type]};
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 1001;
    `

  document.body.appendChild(notification)

  setTimeout(() => notification.remove(), 3000)
}
