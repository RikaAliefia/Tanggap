// dashboard.js - Halaman publik untuk menampilkan semua riwayat pengaduan

let allDashboardComplaints = []
let filteredDashboardComplaints = []
let currentDashboardPage = 1
const dashboardItemsPerPage = 10

// Load data saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  console.log("[v0] Loading dashboard complaints...")
  loadAllComplaints()
})

// Load semua pengaduan dari database
async function loadAllComplaints() {
  try {
    console.log("[v0] Fetching from /api/public/complaints...")
    const response = await fetch("/api/public/complaints")
    const data = await response.json()

    console.log("[v0] Response received:", data)

    if (data.success) {
      allDashboardComplaints = data.complaints
      filteredDashboardComplaints = [...allDashboardComplaints]
      console.log("[v0] Total complaints loaded:", allDashboardComplaints.length)
      renderDashboardComplaints()
    } else {
      console.log("[v0] No complaints found")
      showEmptyState("Belum ada pengaduan yang tercatat")
    }
  } catch (error) {
    console.error("[v0] Error loading complaints:", error)
    showEmptyState("Gagal memuat data pengaduan")
  }
}

// Render daftar pengaduan
function renderDashboardComplaints() {
  const container = document.getElementById("dashboardComplaintList")
  const startIndex = (currentDashboardPage - 1) * dashboardItemsPerPage
  const endIndex = startIndex + dashboardItemsPerPage
  const complaints = filteredDashboardComplaints.slice(startIndex, endIndex)

  console.log("[v0] Rendering complaints, page:", currentDashboardPage, "items:", complaints.length)

  if (complaints.length === 0) {
    showEmptyState("Tidak ada pengaduan yang sesuai dengan filter")
    return
  }

  container.innerHTML = complaints
    .map((complaint) => {
      const priorityClass = complaint.priority.toLowerCase().replace(" ", "-")
      const statusClass = complaint.status.toLowerCase()

      return `
            <div class="complaint-card" style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                        <span style="font-weight: bold; color: #2563eb;">${complaint.id}</span>
                        <span style="margin-left: 1rem; color: #666; font-size: 0.9rem;">${formatDate(complaint.date)}</span>
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="priority-badge priority-${priorityClass}">${complaint.priority}</span>
                        <span class="status-badge status-${statusClass}">${complaint.status}</span>
                    </div>
                </div>
                
                <div style="margin-bottom: 0.75rem;">
                    <strong style="color: #333;">Kategori:</strong> 
                    <span style="color: #666;">${complaint.category}</span>
                </div>
                
                <div style="margin-bottom: 0.75rem;">
                    <strong style="color: #333;">Lokasi:</strong> 
                    <span style="color: #666;">${complaint.location}</span>
                </div>
                
                <div style="margin-bottom: 0.75rem;">
                    <strong style="color: #333;">Deskripsi:</strong> 
                    <p style="color: #666; margin-top: 0.5rem; line-height: 1.6;">${complaint.description}</p>
                </div>
                
                ${
                  complaint.sentiment
                    ? `
                <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #eee;">
                    <span style="color: #666; font-size: 0.9rem;">
                        <i class="fas fa-brain"></i> Sentimen: <strong>${complaint.sentiment}</strong>
                        ${complaint.sentiment_confidence ? ` (${complaint.sentiment_confidence.toFixed(1)}%)` : ""}
                    </span>
                </div>
                `
                    : ""
                }
            </div>
        `
    })
    .join("")

  renderDashboardPagination()
}

// Render pagination
function renderDashboardPagination() {
  const totalPages = Math.ceil(filteredDashboardComplaints.length / dashboardItemsPerPage)
  const pagination = document.getElementById("dashboardPagination")

  if (totalPages <= 1) {
    pagination.innerHTML = ""
    return
  }

  let html = ""

  // Previous button
  html += `<button class="page-btn" ${currentDashboardPage === 1 ? "disabled" : ""} 
             onclick="changeDashboardPage(${currentDashboardPage - 1})">
             <i class="fas fa-chevron-left"></i>
             </button>`

  // Page numbers (show max 7 pages)
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentDashboardPage - 1 && i <= currentDashboardPage + 1)) {
      html += `<button class="page-btn ${i === currentDashboardPage ? "active" : ""}" 
                     onclick="changeDashboardPage(${i})">${i}</button>`
    } else if (i === currentDashboardPage - 2 || i === currentDashboardPage + 2) {
      html += `<span style="padding: 0 0.5rem; color: #999;">...</span>`
    }
  }

  // Next button
  html += `<button class="page-btn" ${currentDashboardPage === totalPages ? "disabled" : ""} 
             onclick="changeDashboardPage(${currentDashboardPage + 1})">
             <i class="fas fa-chevron-right"></i>
             </button>`

  pagination.innerHTML = html
}

// Ganti halaman
function changeDashboardPage(page) {
  const totalPages = Math.ceil(filteredDashboardComplaints.length / dashboardItemsPerPage)
  if (page < 1 || page > totalPages) return

  currentDashboardPage = page
  renderDashboardComplaints()

  // Scroll ke atas section
  document.getElementById("history").scrollIntoView({ behavior: "smooth" })
}

// Filter pengaduan
function filterDashboardComplaints() {
  const category = document.getElementById("categoryFilter").value
  const status = document.getElementById("dashboardStatusFilter").value
  const priority = document.getElementById("dashboardPriorityFilter").value

  console.log("[v0] Filtering - Category:", category, "Status:", status, "Priority:", priority)

  filteredDashboardComplaints = allDashboardComplaints.filter((complaint) => {
    const categoryMatch = category === "all" || complaint.category === category
    const statusMatch = status === "all" || complaint.status === status
    const priorityMatch = priority === "all" || complaint.priority === priority
    return categoryMatch && statusMatch && priorityMatch
  })

  console.log("[v0] Filtered results:", filteredDashboardComplaints.length)

  currentDashboardPage = 1
  renderDashboardComplaints()
}

// Tampilkan empty state
function showEmptyState(message) {
  const container = document.getElementById("dashboardComplaintList")
  container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #666;">
            <i class="fas fa-inbox" style="font-size: 3rem; color: #ddd; margin-bottom: 1rem;"></i>
            <p style="font-size: 1.1rem;">${message}</p>
        </div>
    `
  document.getElementById("dashboardPagination").innerHTML = ""
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
