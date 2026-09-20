import sys
import os
import requests

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

BASE = "http://127.0.0.1:8000"

print("=== End-to-End Test: Provision -> Login ===\n")

# 1. Provision a new user
print("1. Provisioning new user via POST /permissions/users/provision ...")
payload = {
    "firstName": "Thasni",
    "lastName": "S",
    "phone": "9207530164",
    "username": "thasnis",
    "email": "thasni7530@gmail.com",
    "role": "Client",
    "tempPassword": "temp_uQ60kaI"
}

# Clean up if user exists from a previous test run
try:
    users_res = requests.get(f"{BASE}/permissions/users")
    if users_res.ok:
        for u in users_res.json():
            if u["email"] == payload["email"]:
                requests.delete(f"{BASE}/permissions/users/{u['id']}")
                print(f"   Cleaned up existing user (id={u['id']})")
                break
except Exception as e:
    pass

res = requests.post(
    f"{BASE}/permissions/users/provision",
    json=payload,
    headers={"Content-Type": "application/json"}
)

if res.status_code == 200:
    user = res.json()
    print(f"   PASS - User provisioned in DB! id={user['id']}, email={user['email']}, role={user['role']}")
else:
    print(f"   FAIL - Provision failed: {res.status_code} - {res.text}")
    sys.exit(1)

# 2. Try logging in with those credentials
print("\n2. Logging in via POST /login with provisioned credentials ...")
login_res = requests.post(
    f"{BASE}/login",
    json={"email": payload["email"], "password": payload["tempPassword"]},
    headers={"Content-Type": "application/json"}
)

if login_res.status_code == 200:
    token_data = login_res.json()
    print(f"   PASS - Login successful! Token starts with: {token_data['access_token'][:40]}...")
else:
    print(f"   FAIL - Login failed: {login_res.status_code} - {login_res.text}")
    sys.exit(1)

# 3. Verify user appears in /permissions/users list
print("\n3. Verifying user appears in GET /permissions/users ...")
list_res = requests.get(f"{BASE}/permissions/users")
if list_res.ok:
    users = list_res.json()
    match = next((u for u in users if u["email"] == payload["email"]), None)
    if match:
        print(f"   PASS - User confirmed in DB list: username={match['username']}, role={match['role']}")
    else:
        print("   FAIL - User NOT found in database list!")
        sys.exit(1)
else:
    print(f"   FAIL - Could not fetch users: {list_res.status_code}")
    sys.exit(1)

print("\n=== All checks passed! Provisioned users are stored in DB and can log in. ===")
