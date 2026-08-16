import pandas as pd
import barcode
from barcode.writer import ImageWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
import os
import tempfile

def generate_pdf():
    pdf_path = "barcodes.pdf"
    c = canvas.Canvas(pdf_path, pagesize=letter)
    width, height = letter
    
    x_margin = 0.5 * inch
    y_margin = height - 1.2 * inch
    x_step = 4.0 * inch
    y_step = 1.5 * inch
    
    code39 = barcode.get_barcode_class('code39')
    
    # We define pages explicitly to match the user requirements exactly.
    # Format for items: (sku, description)
    pages = [
        # BABIES PAGE(S)
        {
            "title": "BABIES (0-5T)",
            "items": [
                ("0101B", "Babies - Pants 0-5T"),
                ("0102B", "Babies - Shirts 0-5T"),
                ("0104B", "Babies - Shorts 0-5T"),
                ("0110B", "Babies - Pajamas 0-5T"),
                ("0108B", "Babies - Socks 0-5T"),
                ("0103B", "Babies - Dress 0-5T"),
                ("0105B", "Babies - Hoodie 0-5T"),
                ("0116B", "Babies - Onesies 0-5T"),
                ("0119B", "Babies - Swimsuit 0-5T"),
                
                ("0201", "Babies - Diapers"),
                ("0202", "Babies - Pullups"),
                ("0227", "Babies - Bottles"),
                ("0203", "Babies - Wipes"),
                ("0204", "Babies - Bibs"),
                ("0205", "Babies - Burpers"),
                ("0206", "Babies - Diaper Bag"),
                ("0207", "Babies - Crib"),
                ("0208", "Babies - Crib Mattress"),
                ("0209", "Babies - Car Seat"),
                ("0210", "Babies - Stroller"),
                ("0211", "Babies - Bouncer"),
                ("0212", "Babies - Walker"),
                ("0213", "Babies - Potty Chair"),
                ("0214", "Babies - Baby Bath"),
                ("0215", "Babies - Baby Shampoo"),
                ("0216", "Babies - Baby Soap"),
                ("0217", "Babies - Bum Cream"),
                ("0218", "Babies - Baby Carrier"),
                ("0220", "Babies - Car Seat Cover"),
                ("0221", "Babies - Swaddlers"),
                ("0222", "Babies - Highchair"),
                ("0223", "Babies - Misc. Baby items"),
                
                ("0225", "Babies - Toddler Bed"),
                ("0226", "Babies - Crib Sheets"),
                
                ("1401", "Travel - Suitcase"),
                ("1402", "Travel - Duffle Bag"),
                
                ("1701B", "Footwear - Shoes 0-5T"),
                
                # Winter Items at the very bottom
                ("0301B", "Winter - Coats 0-5T"),
                ("0302B", "Winter - Hat 0-5T"),
                ("0303B", "Winter - Gloves 0-5T"),
                ("0304B", "Winter - Snow Pants 0-5T"),
                ("1702B", "Footwear - Winter Boots 0-5T"),
            ]
        },
        # YOUTH & ADULT PAGE(S)
        {
            "title": "YOUTH & ADULT",
            "items": [
                ("0101Y", "Youth/Adult - Pants"),
                ("0102Y", "Youth/Adult - Shirts"),
                ("0104Y", "Youth/Adult - Shorts"),
                ("0110Y", "Youth/Adult - Pajamas"),
                ("0108Y", "Youth/Adult - Socks"),
                ("0109Y", "Youth/Adult - Underwear"),
                
                ("0103Y", "Youth/Adult - Dress"),
                ("0105Y", "Youth/Adult - Hoodie"),
                ("0118Y", "Youth/Adult - Sweats"),
                ("0117Y", "Youth/Adult - Hat"),
                ("0119Y", "Youth/Adult - Swimsuit"),
                
                ("0112Y", "Youth/Adult - Belt"),
                ("0113Y", "Youth/Adult - Bra"),
                ("0114Y", "Youth/Adult - Tie"),
                ("0115Y", "Youth/Adult - Baseball Cap"),
                
                ("0106Y", "Youth/Adult - Formal Dress"),
                ("0107Y", "Youth/Adult - Mens Suit"),
                
                ("1701Y", "Footwear - Shoes"),
                
                ("0501Y", "Bedding - Pillow"),
                ("0502Y", "Bedding - Blanket"),
                
                ("1401", "Travel - Suitcase"),
                ("1402", "Travel - Duffle Bag"),
                
                ("PAGE_BREAK", "Toys & Winter"),
                
                ("1201", "Toys - Books"),
                ("1202", "Toys - Toys"),
                ("1203", "Toys - Stuffies"),
                ("1204", "Toys - Fidget/Sensory items"),
                
                # Winter Items at the very bottom
                ("0301Y", "Winter - Coat"),
                ("0302Y", "Winter - Hat"),
                ("0303Y", "Winter - Gloves"),
                ("0304Y", "Winter - Snow Pants"),
                ("1702Y", "Footwear - Winter Boots"),
            ]
        },
        # GIVING MACHINE
        {
            "title": "GIVING MACHINE",
            "items": [
                ("1801", "Giving Machine - GM Bike"),
                ("1802", "Giving Machine - GM Suitcase"),
                ("1803", "Giving Machine - GM Pajamas"),
                ("1804", "Giving Machine - GM Underwear Bundle"),
                ("1805", "Giving Machine - GM Pots & Pans"),
            ]
        },
        # HYGIENE ITEMS & ACCESSORIES & MISC
        {
            "title": "HYGIENE, ACCESSORIES & MISC",
            "items": [
                ("0701", "Toiletries - Shampoo"),
                ("0702", "Toiletries - Conditioner"),
                ("0703", "Toiletries - Toothpaste"),
                ("0704", "Toiletries - Toothbrush"),
                ("0705", "Toiletries - Floss"),
                ("0706", "Toiletries - Body Wash"),
                ("0707", "Toiletries - Deodorant"),
                ("0708", "Toiletries - Shaving Cream"),
                ("0709", "Toiletries - Razors"),
                ("0710", "Toiletries - Feminine Products"),
                ("0711", "Toiletries - Lotion"),
                ("0712", "Toiletries - Misc. Hygiene items"),
                ("0713", "Toiletries - Hair Brush"),
                ("0714", "Toiletries - Hair Accessories"),
                
                ("0801", "Beauty - Makeup"),
                ("0802", "Beauty - Jewelry"),
                
                ("1001", "Accessories - Purse"),
                ("1002", "Accessories - Wallet"),
                
                ("0901", "Tech - Headphones"),
                ("0902", "Tech - MP3 Player"),
                ("0903", "Tech - Speaker"),
                
                ("1901", "Birthdays - Birthday Room"),
                
                ("1101", "Crafts - Crocheting Kit"),
                ("1102", "Crafts - Art Supply"),
                ("1103", "Crafts - Craft Items"),
                ("1104", "Crafts - Sunglasses"),
                ("1105", "Crafts - Life Jacket"),
                
                ("1301", "Bikes - Helmet"),
                ("1302", "Bikes - Bicycle"),
                ("1303", "Bikes - Bike Lock"),
                ("1304", "Bikes - Misc Bike Gear"),
                
                ("0403", "School Supplies - Packed Book Bag"),
                ("0401", "School Supplies - Book Bag"),
                ("0402", "School Supplies - School Supplies"),
            ]
        },
        # INDEPENDENT LIVING & FURNITURE
        {
            "title": "INDEPENDENT LIVING & FURNITURE",
            "items": [
                ("0501", "Bedding - Pillow"),
                ("0502", "Bedding - Blanket/Quilt"),
                ("0503", "Bedding - Weighted Blanket"),
                ("0504", "Bedding - Twin Sheets"),
                
                ("1501", "Furniture - Dressers"),
                ("1502", "Furniture - Misc."),
                ("1503", "Furniture - Twin Bed"),
                ("1504", "Furniture - Bunk Beds"),
                
                ("0606", "Independent Living - Hot Plate"),
                ("0607", "Independent Living - Slow Cooker"),
                ("0604", "Independent Living - Toilet Paper"),
                ("0602", "Independent Living - Laundry Soap"),
                ("0603", "Independent Living - Food Box"),
                ("0605", "Independent Living - Gift Card"),
                ("0601", "Independent Living - Living Kit"),
            ]
        }
    ]
    
    with tempfile.TemporaryDirectory() as tmpdir:
        for page in pages:
            page_title = page["title"]
            x = x_margin
            y = y_margin
            page_num = 1
            
            # Draw the title at the top of the new category
            c.setFont("Helvetica-Bold", 20)
            c.drawString(x_margin, height - 0.7 * inch, page_title)
            c.line(x_margin, height - 0.8 * inch, width - x_margin, height - 0.8 * inch)
            
            for sku, desc in page["items"]:
                if sku == "PAGE_BREAK":
                    c.showPage()
                    x = x_margin
                    y = y_margin
                    page_num += 1
                    c.setFont("Helvetica-Bold", 20)
                    c.drawString(x_margin, height - 0.7 * inch, f"{page_title} - Page {page_num}")
                    c.line(x_margin, height - 0.8 * inch, width - x_margin, height - 0.8 * inch)
                    continue
                    
                # Generate barcode image
                img_path = os.path.join(tmpdir, sku)
                try:
                    code = code39(sku, writer=ImageWriter(), add_checksum=False)
                    code.save(img_path, options={"font_size": 14})
                except Exception as e:
                    print(f"Error generating barcode for {sku}: {e}")
                    continue
                
                # Draw on PDF
                c.setFont("Helvetica", 10)
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
                    page_num += 1
                    
                    # Redraw the title if it overflowed onto a new page
                    c.setFont("Helvetica-Bold", 20)
                    c.drawString(x_margin, height - 0.7 * inch, f"{page_title} - Page {page_num}")
                    c.line(x_margin, height - 0.8 * inch, width - x_margin, height - 0.8 * inch)
            
            # Force a new page for each major category section as requested
            c.showPage()
            
    c.save()
    print(f"Saved PDF to {pdf_path}")

if __name__ == '__main__':
    generate_pdf()
