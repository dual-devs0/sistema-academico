from fastapi import FastAPI

app = FastAPI(title="Sistema Académico")

@app.get("/")
def root():
    return {"message": "API Sistema Académico funcionando"}
