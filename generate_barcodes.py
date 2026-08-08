import pandas as pd
import barcode
from barcode.writer import ImageWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
import os
import io
import tempfile

def generate_pdf():
    df = pd.read_excel("The Village SKU's Rev2.xlsx", header=None)
    
    skus = []
    current_dept = ""
    current_dept_code = ""
    
    # Map column index to size name from row 4
    size_names = {}
    row4 = [str(x) for x in df.iloc[4].values]
    for i in range(4, 14):
        if row4[i] != 'nan':
            size_names[i] = row4[i]
            
    for index, row in df.iterrows():
        row_vals = [str(x) for x in row.values]
        
        # New Department
        if row_vals[0] != 'nan' and row_vals[2] != 'nan':
            current_dept = row_vals[0]
            current_dept_code = str(row_vals[2]).zfill(2)
            continue
            
        # New Item
        if row_vals[1] != 'nan' and row_vals[2] != 'nan' and row_vals[3] != 'nan':
            item_name = row_vals[1]
            dept_code = str(row_vals[2]).zfill(2)
            item_code = str(row_vals[3]).zfill(2)
            
            has_sizes = False
            for i in range(4, 14):
                if row_vals[i] != 'nan':
                    has_sizes = True
                    size_code = str(row_vals[i]).replace(".0", "")
                    # Ensure size_code is properly formatted if it's a single digit, wait, some are '00', '024M', etc.
                    if len(size_code) == 1 and size_code.isdigit():
                        size_code = "0" + size_code
                    sku = f"{dept_code}{item_code}{size_code}"
                    desc = f"{current_dept} - {item_name} - {size_names.get(i, size_code)}"
                    skus.append((sku, desc))
            
            if not has_sizes:
                sku = f"{dept_code}{item_code}"
                desc = f"{current_dept} - {item_name}"
                skus.append((sku, desc))
                
    pdf_path = "barcodes.pdf"
    c = canvas.Canvas(pdf_path, pagesize=letter)
    width, height = letter
    
    x_margin = 0.5 * inch
    y_margin = height - 1 * inch
    
    x_step = 2.5 * inch
    y_step = 1.5 * inch
    
    x = x_margin
    y = y_margin
    
    code128 = barcode.get_barcode_class('code128')
    
    print(f"Total SKUs found: {len(skus)}")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        for sku, desc in skus:
            # Generate barcode image
            img_path = os.path.join(tmpdir, sku)
            code = code128(sku, writer=ImageWriter())
            code.save(img_path)
            
            # Draw on PDF
            c.setFont("Helvetica", 8)
            c.drawString(x, y + 0.1 * inch, desc[:35]) # truncate long descriptions
            c.drawImage(img_path + ".png", x, y - 0.7 * inch, width=2*inch, height=0.7*inch)
            
            x += x_step
            if x > width - x_step:
                x = x_margin
                y -= y_step
                
            if y < 1 * inch:
                c.showPage()
                x = x_margin
                y = y_margin
                
    c.save()
    print(f"Saved PDF to {pdf_path}")

if __name__ == '__main__':
    generate_pdf()
