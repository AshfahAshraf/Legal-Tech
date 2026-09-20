from fastapi.testclient import TestClient
from app.main import app
import traceback

client = TestClient(app)
try:
    response = client.get("/finance/invoices")
    print(response.status_code)
    print(response.json())
except Exception as e:
    traceback.print_exc()
