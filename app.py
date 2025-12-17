# app.py - Backend Flask dengan Analisis Sentimen dan WhatsApp Gateway

from flask import Flask, render_template, request, redirect, flash, url_for, session, jsonify
import sqlite3
import os
import pickle
import re
from datetime import datetime
import requests

app = Flask(__name__)
app.secret_key = "supersecretkey"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "tanggap.db")
MODELS_DIR = os.path.join(BASE_DIR, "models")

# ================================
# Load ML Models
# ================================
tfidf_vectorizer = None
sentiment_model = None

def load_models():
    """Load model sentiment dan TF-IDF vectorizer"""
    global tfidf_vectorizer, sentiment_model
    try:
        tfidf_path = os.path.join(MODELS_DIR, 'tfidf_vectorizer.pkl')
        model_path = os.path.join(MODELS_DIR, 'sentiment_model.pkl')
        
        with open(tfidf_path, 'rb') as f:
            tfidf_vectorizer = pickle.load(f)
        with open(model_path, 'rb') as f:
            sentiment_model = pickle.load(f)
        
        print("[OK] Models loaded successfully")
        print(f"     Classes: {sentiment_model.classes_.tolist()}")
        return True
    except FileNotFoundError as e:
        print(f"[WARNING] Model files not found: {e}")
        print("          Run 'python train_model.py' first!")
        return False
    except Exception as e:
        print(f"[ERROR] Error loading models: {e}")
        return False

# ================================
# Sentiment Analysis Functions
# ================================
def preprocess_text(text):
    """Membersihkan teks untuk analisis"""
    if not text:
        return ""
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def predict_sentiment(text):
    """Prediksi sentimen dari teks pengaduan"""
    if not tfidf_vectorizer or not sentiment_model:
        return "Tidak Diketahui", 0.0
    
    clean_text = preprocess_text(text)
    if not clean_text:
        return "Tidak Diketahui", 0.0
    
    text_tfidf = tfidf_vectorizer.transform([clean_text])
    prediction = sentiment_model.predict(text_tfidf)[0]
    proba = sentiment_model.predict_proba(text_tfidf)[0]
    confidence = max(proba) * 100
    
    return prediction, confidence

def determine_priority(sentiment, description):
    """Tentukan prioritas berdasarkan sentimen dan kata kunci"""
    text = description.lower()
    
    # Kata kunci untuk setiap tingkat prioritas
    urgent_keywords = [
        'kebakaran', 'kecelakaan', 'darurat', 'mendesak', 'bahaya', 
        'tewas', 'luka', 'kritis', 'bencana', 'roboh', 'ambruk',
        'evakuasi', 'longsor', 'ledakan', 'ancaman', 'bom', 'jebol',
        'runtuh', 'wabah', 'keracunan', 'segera'
    ]
    high_keywords = [
        'rusak parah', 'mengganggu', 'penting', 'mogok', 
        'macet parah', 'banjir', 'putus', 'bocor besar', 'mati',
        'menumpuk', 'tidak tertahankan', 'sangat', 'parah'
    ]
    medium_keywords = [
        'perlu perbaikan', 'gangguan', 'kurang', 'lubang', 'kotor', 
        'sampah', 'lambat', 'lama', 'rusak', 'tersumbat', 'bocor',
        'tidak pernah', 'belum'
    ]
    
    # Cek kata kunci (prioritas tertinggi dulu)
    if any(keyword in text for keyword in urgent_keywords):
        return "Sangat Mendesak"
    elif any(keyword in text for keyword in high_keywords):
        return "Tinggi"
    elif any(keyword in text for keyword in medium_keywords):
        return "Sedang"
    
    # Fallback berdasarkan sentimen
    sentiment_lower = sentiment.lower() if sentiment else ""
    if sentiment_lower == 'negatif' or sentiment_lower == 'negative':
        return "Sedang"
    elif sentiment_lower == 'positif' or sentiment_lower == 'positive':
        return "Rendah"
    
    return "Rendah"

# ================================
# WhatsApp Gateway (Fonnte)
# ================================
FONNTE_TOKEN = "XiSkvtqX5zJFhoV4UVoe"

def send_whatsapp(phone, message):
    if not FONNTE_TOKEN:
        print("[WARNING] WhatsApp token not configured. Message not sent.")
        return False

    try:
        phone = str(phone).strip()
        if phone.startswith('0'):
            phone = '62' + phone[1:]
        elif not phone.startswith('62'):
            phone = '62' + phone

        url = "https://api.fonnte.com/send"
        headers = {
            "Authorization": FONNTE_TOKEN
        }
        data = {
            "target": phone,
            "message": message,
            "countryCode": "62"
        }

        response = requests.post(url, headers=headers, data=data, timeout=10)
        result = response.json()

        if result.get('status'):
            print(f"[OK] WhatsApp sent to {phone}")
            return True
        else:
            print(f"[ERROR] Failed to send WhatsApp: {result}")
            return False

    except Exception as e:
        print(f"[ERROR] WhatsApp error: {e}")
        return False


# ================================
# Database Connection
# ================================
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ================================
# Initialize Database
# ================================
def init_db():
    conn = get_db_connection()
    cur = conn.cursor()

    # Tabel Users
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tabel Complaints (PENGADUAN)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complaint_id TEXT UNIQUE NOT NULL,
            user_id INTEGER,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            category TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT NOT NULL,
            sentiment TEXT,
            sentiment_confidence REAL,
            priority TEXT NOT NULL,
            status TEXT DEFAULT 'Diterima',
            admin_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Admin default jika belum ada
    cur.execute("SELECT * FROM users WHERE role='admin'")
    if not cur.fetchone():
        cur.execute("""
            INSERT INTO users (username, email, phone, password, role)
            VALUES ('admin', 'admin@gmail.com', '081234567890', 'admin', 'admin')
        """)
        print("[OK] Admin default dibuat: admin / admin")

    conn.commit()
    conn.close()
    print("[OK] Database initialized")

def generate_complaint_id():
    """Generate ID pengaduan unik: TG-YYYY-XXXX"""
    now = datetime.now()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT COUNT(*) FROM complaints WHERE strftime('%Y', created_at) = ?", 
        (str(now.year),)
    )
    count = cur.fetchone()[0] + 1
    conn.close()
    return f"TG-{now.year}-{count:04d}"

# ================================
# Routes - Public Pages
# ================================
@app.route('/')
def index():
    return render_template("dashboard.html")

@app.route('/login', methods=['GET', 'POST'])
def login_page():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM users
            WHERE (username = ? OR email = ?) AND password = ?
        """, (username, username, password))
        user = cur.fetchone()
        conn.close()

        if user:
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            session["phone"] = user["phone"]
            session["email"] = user["email"]
            session["role"] = user["role"]

            if user["role"] == "admin":
                return redirect(url_for("admin_dashboard"))
            else:
                return redirect(url_for("home_page"))

        flash("Username/email atau password salah!", "error")
        return redirect(url_for("login_page"))

    return render_template("login.html")

@app.route('/register', methods=['GET', 'POST'])
def register_page():
    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email")
        phone = request.form.get("phone")
        password = request.form.get("password")

        conn = get_db_connection()
        cur = conn.cursor()

        try:
            cur.execute("""
                INSERT INTO users (username, email, phone, password, role)
                VALUES (?, ?, ?, ?, 'user')
            """, (username, email, phone, password))
            conn.commit()
            flash("Registrasi berhasil, silakan login!", "success")
        except sqlite3.IntegrityError:
            flash("Username atau email sudah terdaftar!", "error")
        finally:
            conn.close()

        return redirect(url_for('login_page'))

    return render_template("register.html")

@app.route('/home')
def home_page():
    if not session.get("user_id"):
        return redirect(url_for("login_page"))
    return render_template("home.html", username=session.get("username"))

@app.route('/status')
def status_page():
    return render_template("status.html")

@app.route('/logout')
def logout():
    session.clear()
    flash("Anda telah logout.", "info")
    return redirect(url_for("index"))

# ================================
# Routes - Admin Pages
# ================================
@app.route('/admin')
def admin_dashboard():
    if session.get("role") != "admin":
        flash("Akses admin diperlukan!", "error")
        return redirect(url_for("login_page"))
    return render_template("admin.html", username=session.get("username"))

# ================================
# API Endpoints
# ================================

@app.route('/api/complaints', methods=['POST'])
def submit_complaint():
    """Submit pengaduan baru dengan analisis sentimen otomatis"""
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Silakan login terlebih dahulu"}), 401
    
    try:
        data = request.json
        category = data.get('category')
        location = data.get('location')
        description = data.get('description')
        
        if not all([category, location, description]):
            return jsonify({"success": False, "message": "Semua field harus diisi"}), 400
        
        # Analisis Sentimen menggunakan model ML
        sentiment, confidence = predict_sentiment(description)
        
        # Tentukan Prioritas berdasarkan sentimen + kata kunci
        priority = determine_priority(sentiment, description)
        
        # Generate ID pengaduan
        complaint_id = generate_complaint_id()
        
        # Ambil info user dari session
        user_id = session.get("user_id")
        username = session.get("username")
        phone = session.get("phone", "")
        email = session.get("email", "")
        
        # Simpan ke database
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO complaints 
            (complaint_id, user_id, name, phone, email, category, location, 
             description, sentiment, sentiment_confidence, priority, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Diterima')
        """, (complaint_id, user_id, username, phone, email, category, 
              location, description, sentiment, confidence, priority))
        conn.commit()
        conn.close()
        
        # Kirim WhatsApp Notification ke user
        if phone:
            wa_message = f"""*TANGGAP MEDAN*
━━━━━━━━━━━━━━━━━━
Pengaduan Anda telah kami terima!

ID Laporan: {complaint_id}
Kategori: {category}
Lokasi: {location}
Prioritas: {priority}
Sentimen: {sentiment}

Status pengaduan Anda akan kami update melalui WhatsApp ini.

Terima kasih telah menggunakan layanan Tanggap Medan.
━━━━━━━━━━━━━━━━━━"""
            send_whatsapp(phone, wa_message)
        
        return jsonify({
            "success": True,
            "message": "Pengaduan berhasil dikirim",
            "data": {
                "complaint_id": complaint_id,
                "sentiment": sentiment,
                "confidence": round(confidence, 2),
                "priority": priority
            }
        })
        
    except Exception as e:
        print(f"[ERROR] Submit complaint: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/admin/complaints', methods=['GET'])
def get_all_complaints():
    """Ambil semua pengaduan untuk admin dashboard"""
    if session.get("role") != "admin":
        return jsonify({"success": False, "message": "Akses ditolak"}), 403
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM complaints ORDER BY created_at DESC")
        rows = cur.fetchall()
        conn.close()
        
        complaints = []
        for row in rows:
            complaints.append({
                "id": row["complaint_id"],
                "date": row["created_at"],
                "name": row["name"],
                "phone": row["phone"],
                "email": row["email"],
                "category": row["category"],
                "location": row["location"],
                "description": row["description"],
                "sentiment": row["sentiment"],
                "sentiment_confidence": row["sentiment_confidence"],
                "priority": row["priority"],
                "status": row["status"],
                "admin_notes": row["admin_notes"]
            })
        
        return jsonify({"success": True, "complaints": complaints})
        
    except Exception as e:
        print(f"[ERROR] Get complaints: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/admin/complaints/<complaint_id>', methods=['PUT'])
def update_complaint(complaint_id):
    """Update status pengaduan dan kirim notifikasi WA"""
    if session.get("role") != "admin":
        return jsonify({"success": False, "message": "Akses ditolak"}), 403
    
    try:
        data = request.json
        new_status = data.get('status')
        admin_notes = data.get('admin_notes', '')
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Ambil info pengaduan untuk notifikasi WA
        cur.execute("SELECT * FROM complaints WHERE complaint_id = ?", (complaint_id,))
        complaint = cur.fetchone()
        
        if not complaint:
            conn.close()
            return jsonify({"success": False, "message": "Pengaduan tidak ditemukan"}), 404
        
        # Update status
        cur.execute("""
            UPDATE complaints 
            SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE complaint_id = ?
        """, (new_status, admin_notes, complaint_id))
        conn.commit()
        conn.close()
        
        # Kirim WhatsApp notification ke user
        if complaint["phone"]:
            status_emoji = {
                "Diterima": "Diterima",
                "Diproses": "Sedang Diproses",
                "Selesai": "Telah Selesai"
            }
            
            wa_message = f"""*TANGGAP MEDAN - UPDATE STATUS*
━━━━━━━━━━━━━━━━━━
ID Laporan: {complaint_id}

Status Baru: {status_emoji.get(new_status, new_status)}

{f'Catatan Admin: {admin_notes}' if admin_notes else ''}

Terima kasih atas kesabaran Anda.
━━━━━━━━━━━━━━━━━━"""
            send_whatsapp(complaint["phone"], wa_message)
        
        return jsonify({"success": True, "message": "Status berhasil diupdate"})
        
    except Exception as e:
        print(f"[ERROR] Update complaint: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/user/complaints', methods=['GET'])
def get_user_complaints():
    """Ambil pengaduan user yang sedang login"""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": False, "message": "Silakan login"}), 401
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM complaints 
            WHERE user_id = ?
            ORDER BY created_at DESC
        """, (user_id,))
        rows = cur.fetchall()
        conn.close()
        
        complaints = []
        for row in rows:
            complaints.append({
                "id": row["complaint_id"],
                "date": row["created_at"],
                "category": row["category"],
                "location": row["location"],
                "description": row["description"],
                "sentiment": row["sentiment"],
                "priority": row["priority"],
                "status": row["status"],
                "admin_notes": row["admin_notes"]
            })
        
        return jsonify({"success": True, "complaints": complaints})
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/complaints/search', methods=['GET'])
def search_complaint():
    """Cari pengaduan berdasarkan ID atau nomor telepon"""
    search_term = request.args.get('q', '')
    
    if not search_term:
        return jsonify({"success": False, "message": "Masukkan ID laporan"}), 400
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM complaints 
            WHERE complaint_id = ? OR phone LIKE ?
            ORDER BY created_at DESC
        """, (search_term, f"%{search_term}%"))
        rows = cur.fetchall()
        conn.close()
        
        complaints = []
        for row in rows:
            complaints.append({
                "id": row["complaint_id"],
                "date": row["created_at"],
                "category": row["category"],
                "location": row["location"],
                "description": row["description"][:100] + "..." if len(row["description"]) > 100 else row["description"],
                "priority": row["priority"],
                "status": row["status"]
            })
        
        return jsonify({"success": True, "complaints": complaints})
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_text():
    """Analisis sentimen realtime untuk preview"""
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text or len(text) < 10:
            return jsonify({
                "sentiment": "Tidak Diketahui", 
                "priority": "Rendah", 
                "confidence": 0
            })
        
        sentiment, confidence = predict_sentiment(text)
        priority = determine_priority(sentiment, text)
        
        return jsonify({
            "sentiment": sentiment,
            "priority": priority,
            "confidence": round(confidence, 2)
        })
        
    except Exception as e:
        print(f"[ERROR] Analyze: {e}")
        return jsonify({
            "sentiment": "Error", 
            "priority": "Sedang", 
            "confidence": 0
        })

# ================================
# Run Application
# ================================
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("TANGGAP MEDAN - Sistem Pengaduan Masyarakat")
    print("=" * 60)
    
    init_db()
    load_models()
    
    print("\n[INFO] Starting Flask server...")
    print("[INFO] Access at: http://localhost:5000")
    print("=" * 60 + "\n")
    
    app.run(debug=True)
