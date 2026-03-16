from logging import root
import tkinter as tk
from tkinter import ttk, messagebox
import psycopg2
from psycopg2 import sql
from datetime import datetime
from PIL import Image, ImageTk

# ---------- Color Variables ----------
NAVY = "#023047"     # deep blue
YELLOW = "#ffb703"   # warm accent
BG = "#ffffff"

# ---------- DB CONFIG ----------
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "p@$$word"
DB_HOST = "127.0.0.1"
DB_PORT = "5432"

# ---------- DB HELPERS ----------
def get_connection():
    return psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
    )  # [web:101][web:104][web:107]

def insert_volunteer(first_name: str, last_name: str, phone: str, email: str, qrcode: str):
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        query = sql.SQL("""
            INSERT INTO volunteers (first_name, last_name, phone, email, qrcode)
            VALUES (%s, %s, %s, %s, %s)
        """)
        cur.execute(query, (first_name, last_name, phone, email, qrcode))
        conn.commit()
        cur.close()
    finally:
        if conn is not None:
            conn.close()

def fetch_volunteers():
    conn = None
    rows = []
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, first_name, last_name, phone, email, date_added
            FROM volunteers
            ORDER BY last_name, first_name
        """)
        rows = cur.fetchall()
        cur.close()
    finally:
        if conn is not None:
            conn.close()
    return rows

def update_volunteer(vol_id: int, first_name: str, last_name: str, phone: str, email: str, qrcode: str):
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        query = sql.SQL("""
            UPDATE volunteers
            SET first_name = %s,
                last_name  = %s,
                phone      = %s,
                email      = %s,
                qrcode     = %s
            WHERE id = %s
        """)
        cur.execute(query, (first_name, last_name, phone, email, qrcode, vol_id))
        conn.commit()
        cur.close()
    finally:
        if conn is not None:
            conn.close()

def delete_volunteer(vol_id: int):
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM volunteers WHERE id = %s", (vol_id,))
        conn.commit()
        cur.close()
    finally:
        if conn is not None:
            conn.close()

def insert_check_in(volunteer_id: int):
    """Insert a new row into volunteer_hours with current timestamp as time_in."""
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO volunteer_hours (volunteer_id, time_in)
            VALUES (%s, NOW())
            """,
            (volunteer_id,),
        )
        conn.commit()
        cur.close()
    finally:
        if conn is not None:
            conn.close()

def insert_check_out(volunteer_id: int):
    """
    Set time_out = NOW() on the most recent open volunteer_hours row
    for this volunteer (where time_out IS NULL).
    """
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE volunteer_hours
            SET time_out = NOW()
            WHERE id = (
                SELECT id
                FROM volunteer_hours
                WHERE volunteer_id = %s
                  AND time_out IS NULL
                ORDER BY time_in DESC
                LIMIT 1
            )
            """,
            (volunteer_id,),
        )
        conn.commit()
        cur.close()
    finally:
        if conn is not None:
            conn.close()

def fetch_checked_in_volunteers():
    """
    Return a set of volunteer IDs that have a row in volunteer_hours
    where time_in is set and time_out is NULL.
    """
    conn = None
    ids = set()
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT DISTINCT volunteer_id
            FROM volunteer_hours
            WHERE time_in IS NOT NULL
              AND time_out IS NULL
            """
        )
        rows = cur.fetchall()
        cur.close()
        ids = {r[0] for r in rows}
    finally:
        if conn is not None:
            conn.close()
    return ids

# ---------- FORMS ----------
def open_add_volunteer(parent, refresh_callback):
    win = tk.Toplevel(parent)
    win.title("Add Volunteer")

    tk.Label(win, text="First Name").grid(row=0, column=0, sticky="e", padx=5, pady=5)
    tk.Label(win, text="Last Name").grid(row=1, column=0, sticky="e", padx=5, pady=5)
    tk.Label(win, text="Phone").grid(row=2, column=0, sticky="e", padx=5, pady=5)
    tk.Label(win, text="Email").grid(row=3, column=0, sticky="e", padx=5, pady=5)
    tk.Label(win, text="QR Code").grid(row=4, column=0, sticky="e", padx=5, pady=5)

    entry_first_name = tk.Entry(win, width=30)
    entry_last_name  = tk.Entry(win, width=30)
    entry_phone      = tk.Entry(win, width=30)
    entry_email      = tk.Entry(win, width=30)
    entry_qrcode     = tk.Entry(win, width=30)

    entry_first_name.grid(row=0, column=1, padx=5, pady=5)
    entry_last_name.grid(row=1, column=1, padx=5, pady=5)
    entry_phone.grid(row=2, column=1, padx=5, pady=5)
    entry_email.grid(row=3, column=1, padx=5, pady=5)
    entry_qrcode.grid(row=4, column=1, padx=5, pady=5)

    def submit_form():
        first_name = entry_first_name.get().strip()
        last_name  = entry_last_name.get().strip()
        phone      = entry_phone.get().strip()
        email      = entry_email.get().strip()
        qrcode     = entry_qrcode.get().strip()

        if not first_name or not last_name:
            messagebox.showerror("Validation error", "First and last name are required.")
            return

        try:
            insert_volunteer(first_name, last_name, phone, email, qrcode)
            messagebox.showinfo("Success", "Volunteer added.")
            refresh_callback()
            win.destroy()
        except Exception as e:
            messagebox.showerror("Database error", str(e))

    tk.Button(win, text="Save", **btn_style, command=submit_form).grid(row=5, column=0, padx=5, pady=10)
    tk.Button(win, text="Cancel", **btn_style, command=win.destroy).grid(row=5, column=1, padx=5, pady=10, sticky="w")

def open_edit_volunteer(parent: tk.Widget, volunteer_data: tuple, refresh_callback) -> None:
    """
    volunteer_data is a tuple: (id, first_name, last_name, phone, email, date_added)
    """
    vol_id, first_name, last_name, phone, email, _date_added = volunteer_data

    win = tk.Toplevel(parent)
    win.title(f"Edit Volunteer #{vol_id}")

    tk.Label(win, text="First Name").grid(row=0, column=0, sticky="e", padx=5, pady=5)
    tk.Label(win, text="Last Name").grid(row=1, column=0, sticky="e", padx=5, pady=5)
    tk.Label(win, text="Phone").grid(row=2, column=0, sticky="e", padx=5, pady=5)
    tk.Label(win, text="Email").grid(row=3, column=0, sticky="e", padx=5, pady=5)
    tk.Label(win, text="QR Code").grid(row=4, column=0, sticky="e", padx=5, pady=5)

    entry_first_name = tk.Entry(win, width=30)
    entry_last_name  = tk.Entry(win, width=30)
    entry_phone      = tk.Entry(win, width=30)
    entry_email      = tk.Entry(win, width=30)
    entry_qrcode     = tk.Entry(win, width=30)

    entry_first_name.grid(row=0, column=1, padx=5, pady=5)
    entry_last_name.grid(row=1, column=1, padx=5, pady=5)
    entry_phone.grid(row=2, column=1, padx=5, pady=5)
    entry_email.grid(row=3, column=1, padx=5, pady=5)
    entry_qrcode.grid(row=4, column=1, padx=5, pady=5)

    # Pre-fill fields
    entry_first_name.insert(0, first_name or "")
    entry_last_name.insert(0, last_name or "")
    entry_phone.insert(0, phone or "")
    entry_email.insert(0, email or "")

    def save_changes():
        fn = entry_first_name.get().strip()
        ln = entry_last_name.get().strip()
        ph = entry_phone.get().strip()
        em = entry_email.get().strip()
        qr = entry_qrcode.get().strip()

        if not fn or not ln:
            messagebox.showerror("Validation error", "First and last name are required.")
            return

        try:
            update_volunteer(vol_id, fn, ln, ph, em, qr)
            messagebox.showinfo("Success", "Volunteer updated.")
            refresh_callback()
            win.destroy()
        except Exception as e:
            messagebox.showerror("Database error", str(e))

    tk.Button(win, text="Save", **btn_style, command=save_changes).grid(row=5, column=0, padx=5, pady=10)
    tk.Button(win, text="Cancel", **btn_style, command=win.destroy).grid(row=5, column=1, padx=5, pady=10, sticky="w")

# ---------- MAIN OVERVIEW WINDOW ----------
def create_volunteer_overview(parent):
    root = tk.Toplevel(parent)
    root.title("Volunteer Overview")
    root.geometry("900x450")
    root.configure(bg=BG)

    top_frame = tk.Frame(root, bg=BG)
    ...
    btn_refresh = tk.Button(top_frame, text="Refresh")
    btn_add     = tk.Button(top_frame, text="Add Volunteer")

    btn_refresh.pack(side=tk.LEFT, padx=5)
    btn_add.pack(side=tk.LEFT, padx=5)

    # Table (Treeview)
    table_frame = tk.Frame(root)
    table_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

    columns = ("id", "first_name", "last_name", "phone", "email", "date_added")
    tree = ttk.Treeview(table_frame, columns=columns, show="headings")
    tree.heading("id", text="ID")
    tree.heading("first_name", text="First Name")
    tree.heading("last_name", text="Last Name")
    tree.heading("phone", text="Phone")
    tree.heading("email", text="Email")
    tree.heading("date_added", text="Date Added")

    tree.column("id", width=50, anchor="center")
    tree.column("first_name", width=120)
    tree.column("last_name", width=120)
    tree.column("phone", width=120)
    tree.column("email", width=200)
    tree.column("date_added", width=100, anchor="center")

    # tag for checked-in rows
    tree.tag_configure("checked_in", background="#e8ffe8")

    tree.pack(fill=tk.BOTH, expand=True)

    scrollbar = ttk.Scrollbar(table_frame, orient="vertical", command=tree.yview)
    tree.configure(yscrollcommand=scrollbar.set)
    scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    # Bottom buttons: Edit, Delete, Check In, Check Out
    bottom_frame = tk.Frame(root, bg=BG)

    bottom_frame.pack(fill=tk.X, padx=10, pady=5)

    btn_edit = tk.Button(bottom_frame, text="Edit", state=tk.DISABLED)
    btn_delete = tk.Button(bottom_frame, text="Delete", state=tk.DISABLED)
    btn_check_in = tk.Button(bottom_frame, text="Check In", state=tk.DISABLED)
    btn_check_out = tk.Button(bottom_frame, text="Check Out", state=tk.DISABLED)

    btn_edit.pack(side=tk.LEFT, padx=5)
    btn_delete.pack(side=tk.LEFT, padx=5)
    btn_check_in.pack(side=tk.LEFT, padx=20)
    btn_check_out.pack(side=tk.LEFT, padx=5)

    # Helpers
    def get_selected_volunteer():
        selected = tree.selection()
        if not selected:
            return None
        item_id = selected[0]
        values = tree.item(item_id, "values")
        # values = (id, first_name, last_name, phone, email, date_added)
        return values

    # cache of current checked-in IDs for the overview
    checked_in_ids = set()

    def update_button_states():
        values = get_selected_volunteer()
        if not values:
            btn_edit.config(state=tk.DISABLED)
            btn_delete.config(state=tk.DISABLED)
            btn_check_in.config(state=tk.DISABLED)
            btn_check_out.config(state=tk.DISABLED)
            return

        vol_id = int(values[0])
        btn_edit.config(state=tk.NORMAL)
        btn_delete.config(state=tk.NORMAL)

        if vol_id in checked_in_ids:
            # already checked in
            btn_check_in.config(state=tk.DISABLED)
            btn_check_out.config(state=tk.NORMAL)
        else:
            btn_check_in.config(state=tk.NORMAL)
            btn_check_out.config(state=tk.DISABLED)


    def on_tree_select(event):
        update_button_states()

    tree.bind("<<TreeviewSelect>>", on_tree_select)

    def load_volunteers():
        nonlocal checked_in_ids
        for row in tree.get_children():
            tree.delete(row)
        try:
            rows = fetch_volunteers()
            checked_in_ids = fetch_checked_in_volunteers()
            for r in rows:
                vol_id = r[0]
                tags = ("checked_in",) if vol_id in checked_in_ids else ()
                tree.insert("", tk.END, values=r, tags=tags)
        except Exception as e:
            messagebox.showerror("Database error", str(e))
        btn_edit.config(state=tk.DISABLED)
        btn_delete.config(state=tk.DISABLED)
        btn_check_in.config(state=tk.DISABLED)
        btn_check_out.config(state=tk.DISABLED)

    def do_edit():
        values = get_selected_volunteer()
        if not values:
            return
        open_edit_volunteer(root, values, load_volunteers)

    def do_delete():
        values = get_selected_volunteer()
        if not values:
            return
        vol_id = int(values[0])  # cast to int
        name = f"{values[1]} {values[2]}"
        if messagebox.askyesno("Confirm delete", f"Delete volunteer '{name}' (ID {vol_id})?"):
            try:
                delete_volunteer(vol_id)
                load_volunteers()
            except Exception as e:
                messagebox.showerror("Database error", str(e))

    def do_check_in():
        values = get_selected_volunteer()
        if not values:
            messagebox.showerror("Validation error", "Please select a volunteer.")
            return
        vol_id = int(values[0])  # <--- CAST HERE
        if vol_id in checked_in_ids:
            messagebox.showinfo("Already checked in", "This volunteer is already checked in.")
            return
        try:
            insert_check_in(vol_id)
            checked_in_ids.add(vol_id)
            for item_id in tree.selection():
                tree.item(item_id, tags=("checked_in",))
            messagebox.showinfo("Success", "Check-in time recorded.")
            update_button_states()
        except Exception as e:
            messagebox.showerror("Database error", str(e))


    def do_check_out():
        values = get_selected_volunteer()
        if not values:
            messagebox.showerror("Validation error", "Please select a volunteer.")
            return
        vol_id = int(values[0])  # <--- CAST HERE
        if vol_id not in checked_in_ids:
            messagebox.showinfo("Not checked in", "This volunteer is not currently checked in.")
            return
        try:
            insert_check_out(vol_id)
            checked_in_ids.discard(vol_id)
            for item_id in tree.selection():
                tree.item(item_id, tags=())
            messagebox.showinfo("Success", "Check-out time recorded.")
            update_button_states()
        except Exception as e:
            messagebox.showerror("Database error", str(e))


    # Wire top buttons
    btn_refresh.config(command=load_volunteers)
    btn_add.config(command=lambda: open_add_volunteer(root, load_volunteers))

    # Wire bottom buttons
    btn_edit.config(command=do_edit)
    btn_delete.config(command=do_delete)
    btn_check_in.config(command=do_check_in)
    btn_check_out.config(command=do_check_out)

    # Initial load
    load_volunteers()

def create_landing_page():
    root = tk.Tk()
    root.title("Village DB")
    root.geometry("400x450")
    root.configure(bg=BG)

    frame = tk.Frame(root, bg=BG)
    frame.pack(expand=True)

    # --- Logo ---
    try:
        img = Image.open("village-logo.webp")
        img = img.resize((300, 200))
        logo_image = ImageTk.PhotoImage(img)
        logo_label = tk.Label(frame, image=logo_image, bg=BG)
        logo_label.image = logo_image
        logo_label.pack(pady=5)
    except Exception:
        tk.Label(frame, text="Village", font=("Arial", 18, "bold"),
                 bg=BG, fg=NAVY).pack(pady=10)

    tk.Label(frame, text="Select a section:",
             font=("Arial", 14),
             bg=BG, fg=NAVY).pack(pady=10)

    btn_style = dict(width=20, bg=NAVY, fg="white",
                     activebackground="#03567a",
                     activeforeground="white")

    def open_volunteers():
        create_volunteer_overview(root)

    def open_visitors():
        messagebox.showinfo("Visitors", "Visitors UI not implemented yet.")

    def open_items():
        messagebox.showinfo("Items", "Items UI not implemented yet.")

    def open_kits():
        messagebox.showinfo("Kits", "Kits UI not implemented yet.")

    tk.Button(frame, text="Volunteers", **btn_style,
              command=open_volunteers).pack(pady=5)
    tk.Button(frame, text="Visitors", **btn_style,
              command=open_visitors).pack(pady=5)
    tk.Button(frame, text="Items", **btn_style,
              command=open_items).pack(pady=5)
    tk.Button(frame, text="Kits", **btn_style,
              command=open_kits).pack(pady=5)

    root.mainloop()

if __name__ == "__main__":
    create_landing_page()
