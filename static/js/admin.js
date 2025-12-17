// admin.js - Dashboard Admin dengan data dari API

let currentPage = 1
const itemsPerPage = 10
let allComplaints = []
let filteredComplaints = []

// Initialize dashboard saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  updateCurrentTime()
  loadDashboardData()
  setInterval(updateCurrentTime, 60000) // Update waktu setiap menit
})

// Update waktu saat ini
function updateCurrentTime() {
  const now = new Date()
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }
  const timeElement = document.getElementById("currentTime")
  if (timeElement) {
    timeElement.textContent = now.toLocaleDateString("id-ID", options)
  }
}

// Load data dari API
async function loadDashboardData() {
  try {
    const response = await fetch("/api/admin/complaints")
    const data = await response.json()

    if (data.success) {
      allComplaints = data.complaints
      filteredComplaints = [...allComplaints]

      updateStatistics()
      renderComplaintsTable()
    } else {
      showNotification(data.message || "Gagal memuat data", "error")
    }
  } catch (error) {
    console.error("Error loading dashboard data:", error)
    showNotification("Gagal memuat data dari server", "error")
  }
}

// Update statistik cards
function updateStatistics() {
  const total = allComplaints.length
  const pending = allComplaints.filter((c) => c.status === "Diterima").length
  const processed = allComplaints.filter((c) => c.status === "Diproses").length
  const completed = allComplaints.filter((c) => c.status === "Selesai").length

  document.getElementById("totalComplaints").textContent = total
  document.getElementById("pendingComplaints").textContent = pending
  document.getElementById("processedComplaints").textContent = processed
  document.getElementById("completedComplaints").textContent = completed
}

// Render tabel pengaduan
function renderComplaintsTable() {
  const tableBody = document.getElementById("complaintsTableBody")
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentComplaints = filteredComplaints.slice(startIndex, endIndex)

  tableBody.innerHTML = ""

  if (currentComplaints.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; display: block; color: #ccc;"></i>
                    Tidak ada laporan yang ditemukan
                </td>
            </tr>
        `
    return
  }

  currentComplaints.forEach((complaint) => {
    const row = document.createElement("tr")

    const priorityClass = complaint.priority.toLowerCase().replace(" ", "-")
    const sentimentClass = complaint.sentiment ? complaint.sentiment.toLowerCase() : "unknown"
    const statusClass = complaint.status.toLowerCase()

    row.innerHTML = `
            <td>${complaint.id}</td>
            <td>${formatDate(complaint.date)}</td>
            <td>${complaint.name}</td>
            <td>${complaint.category}</td>
            <td><span class="priority-badge priority-${priorityClass}">${complaint.priority}</span></td>
            <td><span class="sentiment-badge sentiment-${sentimentClass}">${complaint.sentiment || "N/A"}</span></td>
            <td><span class="status-badge status-${statusClass}">${complaint.status}</span></td>
            <td>
                <button class="btn-action-small btn-view" onclick="viewComplaint('${complaint.id}')" title="Lihat Detail">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action-small btn-edit" onclick="updateComplaintStatus('${complaint.id}')" title="Update Status">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `

    tableBody.appendChild(row)
  })

  renderPagination()
}

// Render pagination
function renderPagination() {
  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage)
  const pagination = document.getElementById("pagination")

  pagination.innerHTML = ""

  if (totalPages <= 1) return

  // Tombol Previous
  const prevButton = document.createElement("button")
  prevButton.className = "page-btn"
  prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>'
  prevButton.disabled = currentPage === 1
  prevButton.onclick = () => changePage(currentPage - 1)
  pagination.appendChild(prevButton)

  // Nomor halaman
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button")
    pageButton.className = `page-btn ${i === currentPage ? "active" : ""}`
    pageButton.textContent = i
    pageButton.onclick = () => changePage(i)
    pagination.appendChild(pageButton)
  }

  // Tombol Next
  const nextButton = document.createElement("button")
  nextButton.className = "page-btn"
  nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>'
  nextButton.disabled = currentPage === totalPages
  nextButton.onclick = () => changePage(currentPage + 1)
  pagination.appendChild(nextButton)
}

// Ganti halaman
function changePage(page) {
  currentPage = page
  renderComplaintsTable()
}

// Filter pengaduan
function filterComplaints() {
  const statusFilter = document.getElementById("statusFilter").value
  const priorityFilter = document.getElementById("priorityFilter").value

  filteredComplaints = allComplaints.filter((complaint) => {
    const statusMatch = statusFilter === "all" || complaint.status === statusFilter
    const priorityMatch = priorityFilter === "all" || complaint.priority === priorityFilter
    return statusMatch && priorityMatch
  })

  currentPage = 1
  renderComplaintsTable()
}

// Lihat detail pengaduan
function viewComplaint(complaintId) {
  const complaint = allComplaints.find((c) => c.id === complaintId)
  if (!complaint) return

  const priorityClass = complaint.priority.toLowerCase().replace(" ", "-")
  const sentimentClass = complaint.sentiment ? complaint.sentiment.toLowerCase() : "unknown"
  const statusClass = complaint.status.toLowerCase()

  document.getElementById("modalBody").innerHTML = `
        <div class="complaint-detail">
            <div class="detail-row">
                <div class="detail-label">ID Laporan:</div>
                <div class="detail-value">${complaint.id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Tanggal:</div>
                <div class="detail-value">${formatDate(complaint.date)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Nama Pelapor:</div>
                <div class="detail-value">${complaint.name}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Telepon:</div>
                <div class="detail-value">${complaint.phone || "-"}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Kategori:</div>
                <div class="detail-value">${complaint.category}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Lokasi:</div>
                <div class="detail-value">${complaint.location}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Sentimen:</div>
                <div class="detail-value">
                    <span class="sentiment-badge sentiment-${sentimentClass}">
                        ${complaint.sentiment || "N/A"} 
                        ${complaint.sentiment_confidence ? `(${complaint.sentiment_confidence.toFixed(1)}%)` : ""}
                    </span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Prioritas:</div>
                <div class="detail-value">
                    <span class="priority-badge priority-${priorityClass}">
                        ${complaint.priority}
                    </span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Status:</div>
                <div class="detail-value">
                    <span class="status-badge status-${statusClass}">
                        ${complaint.status}
                    </span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Deskripsi:</div>
                <div class="detail-value complaint-description">${complaint.description}</div>
            </div>
            ${
              complaint.admin_notes
                ? `
            <div class="detail-row">
                <div class="detail-label">Catatan Admin:</div>
                <div class="detail-value">${complaint.admin_notes}</div>
            </div>
            `
                : ""
            }
        </div>
    `

  document.getElementById("currentComplaintId").value = complaintId
  document.getElementById("complaintModal").style.display = "block"
}

// Update status pengaduan
function updateComplaintStatus(complaintId) {
  const complaint = allComplaints.find((c) => c.id === complaintId)
  if (!complaint) return

  document.getElementById("currentComplaintId").value = complaintId
  document.getElementById("currentStatus").textContent = complaint.status
  document.getElementById("currentStatus").className = `status-badge status-${complaint.status.toLowerCase()}`
  document.getElementById("newStatus").value = complaint.status
  document.getElementById("adminNotes").value = complaint.admin_notes || ""

  document.getElementById("statusModal").style.display = "block"
}

// Submit update status
async function submitStatusUpdate() {
  const complaintId = document.getElementById("currentComplaintId").value
  const newStatus = document.getElementById("newStatus").value
  const adminNotes = document.getElementById("adminNotes").value

  try {
    const response = await fetch(`/api/admin/complaints/${complaintId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: newStatus,
        admin_notes: adminNotes,
      }),
    })

    const result = await response.json()

    if (result.success) {
      // Update data lokal
      const complaint = allComplaints.find((c) => c.id === complaintId)
      if (complaint) {
        complaint.status = newStatus
        complaint.admin_notes = adminNotes
      }

      closeStatusModal()
      renderComplaintsTable()
      updateStatistics()

      showNotification("Status berhasil diupdate. Notifikasi WhatsApp telah dikirim.", "success")
    } else {
      throw new Error(result.message || "Failed to update status")
    }
  } catch (error) {
    console.error("Error updating status:", error)
    showNotification("Gagal memperbarui status", "error")
  }
}

// Close modals
function closeModal() {
  document.getElementById("complaintModal").style.display = "none"
}

function closeStatusModal() {
  document.getElementById("statusModal").style.display = "none"
}

// Quick actions
function refreshData() {
  loadDashboardData()
  showNotification("Data diperbarui", "success")
}

function exportToExcel() {
  // Export ke CSV
  const headers = ["ID", "Tanggal", "Nama", "Kategori", "Lokasi", "Prioritas", "Sentimen", "Status"]
  const rows = allComplaints.map((c) => [
    c.id,
    c.date,
    c.name,
    c.category,
    c.location,
    c.priority,
    c.sentiment,
    c.status,
  ])

  let csv = "\uFEFF" // BOM untuk UTF-8
  csv += headers.join(",") + "\n"
  rows.forEach((row) => {
    csv += row.map((cell) => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",") + "\n"
  })

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `laporan_pengaduan_${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)

  showNotification("Data berhasil diexport ke CSV", "success")
}

function showAllComplaints() {
  document.getElementById("statusFilter").value = "all"
  document.getElementById("priorityFilter").value = "all"
  filterComplaints()
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return "-"
  const options = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
  return new Date(dateString).toLocaleDateString("id-ID", options)
}

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

  const colorMap = {
    success: "#4CAF50",
    error: "#f44336",
    info: "#2196F3",
  }

  notification.innerHTML = `
        <i class="fas fa-${iconMap[type] || "info-circle"}"></i>
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
        border-left: 4px solid ${colorMap[type] || colorMap.info};
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 1001;
    `

  document.body.appendChild(notification)

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove()
    }
  }, 3000)
}
