import sys
from pathlib import Path

import pandas as pd
import pdfplumber


def clean_table(table):
    """Remove completely empty rows and columns."""
    if not table:
        return None

    df = pd.DataFrame(table)

    df = df.replace(r"^\s*$", None, regex=True)

    df = df.dropna(
        axis=0,
        how="all"
    )

    df = df.dropna(
        axis=1,
        how="all"
    )

    if df.empty:
        return None

    return df


def convert_pdf_to_excel(
    input_pdf: str,
    output_excel: str
) -> None:
    input_path = Path(input_pdf)
    output_path = Path(output_excel)

    if not input_path.exists():
        raise FileNotFoundError(
            f"PDF file not found: {input_path}"
        )

    tables_found = False

    with pdfplumber.open(input_path) as pdf:
        with pd.ExcelWriter(
            output_path,
            engine="openpyxl"
        ) as writer:

            for page_number, page in enumerate(
                pdf.pages,
                start=1
            ):
                tables = page.extract_tables()

                page_tables = []

                for table in tables:
                    cleaned_table = clean_table(table)

                    if cleaned_table is not None:
                        page_tables.append(cleaned_table)

                if not page_tables:
                    continue

                tables_found = True

                start_row = 0
                sheet_name = f"Page_{page_number}"

                for table_number, dataframe in enumerate(
                    page_tables,
                    start=1
                ):
                    dataframe.to_excel(
                        writer,
                        sheet_name=sheet_name,
                        startrow=start_row,
                        index=False,
                        header=False
                    )

                    start_row += len(dataframe) + 3

            if not tables_found:
                pd.DataFrame(
                    {
                        "Message": [
                            "No tables were detected in this PDF."
                        ]
                    }
                ).to_excel(
                    writer,
                    sheet_name="No_Tables_Found",
                    index=False
                )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            "Usage: python pdf_to_excel.py "
            "input.pdf output.xlsx"
        )
        sys.exit(1)

    try:
        convert_pdf_to_excel(
            sys.argv[1],
            sys.argv[2]
        )

        print("PDF converted to Excel successfully.")

    except Exception as error:
        print(
            f"PDF to Excel conversion failed: {error}",
            file=sys.stderr
        )
        sys.exit(1)