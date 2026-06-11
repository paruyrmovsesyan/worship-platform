import os
import zipfile

def zip_directory(folder_path, output_path):
    # Files and folders to exclude from the release package
    exclude_folders = {'.git', '_admin_runtime', 'cgi-bin', 'node_modules', 'worship_release', '.vite', '.idea', '.vscode'}
    exclude_files = {'.DS_Store', 'zip_project.py'}
    
    print(f"Creating zip file: {output_path}")
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(folder_path):
            # Exclude folders
            dirs[:] = [d for d in dirs if d not in exclude_folders]
            
            for file in files:
                if (file in exclude_files or 
                    file.endswith('.zip') or 
                    file.endswith('.zip.tmp') or 
                    file.endswith('.gitattributes') or 
                    file.endswith('.gitignore')):
                    continue
                    
                full_path = os.path.join(root, file)
                relative_path = os.path.relpath(full_path, folder_path)
                
                # Don't add zip file itself
                if full_path == output_path:
                    continue
                    
                zip_file.write(full_path, relative_path)
                print(f"  Added: {relative_path}")
                
    print("Zip package created successfully!")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_zip = os.path.join(current_dir, 'worship_release.zip')
    zip_directory(current_dir, output_zip)
