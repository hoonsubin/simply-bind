import PyInstaller.__main__
import subprocess
import platform
import os
import shutil

# Get Rust-style target triple using rustc
def get_rust_target_triple():
    try:
        output = subprocess.check_output(['rustc', '-Vv'], text=True)
        for line in output.split('\n'):
            if line.startswith('host:'):
                return line.split('host: ')[1].strip()
        raise RuntimeError("Target triple not found in rustc output")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("rustc not found, falling back to platform detection")
        arch = platform.machine().lower()
        system = platform.system().lower()
        if system == 'darwin':
            return f"{arch}-apple-darwin"
        elif system == 'windows':
            return f"{arch}-pc-windows-msvc"
        elif system == 'linux':
            return f"{arch}-unknown-linux-gnu"
        return "unknown-target"

# Get target triple
binary_name = f'python-script-{get_rust_target_triple()}'

PyInstaller.__main__.run([
    './src/app.py',
    '--onefile',
    '--windowed',
    f'--name={binary_name}',
    '--noconfirm'
])


# Ensure the bin format is correct for different platforms
if platform.system() == 'Windows':
    binary_name += '.exe'

source = os.path.join('dist', binary_name)
dest_dir = os.path.normpath(os.path.join('..', 'src-tauri', 'bin'))
destination = os.path.join(dest_dir, binary_name)  # Full destination path

# Create destination directory if needed
os.makedirs(dest_dir, exist_ok=True)

# Move with overwrite logic
try:
    if os.path.exists(source):
        # Remove existing destination file if it exists
        if os.path.exists(destination):
            os.remove(destination)  # Delete old file
            print(f"♻️ Removed existing file: {destination}")

        shutil.move(source, dest_dir)  # Move new file
        print(f"✅ Successfully moved binary to: {destination}")
    else:
        print(f"❌ Error: Built binary not found at: {source}")
except Exception as e:
    print(f"❌ Failed to move binary: {str(e)}")
