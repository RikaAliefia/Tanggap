import sqlite3

conn = sqlite3.connect(r"D:\laragon\www\New folder\users.db")
cur = conn.cursor()

print("\n=== CEK ISI TABLE USERS ===")
try:
    cur.execute("SELECT id, username, email, password, role")
    rows = cur.fetchall()
    if rows:
        for r in rows:
            print(r)
    else:
        print("❗ TABEL USERS KOSONG")
except Exception as e:
    print("ERROR:", e)

conn.close()
