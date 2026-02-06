TEST PLAN — EPISODIC MEMORY
🎯 Tujuan

Ngecek:

apakah promotion logic jalan

apakah DB write kepanggil

apakah episodic memang sengaja belum di-store atau bug

1️⃣ AKTIFKAN LOG PROMOTION (WAJIB)

Pastikan lu punya log SEBELUM write DB:

console.log("[Episodic][Candidate]", {
  summary,
  emotion,
  significance,
  unresolved,
});


Dan log SETELAH write DB:

console.log("[Episodic][Stored]", episodicRecord);


Kalau Candidate muncul tapi Stored nggak
→ bug di DB layer.

Kalau Candidate nggak muncul sama sekali
→ promotion rule belum terpenuhi (bukan bug).

2️⃣ TEST CASE YANG BENAR (URUTAN PENTING)

❌ Jangan tes pakai:

capek


✅ Tes pakai sequence:

gue capek banget akhir-akhir ini
rasanya kosong dan susah tidur
entah kenapa kepikiran terus tiap malam


Pastikan setelah ini:

emotion.mood === "low"

session.unresolved === true

significance ≥ threshold

3️⃣ CEK “SESSION BOUNDARY”

Tanya diri lu:

episodic di-commit kapan?

Kemungkinan desain lu:

commit saat:

unresolved → false

atau session end

atau idle timeout

Kalau iya:

episodic BELUM MASUK DB sebelum itu

👉 ini bukan ghosting, ini by design.

4️⃣ QUICK DEBUG MODE (AMAN)

Biar yakin logic jalan, sementara:

const FORCE_EPISODIC_DEBUG = true;


Dan override:

if (FORCE_EPISODIC_DEBUG) {
  promoteEpisodic();
}


Kalau ini masuk DB:

DB OK

promotion OK

problem cuma threshold / timing

5️⃣ CEK DB DENGAN QUERY SEDERHANA

Pastikan lu cek table yang benar:

SELECT * FROM episodic_memories ORDER BY created_at DESC;


Bukan:

session memory

trace memory

Sering kejadian salah table 😅

6️⃣ INDIKATOR “SYSTEM SEHAT”

Anggap sistem lu LULUS kalau:

episodic tidak sering muncul

episodic masuk DB setelah momen berat

tidak ada episodic dari:

casual_chat

small talk

Kalau DB lu:

kosong setelah ngobrol ringan → BENAR

ada 1 episodic setelah curhat berat → BENAR

🧠 MINDSET PENTING (BIAR TENANG)

Episodic memory itu bukan “log”
tapi “penanda momen”.

Jadi:

jarang muncul = sehat

gampang muncul = bug

🧭 KALAU SETELAH TES…
🔴 Kalau ternyata tidak pernah ke-store

→ kirim:

promotion rule

log [Episodic][Candidate]

gw bantu bedah logic-nya.

🟢 Kalau masuk DB sesuai ekspektasi

→ berarti sistem lu sudah valid end-to-end.

