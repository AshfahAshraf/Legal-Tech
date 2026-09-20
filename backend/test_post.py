import requests

payload = {
    "advocateName": "admin",
    "emailAddress": "admin@example.com",
    "dateOfBirth": "",
    "yearsOfExperience": ""
}

res = requests.post("http://localhost:8000/lawfirm-management/", json=payload)
print(res.status_code)
print(res.json())
