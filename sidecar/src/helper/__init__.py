# Importing necessary modules
from PIL import Image
from pathlib import Path
import os
import shutil
import img2pdf
from typing import List
import tempfile
import zipfile


# Function to compress image and convert it into a JPEG format if not already in RGB mode
def compress_image_to_jpg(image, image_name):
    with Image.open(image) as image:
        output_format = (".jpg", "JPEG")

        # If the image is not in RGB mode, convert it to RGB
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Save the converted image as a temporary file
        with tempfile.NamedTemporaryFile(prefix=image_name, suffix=output_format[0], delete=False) as tmp:
            image.save(tmp, output_format[1])
            return tmp.name


# Function to check if a directory exists or not
def check_directory_exists(path: str) -> bool:
    try:
        # Handle both string and Path objects
        directory = Path(path)

        # Check if path exists and is a directory
        if directory.is_dir():
            return True

        # Path exists but is not a directory
        elif directory.exists():
            return False

        # Path doesn't exist
        else:
            return False

    except Exception as e:
        print(f"Error checking directory: {e}")
        return False


# Function to get the contents of a directory and sort them alphabetically
def get_dir_content(path_to_search: str) -> list[str]:
    if not check_directory_exists(path_to_search):
        raise Exception("The provided path does not exist")

    # Get the contents of the directory and sort them alphabetically
    path_content = [os.path.abspath(os.path.join(path_to_search, i)) for i in os.listdir(path_to_search)]
    path_content.sort()

    return path_content


# Function to remove a directory and its contents
def remove_directory(dir_to_remove: str) -> bool:
    try:
        shutil.rmtree(dir_to_remove)
        print("Removing", dir_to_remove, "and its contents")

        return True

    except Exception as e:
        print(f'Error: {str(e)}')

        return False


# Function to convert and bind a list of images into a PDF file
def bind_images_to_pdf(file_name: str, images_to_bind: List[str], output_dir: str):
    output_full_path = os.path.join(output_dir, file_name + ".pdf")

    # Convert the list of images into a PDF file
    pdf_to_save = img2pdf.convert(images_to_bind)

    if not pdf_to_save:
        raise Exception("Failed to bind the images to a PDF file")

    with open(output_full_path, "wb") as pdf_file:
        # Write the converted PDF to a file
        pdf_file.write(pdf_to_save)


# Function to process image collection and convert them into PDF
def images_to_be_converted(src_path: str):

    # Handling zip file contents
    if src_path.lower().endswith('.zip'):
        with zipfile.ZipFile(src_path, "r") as zip_file:
            for file in zip_file.infolist():
                # Only load image files from the zip
                if (file.filename.lower().endswith(".jpg") or
                        file.filename.lower().endswith(".png") or
                        file.filename.lower().endswith(".webp")):
                    with zip_file.open(file) as image_in_zip:
                        image_file_name = Path(file.filename).stem

                        # Yield each converted image
                        yield compress_image_to_jpg(image_in_zip, image_file_name)
    # Handle image file contents
    else:
        for file_or_dir in get_dir_content(src_path):
            if (file_or_dir.lower().endswith(".jpg") or
                    file_or_dir.lower().endswith(".png") or
                    file_or_dir.lower().endswith(".webp")):
                image_file_name = Path(file_or_dir).stem

                # Yield each converted image
                yield compress_image_to_jpg(file_or_dir, image_file_name)


# Specify the functions to export when "from helper import *" is used in other modules
__all__ = [images_to_be_converted, check_directory_exists, get_dir_content, remove_directory, bind_images_to_pdf]
