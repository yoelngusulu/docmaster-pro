import os
import sys

from pdf2docx import Converter


def convert_pdf_to_word(input_pdf: str, output_docx: str) -> None:
    """
    Convert a PDF file into a Word DOCX file.
    """

    if not os.path.isfile(input_pdf):
        raise FileNotFoundError(
            f"Input PDF was not found: {input_pdf}"
        )

    output_directory = os.path.dirname(output_docx)

    if output_directory:
        os.makedirs(output_directory, exist_ok=True)

    converter = Converter(input_pdf)

    try:
        converter.convert(
            output_docx,
            start=0,
            end=None,
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

    input_pdf = os.path.abspath(sys.argv[1])
    output_docx = os.path.abspath(sys.argv[2])

    try:
        convert_pdf_to_word(
            input_pdf=input_pdf,
            output_docx=output_docx,
        )

        if not os.path.isfile(output_docx):
            raise RuntimeError(
                "The Word document was not created."
            )

        print(f"SUCCESS:{output_docx}")

    except Exception as error:
        print(
            f"ERROR:{str(error)}",
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()