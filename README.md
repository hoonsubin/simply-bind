# Simply Bind

> A simple tool for binding a collection of images into a PDF file for e-readers and increased file portability.

## What It Can Do

This is a simple tool made using Tauri v2 and Python to bind a collection of images (images in a folder or a zip file) into a PDF file for increased portability.
Simply Bind is a hobby project I started to learn how to build with Tauri v2 and using its powerful sidecar feature to sideload a Python script for the main process. The main purpose was to organize my growing collection of manga in my desktop (since I prefer to read them offline DRM-free).

Currently, Simply Bind offers the following features:

- Bind a folder or ZIP archive of images into a PDF
- Process collections in bulk
- Supports `WebP`, `JPG`, and `PNG`
- An easy-to-use GUI

Note that the binding process is lossy at the moment. Although we can add a feature that allows the user to toggle lossy or losses binding, I wanted to prioritize simplicity for my specific use case instead of diverse functionality.

At the moment, you'll have to build the app from source to use it.
Though I will work on an automated build workflow, so it's easy for the users to download the production release.

## The Tech Stack

This program uses [Tauri v2](https://v2.tauri.app/) and a Python script as an embedded binary.
For the front-end, it uses [CoreUI](https://coreui.io/react/docs/getting-started/introduction/) with React.js TypeScript.
No particular reason other than personal taste.

### Project Structure

- The main front-end code (TypeScript/React): `/src`
- The backend (Rust): `/src-tauri`
- The sidecar script (Python) for converting the images into a PDF: `/sidecar`

You must re-build the Python script again using `pyinstaller` for each platform every time the script changes.
Furthermore, a binary with the same name and a `-$TARGET_TRIPLE` suffix must exist on the specified path, which is defined in `/src-tauri/tauri.conf.json` and `/src-tauri/capabilities/migrated.json`.
You can learn more about this [here](https://v2.tauri.app/develop/sidecar/).

## Building from Source

### Prerequisite

#### System dependencies

For system dependencies, please refer to [this documentation](https://v2.tauri.app/start/prerequisites/).

For all systems, make sure you have [Rust installed](https://www.rust-lang.org/tools/install).

Make sure that you have Node.js 22 or a newer version, and install `Yarn`.

### Commands

```bash
yarn # install project dependencies

yarn tauri dev # open the dev build locally

yarn tauri build # build the production version for the current platform (OS)
```
