# Sistema Académico Universitario

## Instalación
```bash
git clone https://github.com/dual-devs0/sistema-academico.git
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

## Pruebas
Ejecutar tests básicos:
```bash
pytest tests/test_basic.py -v
