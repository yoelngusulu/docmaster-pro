import fitz
import os
import sys

pdf_path = sys.argv[1]
output_folder = sys.argv[2]

os.makedirs(output_folder, exist_ok=True)

doc = fitz.open(pdf_path)

for page_number in range(len(doc)):
    page = doc.load_page(page_number)

    pix = page.get_pixmap(dpi=300)

    output_file = os.path.join(
        output_folder,
        f"page_{page_number + 1}.png"
    )

    pix.save(output_file)

print("Conversion completed successfully.")