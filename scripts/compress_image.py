from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageOps


SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


def prepare_jpeg_image(
    image: Image.Image,
) -> Image.Image:
    """
    JPEG does not support transparency.

    Transparent images are placed on a white
    background before saving as JPEG.
    """

    if image.mode in ("RGBA", "LA"):
        background = Image.new(
            "RGB",
            image.size,
            (255, 255, 255),
        )

        alpha_channel = image.getchannel(
            "A"
        )

        background.paste(
            image.convert("RGB"),
            mask=alpha_channel,
        )

        return background

    if image.mode == "P":
        if "transparency" in image.info:
            rgba_image = image.convert(
                "RGBA"
            )

            background = Image.new(
                "RGB",
                rgba_image.size,
                (255, 255, 255),
            )

            background.paste(
                rgba_image,
                mask=rgba_image.getchannel(
                    "A"
                ),
            )

            return background

        return image.convert("RGB")

    if image.mode not in ("RGB", "L"):
        return image.convert("RGB")

    return image


def save_jpeg(
    image: Image.Image,
    output_path: Path,
) -> None:
    jpeg_image = prepare_jpeg_image(
        image
    )

    jpeg_image.save(
        output_path,
        format="JPEG",
        quality=75,
        optimize=True,
        progressive=True,
        subsampling="4:2:0",
    )


def save_png(
    image: Image.Image,
    output_path: Path,
) -> None:
    """
    PNG compression is lossless.
    """

    image.save(
        output_path,
        format="PNG",
        optimize=True,
        compress_level=9,
    )


def save_webp(
    image: Image.Image,
    output_path: Path,
) -> None:
    if image.mode not in (
        "RGB",
        "RGBA",
        "L",
        "LA",
    ):
        image = image.convert("RGBA")

    image.save(
        output_path,
        format="WEBP",
        quality=75,
        method=6,
    )


def compress_image(
    input_path: Path,
    output_path: Path,
) -> dict[str, int | float | str]:
    extension = (
        input_path.suffix.lower()
    )

    if (
        extension
        not in SUPPORTED_EXTENSIONS
    ):
        raise ValueError(
            "Only JPG, JPEG, PNG and "
            "WEBP images are supported."
        )

    if not input_path.exists():
        raise FileNotFoundError(
            "The input image does not exist."
        )

    if input_path.stat().st_size == 0:
        raise ValueError(
            "The input image is empty."
        )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    original_size = (
        input_path.stat().st_size
    )

    with Image.open(
        input_path
    ) as original_image:
        image = ImageOps.exif_transpose(
            original_image
        )

        image.load()

        if extension in (
            ".jpg",
            ".jpeg",
        ):
            save_jpeg(
                image,
                output_path,
            )

        elif extension == ".png":
            save_png(
                image,
                output_path,
            )

        elif extension == ".webp":
            save_webp(
                image,
                output_path,
            )

    if not output_path.exists():
        raise RuntimeError(
            "The compressed image "
            "was not created."
        )

    compressed_size = (
        output_path.stat().st_size
    )

    # Do not return a file larger than
    # the original image.
    if compressed_size >= original_size:
        shutil.copy2(
            input_path,
            output_path,
        )

        compressed_size = (
            output_path.stat().st_size
        )

    saved_bytes = max(
        0,
        original_size -
        compressed_size,
    )

    reduction_percentage = (
        saved_bytes
        / original_size
        * 100
        if original_size > 0
        else 0
    )

    return {
        "status": "success",
        "original_size": original_size,
        "compressed_size": compressed_size,
        "saved_bytes": saved_bytes,
        "reduction_percentage": round(
            reduction_percentage,
            2,
        ),
        "output_file": str(
            output_path
        ),
    }


def main() -> None:
    if len(sys.argv) != 3:
        raise ValueError(
            "Usage: python "
            "compress_image.py "
            "<input_path> "
            "<output_path>"
        )

    input_path = Path(
        sys.argv[1]
    ).resolve()

    output_path = Path(
        sys.argv[2]
    ).resolve()

    result = compress_image(
        input_path,
        output_path,
    )

    print(
        json.dumps(result),
        flush=True,
    )


if __name__ == "__main__":
    try:
        main()

    except Exception as error:
        print(
            f"Image compression failed: "
            f"{error}",
            file=sys.stderr,
            flush=True,
        )

        sys.exit(1)