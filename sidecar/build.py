import PyInstaller.__main__

PyInstaller.__main__.run([
    './src/app.py',
    '--onefile',
    '--windowed',
    '--name=python-script' # need to suffix this with the Rust -$TARGET_TRIPLE
])
