import shutil
import os
import subprocess

# Ruta de la carpeta duplicada
duplicated_path = r"C:/Users/Nicolás/sistema-academico/sistema-academico/backend/tests/conftest.py"

# Eliminar carpeta duplicada si existe
if os.path.exists(duplicated_path):
    shutil.rmtree(duplicated_path)
    print(f"Carpeta eliminada: {duplicated_path}")
else:
    print("La carpeta duplicada no existe.")

# Ejecutar pytest en la carpeta correcta
project_root = r"C:\Users\Nicolás\sistema-academico"
print("Ejecutando pytest...")
subprocess.run(["pytest", "backend/tests"], cwd=project_root)
