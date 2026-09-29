# Certi-V — LTFRB Region V

Capstone project: digital platform for applying for a **Certificate of Public Convenience (CPC)** with the Land Transportation Franchising and Regulatory Board, Regional Office No. 5.

This guide explains how to run the whole system on your own computer for testing.

---

## System overview

The project is made up of **3 processes** that must all be running at the same time:

| Process | Tech | Folder | URL |
|---|---|---|---|
| Backend API | Django 6.1 + DRF + PostgreSQL | `backend/` | `http://localhost:8000` |
| Applicant portal (public) | React 19 + Vite | `frontend-applicant/` | `http://localhost:5173` |
| TMS / staff portal (internal) | React 19 + Vite | `frontend-tms/` | `http://localhost:5174` |

The two frontends talk to the backend API (`/api/...`). The backend stores data in PostgreSQL and saves uploaded documents under `backend/media/`.

---

## Prerequisites

Install these first:

- **Python 3.12 or 3.13**
  - Check: `python --version`
- **Node.js 22 (LTS)** or newer (needed for Vite 8)
  - Check: `node --version`
- **PostgreSQL 16+**
  - Download: https://www.postgresql.org/download/windows/
  - Remember the password you set for the `postgres` user during installation.

---

## Setup (one time per machine)

### 1. Clone the repository

```bash
git clone https://github.com/aneji07/CERTI-V-System.git
cd CERTI-V-System
```

> Make sure you are on the latest commit before starting (`git pull`).

### 2. Set up the database (PostgreSQL)

Open **pgAdmin** (comes with PostgreSQL) or the `psql` terminal, and create the role + database that the project expects:

```sql
CREATE USER certiv_user WITH PASSWORD 'certiv_pass123';
CREATE DATABASE certiv_db OWNER certiv_user;
GRANT ALL ON SCHEMA public TO certiv_user;
```

If you prefer `psql`:

```bash
psql -U postgres
```

Then paste the 3 lines above and press Enter.

### 3. Set up the backend

```bash
cd backend

# create & activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate  # macOS / Linux

# install dependencies
pip install -r requirements.txt

# create the tables
python manage.py migrate

# load the reference data (roles, CPC types, fees, requirement types).
# REQUIRED so dropdowns are not empty — run it again any time, it will not duplicate:
python manage.py seed_reference

# start the server (0.0.0.0 so other devices on your network can reach it too)
python manage.py runserver 0.0.0.0:8000
```

The backend is now live at `http://localhost:8000`.
Quick check: open `http://localhost:8000/api/health/` — it should return `{"status": "ok"}` or similar.

### 4. Set up the Applicant portal

```bash
cd frontend-applicant
npm install
npm run dev
```

Open `http://localhost:5173` — this is the applicant-facing site (register / apply / pay).

### 5. Set up the TMS (staff) portal

```bash
cd frontend-tms
npm install
npm run dev -- --port 5174
```

Open `http://localhost:5174` — this is the internal staff system.

> `npm run dev` on `frontend-tms` should already use port 5174 automatically.

---

## Creating test accounts

### Staff accounts

The system checks staff roles before allowing login. Create accounts with a role.

With the backend running:

```bash
cd backend
venv\Scripts\activate
python manage.py create_user --username officer1 --password Testpass123 --role "Receiving Officer"
python manage.py create_user --username ctdouser --password Testpass123 --role "CTDO"
python manage.py create_user --username cashier1  --password Testpass123 --role "Cashier"
```

Valid staff roles:

`Receiving Officer`, `CTDO`, `Financial Analyst`, `Cashier`, `Legal Officer`, `ORD`, `Records Officer`

### Admin (Django superuser)

For managing records directly (documents, statuses, users):

```bash
python manage.py createsuperuser
```

Admin panel: `http://localhost:8000/admin/`

### Applicant account

There is no management command for applicants — sign up through the real registration flow on the **Applicant portal** (`http://localhost:5173/register`):

1. Step 1: account credentials (username, email, password)
2. Step 2: applicant info (business name, address, TIN)
3. Step 3: face & ID verification (see below)

---

## Face & ID verification (QR bridge / camera)

The registration flow asks the applicant to capture a **selfie** and their **government ID** to verify their identity. On a phone this is done through a QR-code "bridge".

- On desktop the page shows a QR code → scan it with your phone → follow the steps on the phone.
- The phone connects back to the machine running the backend.

The QR code points back to the backend, so the backend needs a URL the phone can actually reach. For demos the phone is often not on the same Wi-Fi as the laptop (or the venue blocks device-to-device traffic), so the project uses a **Cloudflare Quick Tunnel** to give the local backend a temporary public `https://...trycloudflare.com` URL — the phone can then open the verification page from anywhere, even on mobile data. No DNS, router, or domain setup is needed.

**Setup (per demo session):**

1. Install the `cloudflared` CLI: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. On the machine running the backend, start the tunnel pointing at the backend:
   ```
   cloudflared tunnel --url http://localhost:8000
   ```
3. Copy the `https://<random-name>.trycloudflare.com` address it prints (look for "Your quick Tunnel has been created!").
4. Set that tunnel URL as the QR bridge base URL in `frontend-applicant/.env` — this is the **only** link needed in the file:
   ```
   VITE_QR_BRIDGE_BASE_URL=https://<random-name>.trycloudflare.com
   ```
   If the file is missing/empty, the portal falls back to `http://<this-machine's-hostname>:8000`, which only works when the phone can reach this machine directly.
5. Restart the applicant dev server (`Ctrl+C`, then `npm run dev`). The QR codes now embed the public URL, so any phone can scan them.

> **Keep in mind:** Quick-tunnel URLs are temporary and change every time `cloudflared` restarts — copy the newly printed URL back into `.env` for each session. For a permanent link, use a named tunnel with your own domain instead.

---

## Useful URLs

| What | URL |
|---|---|
| Backend health check | `http://localhost:8000/api/health/` |
| Django admin | `http://localhost:8000/admin/` |
| Applicant portal | `http://localhost:5173` |
| TMS / staff portal | `http://localhost:5174` |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `pip install` fails | Make sure you are inside the activated `venv` and using Python 3.12+. |
| `connection refused` or `role "certiv_user" does not exist` | PostgreSQL is not running, or the role/database was not created. Re-check step 2. On Windows, start "PostgreSQL" from Services (`services.msc`). |
| CORS error in browser console | Backend and frontend must both be running. Applicant portal = 5173, TMS = 5174. These are the only origins allowed in CORS settings. |
| Port 8000 / 5173 already in use | Close the other app, or run Django on another port (`runserver 0.0.0.0:8001`) and update the axios base URL in `frontend-*/src/api/axios.js`. |
| Migration errors about `qrbridgeupload` | You are on an old commit. Pull the latest (`git pull`) — a new migration (`0010_qrbridgeupload`) is required. |
| Phone can't reach the QR link | All devices must be on the same Wi-Fi, and `VITE_QR_BRIDGE_BASE_URL` must point to the backend machine's LAN IP (not `localhost`). |

---

## Project structure

```
backend/                 Django REST API
  accounts/              users, roles, registration, login
  applications/          CPC application flow, documents, QR bridge
  payments/              SOA, payments, receipts
  legal/                 hearings, notices of hearing
  records/               records / docketing
  core/                  CPC types, requirement types, fees, health check
frontend-applicant/      applicant-facing React app (register, apply, pay)
frontend-tms/            internal staff React app (review, approve, release)
```