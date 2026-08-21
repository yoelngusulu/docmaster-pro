import os
import sys

import fitz
from pdf2docx import Converter


def get_page_count(pdf_path: str) -> int:
    document = fitz.open(pdf_path)

    try:
        return len(document)
    finally:
        document.close()


def convert_pdf_to_word(
    input_pdf: str,
    output_docx: str,
) -> None:
    if not os.path.isfile(input_pdf):
        raise FileNotFoundError(
            f"Input PDF was not found: {input_pdf}"
        )

    output_directory = os.path.dirname(
        output_docx
    )

    if output_directory:
        os.makedirs(
            output_directory,
            exist_ok=True,
        )

    page_count = get_page_count(
        input_pdf
    )

    print(
        f"INFO:PDF pages={page_count}",
        flush=True,
    )

    converter = Converter(input_pdf)

    try:
        # Multiprocessing is useful mainly
        # when the document has several pages.
        use_multiprocessing = (
            page_count >= 4
        )

        converter.convert(
            output_docx,
            start=0,
            end=None,
            multi_processing=
                use_multiprocessing,
            cpu_count=4
            if use_multiprocessing
            else 1,

            # Faster parsing.
            # We can enable these later
            # for documents where table
            # preservation is essential.
            parse_lattice_table=False,
            parse_stream_table=False,
        )

    finally:
        converter.close()


def main() -> None:
    if len(sys.argv) != 3:
        print(
            "Usage: python pdf_to_word.py "
            "<input.pdf> <output.docx>",
            file=sys.stderr,
        )

        sys.exit(1)

    input_pdf = os.path.abspath(
        sys.argv[1]
    )

    output_docx = os.path.abspath(
        sys.argv[2]
    )

    try:
        convert_pdf_to_word(
            input_pdf=input_pdf,
            output_docx=output_docx,
        )

        if not os.path.isfile(
            output_docx
        ):
            raise RuntimeError(
                "The Word document was not created."
            )

        print(
            f"SUCCESS:{output_docx}",
            flush=True,
        )

    except Exception as error:
        print(
            f"ERROR:{str(error)}",
            file=sys.stderr,
            flush=True,
        )

        sys.exit(1)


if __name__ == "__main__":
    main()