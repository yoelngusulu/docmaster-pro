from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageOps


SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
}


def prepare_image(image_path: Path) -> Image.Image:
    """Open an image, apply EXIF rotation, and convert it to RGB."""
    image = Image.open(image_path)
    image = ImageOps.exif_transpose(image)

    if image.mode in ("RGBA", "LA"):
        background = Image.new("RGB", image.size, "white")

        if image.mode == "RGBA":
            background.paste(image, mask=image.getchannel("A"))
        else:
            background.paste(image.convert("RGBA"), mask=image.getchannel("A"))

        image.close()
        return background

    if image.mode == "P":
        converted = image.convert("RGBA")
        image.close()

        background = Image.new("RGB", converted.size, "white")
        background.paste(converted, mask=converted.getchannel("A"))
        converted.close()

        return background

    if image.mode != "RGB":
        converted = image.convert("RGB")
        image.close()
        return converted

    return image


def convert_images_to_pdf(output_path: Path, image_paths: list[Path]) -> None:
    if not image_paths:
        raise ValueError("No image files were provided.")

    prepared_images: list[Image.Image] = []

    try:
        for image_path in image_paths:
            if not image_path.exists():
                raise FileNotFoundError(f"Image not found: {image_path}")

            if image_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
                raise ValueError(f"Unsupported image format: {image_path.name}")

            prepared_images.append(prepare_image(image_path))

        output_path.parent.mkdir(parents=True, exist_ok=True)

        first_image = prepared_images[0]
        remaining_images = prepared_images[1:]

        first_image.save(
            output_path,
            "PDF",
            save_all=True,
            append_images=remaining_images,
            resolution=150.0,
        )

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RuntimeError("The PDF file was not created.")

    finally:
        for image in prepared_images:
            image.close()


def main() -> int:
    if len(sys.argv) < 3:
        print(
            "Usage: python image_to_pdf.py OUTPUT.pdf IMAGE1 [IMAGE2 ...]",
            file=sys.stderr,
        )
        return 1

    output_path = Path(sys.argv[1]).resolve()
    image_paths = [Path(value).resolve() for value in sys.argv[2:]]

    try:
        convert_images_to_pdf(output_path, image_paths)
        print(str(output_path))
        return 0
    except Exception as error:
        print(f"Image to PDF conversion failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())