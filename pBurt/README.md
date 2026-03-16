# VillageDB Desktop App

This is a Tkinter-based desktop application for managing volunteers for The Village, backed by a PostgreSQL database. 

It provides:
- A landing page with navigation.
- A **Volunteers** view to add, edit, delete, and track check-in/check-out times. 

## Features

- Add, edit, and delete volunteers. 
- Track volunteer check-ins and check-outs (stored in the `volunteer_hours` table). 
- Highlight currently checked-in volunteers in the overview table. 
- Simple, single-file Python GUI for easy local use. 

## Requirements

- Python 3.10+  
- PostgreSQL (local or reachable host)  
- Python packages:
  - `psycopg2` or `psycopg2-binary`
  - `Pillow` (PIL)
  - `tkinter` (usually included with Python) 

Install dependencies:

```bash
pip install psycopg2-binary Pillow
```

> On some systems you may need `psycopg2` instead of `psycopg2-binary`. 

## Database Setup

The app expects a PostgreSQL database with at least these tables: 

```sql
CREATE TABLE volunteers (
    id SERIAL PRIMARY KEY,
    first_name  TEXT NOT NULL,
    last_name   TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    qrcode      TEXT,
    date_added  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE volunteer_hours (
    id SERIAL PRIMARY KEY,
    volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    time_in  TIMESTAMP NOT NULL,
    time_out TIMESTAMP
);
```

Default connection settings in `pBurt/VillageDB.py`: 

```python
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "p@$$word"
DB_HOST = "127.0.0.1"
DB_PORT = "5432"
```

Update these to match your local PostgreSQL instance before running the app. 

## Project Files

Key files related to the desktop app: 

| File                 | Description                          |
|----------------------|--------------------------------------|
| `pBurt/VillageDB.py` | Tkinter GUI app and DB functions     |
| `village.sqlite`     | Legacy/alternate DB (not used here)  |
| `village-logo.webp`  | Logo displayed on the landing page   |

The app attempts to load `village-logo.webp` from the project root; if missing, it falls back to a text title. 

## Running the App Locally

1. Clone the repository:

   ```bash
   git clone https://github.com/pratikhbtgit/the-village-app.git
   cd the-village-app
   ```

2. (Optional) Create and activate a virtual environment:

   ```bash
   python -m venv .venv
   # Linux/macOS
   source .venv/bin/activate
   # Windows
   .venv\Scripts\activate
   ```

3. Install dependencies:

   ```bash
   pip install psycopg2-binary Pillow
   ```

4. Ensure PostgreSQL is running, the database and tables are created as above, and the credentials in `pBurt/VillageDB.py` are correct. 

5. Run the desktop app:

   ```bash
   python pBurt/VillageDB.py
   ```

   This opens the **Village DB** landing window; click **Volunteers** to open the overview window. 

## Usage Notes

- In the Volunteers window:
  - Double-click a row to select a volunteer.
  - Use **Add** to create a new volunteer.
  - Use **Edit** to modify the selected volunteer’s details.
  - Use **Delete** to remove the selected volunteer.
  - Use **Check In** to start a volunteer session.
  - Use **Check Out** to end the latest open session for that volunteer. 
- Volunteers currently checked in are highlighted in the table. 
- The **Visitors**, **Items**, and **Kits** buttons are placeholders and currently show “not implemented yet” messages. 
