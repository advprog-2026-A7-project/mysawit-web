# Demo FE: Kebun Sampai Shipment

Dokumen ini dipakai untuk demo lewat frontend MySawit, dari setup data kebun sampai semua skenario utama di halaman Pengiriman bisa dites.

## Prasyarat

- Identity, Plantation, Harvest, Shipment, RabbitMQ, dan Web sudah running.
- FE dibuka dari `http://localhost:3000` atau port dev yang sedang dipakai.
- Akun `ADMIN` sudah tersedia dari seed Identity. `ADMIN` tidak bisa self-register dari UI register.
- Untuk demo yang rapi, pakai suffix unik, misalnya `demo-20260519-01`, supaya email/user tidak bentrok.

Gunakan password yang sama untuk akun demo agar gampang pindah role:

```text
secret123
```

## Data Yang Perlu Dicatat

Beberapa form FE saat ini masih minta ID mentah, sementara UI belum selalu menampilkan full ID. Ambil ID dari Network response browser DevTools setelah request FE selesai.

| Nama | Dari Mana | Dipakai Untuk |
| --- | --- | --- |
| `MANDOR_ID` | `/dashboard/admin/users`, klik `View`, copy UUID dari URL `/users/{id}` | assign pekerja, validasi panen, shipment creator |
| `BURUH_ID` | `/dashboard/admin/users`, klik `View`, copy UUID dari URL `/users/{id}` | akun pencatat panen |
| `SUPIR_ID` | `/dashboard/admin/users`, klik `View`, copy UUID dari URL `/users/{id}` | assign supir dan create shipment |
| `PLANTATION_LONG_ID` | Network response `GET /api/gateway/plantation/api/plantations` | assign mandor/supir di page Kebun |
| `PLANTATION_UUID` | konversi dari `PLANTATION_LONG_ID` | input `Kebun` di page Panen |
| `HARVEST_ID` | Network response `GET /api/gateway/harvest/harvests` setelah catat panen | approve panen dan muatan shipment |
| `SHIPMENT_ID` | Network response `GET /api/gateway/shipment/api/shipments` setelah create shipment | update status supir dan approval admin |

Konversi plantation ID untuk Harvest:

```text
PLANTATION_LONG_ID=2
PLANTATION_UUID=00000000-0000-0000-0000-000000000002
```

## 1. Buat Akun Demo

Login sebagai `ADMIN`, lalu buka `Dashboard -> Tim`.

Masuk tab `+ Tambah Anggota`, lalu buat tiga akun:

| Role | Username | Email | Data Tambahan |
| --- | --- | --- | --- |
| `MANDOR` | `mandor.demo.<suffix>` | `mandor.demo.<suffix>@mysawit.local` | `No. Sertifikasi Mandor`: `CERT-DEMO-001` |
| `BURUH` | `buruh.demo.<suffix>` | `buruh.demo.<suffix>@mysawit.local` | tidak ada |
| `SUPIR` | `supir.demo.<suffix>` | `supir.demo.<suffix>@mysawit.local` | tidak ada |

Setelah user dibuat, buka `/dashboard/admin/users`, filter email masing-masing, klik `View`, lalu catat `MANDOR_ID`, `BURUH_ID`, dan `SUPIR_ID` dari URL.

## 2. Assign Buruh Ke Mandor

Masih sebagai `ADMIN`, buka `Dashboard -> Tim -> Penugasan Mandor`.

Isi:

- `Pekerja`: akun `BURUH` demo.
- `Mandor`: akun `MANDOR` demo.

Klik `Simpan Penugasan`.

Ini wajib karena Harvest Service menolak pencatatan panen dari buruh yang belum punya mandor.

## 3. Buat Plantation

Buka `Dashboard -> Kebun -> + Tambah Kebun`.

Contoh data:

| Field | Isi |
| --- | --- |
| Nama Kebun | `Kebun Demo <suffix>` |
| Lokasi | `Kalimantan Selatan` |
| Luas | `25.5` |
| Tanggal Tanam | isi bebas |
| Deskripsi | `Kebun demo untuk shipment flow` |

Koordinat 4 sudut:

```text
Titik 1: -6.200000, 106.800000
Titik 2: -6.200000, 106.801000
Titik 3: -6.201000, 106.801000
Titik 4: -6.201000, 106.800000
```

Klik `Buat Kebun`. Setelah sukses, ambil `PLANTATION_LONG_ID` dari Network response `GET /api/gateway/plantation/api/plantations`, lalu buat `PLANTATION_UUID` dengan format zero-padded seperti di atas.

## 4. Assign Mandor Dan Supir Ke Kebun

Buka `Dashboard -> Kebun -> Penugasan Mandor`.

Isi:

- `Kebun`: `Kebun Demo <suffix>`.
- `Mandor`: akun `MANDOR` demo.

Klik `Simpan Penugasan`.

Lanjut ke `Dashboard -> Kebun -> Penugasan Supir`.

Di panel `Assign Supir ke Kebun`, isi:

- `Kebun`: `Kebun Demo <suffix>`.
- `Supir`: akun `SUPIR` demo.

Klik `Simpan Penugasan`. Opsional, pakai panel `Lihat Supir di Kebun` untuk memastikan supir sudah masuk.

## 5. Catat Panen Sebagai Buruh

Logout, lalu login sebagai akun `BURUH` demo.

Buka `Dashboard -> Panen`, klik `+ Catat Panen`.

Isi:

| Field | Isi |
| --- | --- |
| Kebun | `PLANTATION_UUID` |
| Berat panen | `180` |
| Keterangan panen | `Panen demo untuk shipment` |
| Foto Bukti Panen | upload file gambar apa saja |

Klik `Simpan Panen`.

Catatan: satu buruh hanya bisa mencatat satu panen per hari. Kalau muncul error `already logged a harvest today`, buat akun `BURUH` demo baru atau reset data harvest.

Setelah sukses, ambil `HARVEST_ID` dari Network response `GET /api/gateway/harvest/harvests`.

## 6. Approve Panen Sebagai Mandor

Logout, lalu login sebagai akun `MANDOR` demo.

Buka `Dashboard -> Panen`, lalu cari panel `Ubah Status Panen`.

Isi:

- `Nomor catatan panen`: `HARVEST_ID`.
- Status: `Disetujui`.
- `Alasan penolakan`: kosong.

Klik `Simpan Status`. Pastikan catatan panen berubah ke status `Disetujui`.

Shipment hanya bisa dibuat dari harvest yang sudah approved.

## 7. Buat Shipment Sebagai Mandor

Masih sebagai `MANDOR`, buka `Dashboard -> Pengiriman`, klik `+ Buat Pengiriman`.

Isi:

| Field | Isi |
| --- | --- |
| Supir | `SUPIR_ID` |
| Tujuan | `Pabrik Sawit Demo` |
| Muatan panen | lihat format di bawah |

Format `Muatan panen` adalah satu baris per harvest:

```text
HARVEST_ID, 180
```

Contoh:

```text
9f2b4d5e-1111-4222-8333-aabbccddeeff, 180
```

Klik `Simpan Pengiriman`. Setelah sukses, ambil `SHIPMENT_ID` dari Network response `GET /api/gateway/shipment/api/shipments`.

Expected:

- Shipment tampil di daftar.
- Status awal `Memuat`.
- Total muatan `180 kg`.

## 8. Test Skenario Di Page Shipment

### A. List Dan Filter

Sebagai `MANDOR` atau `ADMIN`, buka `Dashboard -> Pengiriman`.

Test:

- Filter `Status = Memuat`.
- Filter `Mandor / Supir` dengan username demo.
- Klik `Reset`.

Expected: daftar pengiriman berubah sesuai filter dan kembali penuh setelah reset.

### B. Guard Total Muatan

Sebagai `MANDOR`, klik `+ Buat Pengiriman`.

Isi `Muatan panen`:

```text
HARVEST_ID, 401
```

Expected:

- Badge total menjadi merah.
- Tombol `Simpan Pengiriman` disabled.
- FE menahan submit karena total melebihi `400 kg`.

### C. Guard Duplicate Harvest Dalam Satu Request

Sebagai `MANDOR`, klik `+ Buat Pengiriman`.

Isi `Muatan panen`:

```text
HARVEST_ID, 90
HARVEST_ID, 80
```

Expected:

- Muncul status `Harvest ID duplikat`.
- Tombol `Simpan Pengiriman` disabled.

### D. Guard Harvest Sudah Pernah Dipakai

Sebagai `MANDOR`, coba buat shipment baru memakai `HARVEST_ID` yang sudah dipakai shipment sebelumnya.

Expected dari backend:

```text
Harvest already claimed
```

Kalau muncul `Harvest not found` atau `Harvest status must be Approved`, cek lagi `HARVEST_ID` dan status panennya.

### E. Update Status Sebagai Supir

Logout, lalu login sebagai akun `SUPIR` demo.

Buka `Dashboard -> Pengiriman`. Supir seharusnya hanya melihat shipment miliknya.

Di panel `Operasi Status -> Update Supir`, jalankan berurutan:

1. Isi `Nomor pengiriman` dengan `SHIPMENT_ID`.
2. Pilih `Dalam Perjalanan`.
3. Klik `Simpan Status`.
4. Isi lagi `Nomor pengiriman` dengan `SHIPMENT_ID`.
5. Pilih `Tiba di Tujuan`.
6. Klik `Simpan Status`.

Expected:

- Status berubah `Memuat -> Dalam Perjalanan -> Tiba di Tujuan`.
- Progress bar shipment bergerak sampai tahap `Tiba`.

Negative test:

- Kalau dari status `Memuat` langsung pilih `Tiba di Tujuan`, backend harus menolak dengan `Invalid status transition`.
- Kalau login memakai supir lain, backend harus menolak dengan `Forbidden`.

### F. Approval Admin

Logout, lalu login kembali sebagai `ADMIN`.

Buka `Dashboard -> Pengiriman`.

Di panel `Operasi Status -> Persetujuan Admin`, isi:

- `Nomor pengiriman`: `SHIPMENT_ID`.
- Status: `Disetujui`.

Klik `Simpan Persetujuan`.

Expected:

- Status berubah ke `Disetujui`.
- Shipment menjadi final `ADMIN_APPROVED`.

Untuk skenario koreksi, buat shipment kedua sampai status `Tiba di Tujuan`, lalu pilih `Perlu Koreksi`.

Catatan penting: FE masih menampilkan opsi `Ditolak Admin`, tetapi backend shipment saat ini hanya menerima `ADMIN_APPROVED` dan `PARTIALLY_REJECTED`. Jadi untuk demo negatif admin, pakai `Perlu Koreksi`, bukan `Ditolak Admin`.

## Checklist Demo Cepat

```text
[ ] Admin login
[ ] Buat MANDOR, BURUH, SUPIR
[ ] Catat MANDOR_ID, BURUH_ID, SUPIR_ID
[ ] Assign BURUH -> MANDOR
[ ] Buat kebun
[ ] Catat PLANTATION_LONG_ID dan PLANTATION_UUID
[ ] Assign MANDOR -> kebun
[ ] Assign SUPIR -> kebun
[ ] BURUH catat panen
[ ] Catat HARVEST_ID
[ ] MANDOR approve panen
[ ] MANDOR buat shipment
[ ] Catat SHIPMENT_ID
[ ] SUPIR update MEMUAT -> MENGIRIM -> TIBA
[ ] ADMIN approve shipment
```

## Troubleshooting

- `Access Denied`: role yang sedang login tidak sesuai halaman. Logout lalu login role yang benar.
- `Service offline`: health check halaman gagal. Pastikan service terkait running dan URL gateway FE benar.
- `You have already logged a harvest today`: satu akun buruh hanya bisa catat satu panen per hari.
- `Plantation ID is required` atau parse UUID error di Panen: pakai `PLANTATION_UUID`, bukan angka `PLANTATION_LONG_ID`.
- `Harvest status must be Approved`: panen belum di-approve oleh mandor.
- `Harvest already claimed`: harvest sudah pernah dipakai shipment lain.
- `Forbidden` saat update shipment: login sebagai `SUPIR` yang berbeda dari `SUPIR_ID` shipment.
- `Shipment must be TIBA before admin approval`: update status supir sampai `Tiba di Tujuan` dulu.
