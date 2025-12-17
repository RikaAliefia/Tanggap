# ============================================
# test_model.py
# ============================================
import joblib

# 1️⃣ Load model dan vectorizer
model_path = 'model/sentiment_model.pkl'
vectorizer_path = 'model/tfidf_vectorizer.pkl'

print("🔄 Memuat model dan vectorizer...")
model = joblib.load(model_path)
vectorizer = joblib.load(vectorizer_path)
print("✅ Model dan vectorizer berhasil dimuat!\n")

# 2️⃣ Siapkan teks uji
test_texts = [
    "Laporan banjir besar di Kota Medan belum mendapat penanganan hingga saat ini.",
    "Pelayanan di kantor kelurahan sangat cepat dan ramah, terima kasih.",
    "Sampah di sekitar pasar Medan belum diangkut selama beberapa hari.",
]

# 3️⃣ Transformasi teks ke bentuk TF-IDF
test_vectors = vectorizer.transform(test_texts)

# 4️⃣ Prediksi menggunakan model
predictions = model.predict(test_vectors)

# 5️⃣ Tampilkan hasil prediksi
print("📊 HASIL PREDIKSI:\n")
for text, pred in zip(test_texts, predictions):
    status = "Prioritas Tinggi 🚨" if pred == 1 else "Prioritas Rendah ✅"
    print(f"Teks  : {text}")
    print(f"Hasil : {status}\n")
