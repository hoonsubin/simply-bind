import os
import helper
import img2pdf
import argparse

def app(image_collection_path_input: str, pdf_name: str, output_path: str):
    image_collection_path = image_collection_path_input
    is_zip_input = image_collection_path.lower().endswith(".zip")

    if not is_zip_input and not os.path.isdir(image_collection_path):
        raise Exception("The provided path is not a directory or a zip file")

    if not os.path.isabs(image_collection_path):
        image_collection_path = os.path.abspath(image_collection_path)

    pdf_to_save = output_path
    if not os.path.isabs(pdf_to_save):
        pdf_to_save = os.path.abspath(output_path)

    pdf_to_save = os.path.join(pdf_to_save, pdf_name + ".pdf")
    images_to_add = []
    for converted_image in helper.images_to_be_converted(image_collection_path):
        images_to_add.append(converted_image)

    with open(pdf_to_save, "wb") as pdf_file:
        print("Writing the file")
        pdf_file.write(img2pdf.convert(images_to_add))


def main():
    parser = argparse.ArgumentParser(description="This is a console app")

    parser.add_argument('-o', '--output', required=True, type=str, help="The output directory for where the created PDF file will be saved")
    parser.add_argument('-n', '--name', required=True, type=str, help="The name of the generated PDF file without the file extension")
    parser.add_argument('-i', '--input', required=True, type=str, help="The input folder containing the image files that will be combined")

    args = parser.parse_args()

    app(args.input, args.name, args.output)

if __name__ == "__main__":

    main()
