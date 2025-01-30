# Importing necessary modules
import os
import helper
import img2pdf
import argparse


# Function to process image collection and convert them into PDF
def app(image_collection_path_input: str, pdf_name: str, output_path: str):
    # Check if the input path is a zip file or a directory
    image_collection_path = image_collection_path_input
    is_zip_input = image_collection_path.lower().endswith(".zip")

    # If the input path is neither a zip nor a directory, raise an exception
    if not is_zip_input and not os.path.isdir(image_collection_path):
        raise Exception("The provided path is not a directory or a zip file")

    # Checking if the image collection path is absolute. If not, converting it to absolute.
    if not os.path.isabs(image_collection_path):
        image_collection_path = os.path.abspath(image_collection_path)

    pdf_to_save = output_path

    # Checking if the output path is absolute. If not, converting it to absolute.
    if not os.path.isabs(pdf_to_save):
        pdf_to_save = os.path.abspath(output_path)

    pdf_to_save = os.path.join(pdf_to_save, pdf_name + ".pdf")

    # List to store images that will be converted into PDF file
    images_to_add = []

    # Loop through the list of images to be converted and add them to 'images_to_add'
    for converted_image in helper.images_to_be_converted(image_collection_path):
        images_to_add.append(converted_image)

    # Sort the image list before it is written as a PDF file
    # Note: Because the list contains the string value of the full image path, it might sort based on the dir name too
    images_to_add.sort()

    with open(pdf_to_save, "wb") as pdf_file:
        print("Writing the file")

        # Write the converted PDF to a file
        pdf_file.write(img2pdf.convert(images_to_add))


# The main function that is run when this script is executed directly
def main():
    # Create an ArgumentParser object which handles command line arguments and options
    parser = argparse.ArgumentParser(description="This is a console app")

    # Add arguments for the input, output paths and the name of the generated PDF file
    parser.add_argument('-o', '--output', required=True, type=str,
                        help="The output directory for where the created PDF file will be saved")
    parser.add_argument('-n', '--name', required=True, type=str,
                        help="The name of the generated PDF file without the file extension")
    parser.add_argument('-i', '--input', required=True, type=str,
                        help="The input folder containing the image files that will be combined")

    # Parse command line arguments
    args = parser.parse_args()

    # Run the main application function with the parsed arguments
    app(args.input, args.name, args.output)


# If this script is run directly (not imported as a module), then call the main function
if __name__ == "__main__":
    main()
