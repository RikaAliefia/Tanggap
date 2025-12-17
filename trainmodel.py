# train_model.py - Training Model Sentimen untuk Sistem Pengaduan
# Jalankan file ini di VSCode: python train_model.py

import pandas as pd
import pickle
import re
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# Pastikan folder models ada
os.makedirs('models', exist_ok=True)

print("=" * 60)
print("TRAINING MODEL SENTIMEN - SISTEM PENGADUAN MEDAN")
print("=" * 60)

# ================================
# 1. Load Dataset
# ================================
print("\n[1] Loading dataset...")
try:
    df = pd.read_csv('pengaduan.csv')
    print(f"    Total data: {len(df)} baris")
    print(f"    Columns: {df.columns.tolist()}")
except FileNotFoundError:
    print("ERROR: File pengaduan.csv tidak ditemukan!")
    print("Pastikan file berada di folder yang sama dengan train_model.py")
    exit(1)

# ================================
# 2. Preprocessing Text
# ================================
print("\n[2] Preprocessing text...")

def preprocess_text(text):
    """Membersihkan teks untuk analisis"""
    if pd.isna(text):
        return ""
    text = str(text).lower()
    # Hapus karakter non-alfabet kecuali spasi
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    # Hapus spasi berlebih
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# Kolom yang digunakan
TEXT_COLUMN = 'laporan'      # Kolom teks pengaduan
LABEL_COLUMN = 'sentimen'    # Kolom label sentimen

# Preprocess teks
df['text_clean'] = df[TEXT_COLUMN].apply(preprocess_text)

# Hapus baris dengan teks kosong
df = df[df['text_clean'].str.len() > 0]
print(f"    Data setelah preprocessing: {len(df)} baris")

# ================================
# 3. Analisis Distribusi Label
# ================================
print("\n[3] Distribusi label sentimen:")
label_counts = df[LABEL_COLUMN].value_counts()
for label, count in label_counts.items():
    percentage = (count / len(df)) * 100
    print(f"    - {label}: {count} ({percentage:.1f}%)")

# ================================
# 4. Split Data Training & Testing
# ================================
print("\n[4] Splitting data...")
X = df['text_clean']
y = df[LABEL_COLUMN]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, 
    test_size=0.2, 
    random_state=42, 
    stratify=y
)

print(f"    Training data: {len(X_train)} baris")
print(f"    Testing data: {len(X_test)} baris")

# ================================
# 5. TF-IDF Vectorization
# ================================
print("\n[5] Training TF-IDF Vectorizer...")
tfidf_vectorizer = TfidfVectorizer(
    max_features=5000,      # Maksimal 5000 fitur
    ngram_range=(1, 2),     # Unigram dan Bigram
    min_df=1,               # Minimal muncul 1 kali
    max_df=0.95             # Maksimal 95% dokumen
)

X_train_tfidf = tfidf_vectorizer.fit_transform(X_train)
X_test_tfidf = tfidf_vectorizer.transform(X_test)

print(f"    Vocabulary size: {len(tfidf_vectorizer.vocabulary_)} kata")
print(f"    Feature matrix shape: {X_train_tfidf.shape}")

# ================================
# 6. Train Naive Bayes Model
# ================================
print("\n[6] Training Naive Bayes Classifier...")
sentiment_model = MultinomialNB(alpha=0.1)
sentiment_model.fit(X_train_tfidf, y_train)
print("    Model trained successfully!")

# ================================
# 7. Evaluate Model
# ================================
print("\n[7] Evaluating model...")
y_pred = sentiment_model.predict(X_test_tfidf)
accuracy = accuracy_score(y_test, y_pred)

print("\n" + "=" * 60)
print(f"MODEL ACCURACY: {accuracy:.4f} ({accuracy*100:.2f}%)")
print("=" * 60)

print("\nClassification Report:")
print("-" * 60)
print(classification_report(y_test, y_pred))

# ================================
# 8. Save Models
# ================================
print("\n[8] Saving models...")

# Save TF-IDF Vectorizer
tfidf_path = 'models/tfidf_vectorizer.pkl'
with open(tfidf_path, 'wb') as f:
    pickle.dump(tfidf_vectorizer, f)
print(f"    [OK] TF-IDF Vectorizer saved to {tfidf_path}")

# Save Sentiment Model
model_path = 'models/sentiment_model.pkl'
with open(model_path, 'wb') as f:
    pickle.dump(sentiment_model, f)
print(f"    [OK] Sentiment Model saved to {model_path}")

# ================================
# 9. Test Predictions
# ================================
print("\n" + "=" * 60)
print("TESTING PREDICTIONS")
print("=" * 60)

test_texts = [
    "Jalan rusak parah dan berlubang membahayakan pengendara",
    "Pelayanan di kantor kelurahan sangat lambat dan buruk",
    "Terima kasih pelayanan sudah bagus dan memuaskan",
    "Sampah menumpuk sudah seminggu tidak diangkut bau sekali",
    "Terjadi kebakaran di pasar sentral sangat darurat",
    "Informasi jadwal pelayanan berubah",
    "Bantuan sudah diterima dengan baik terima kasih",
    "Air PDAM mati sudah 3 hari sangat mengganggu"
]

print("\nHasil prediksi:")
print("-" * 60)

for text in test_texts:
    clean_text = preprocess_text(text)
    text_tfidf = tfidf_vectorizer.transform([clean_text])
    prediction = sentiment_model.predict(text_tfidf)[0]
    proba = sentiment_model.predict_proba(text_tfidf)[0]
    confidence = max(proba) * 100
    
    print(f"\nText: {text}")
    print(f"  -> Sentimen: {prediction.upper()} (confidence: {confidence:.1f}%)")

# ================================
# 10. Summary
# ================================
print("\n" + "=" * 60)
print("TRAINING SELESAI!")
print("=" * 60)
print(f"""
File yang dihasilkan:
  1. models/tfidf_vectorizer.pkl
  2. models/sentiment_model.pkl

Label classes: {sentiment_model.classes_.tolist()}

Selanjutnya:
  1. Jalankan aplikasi dengan: python app.py
  2. Model akan otomatis dimuat saat aplikasi berjalan
""")
