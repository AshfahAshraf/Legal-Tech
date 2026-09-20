import requests

BASE_URL = "http://127.0.0.1:8000"

def test_dashboard_tasks():
    print("Testing Clerk Dashboard Tasks Endpoints...")
    # 1. Get all tasks
    r = requests.get(f"{BASE_URL}/clerk/dashboard/tasks")
    assert r.status_code == 200, f"Failed GET tasks: {r.text}"
    initial_count = len(r.json())
    print(f"  Initial tasks count: {initial_count}")

    # 2. Create task
    task_data = {"text": "Test clerk task", "completed": False}
    r = requests.post(f"{BASE_URL}/clerk/dashboard/tasks", json=task_data)
    assert r.status_code == 201, f"Failed POST task: {r.text}"
    created_task = r.json()
    assert created_task["text"] == "Test clerk task"
    task_id = created_task["id"]
    print(f"  Created task with ID: {task_id}")

    # 3. Update task
    update_data = {"completed": True}
    r = requests.put(f"{BASE_URL}/clerk/dashboard/tasks/{task_id}", json=update_data)
    assert r.status_code == 200, f"Failed PUT task: {r.text}"
    assert r.json()["completed"] is True
    print(f"  Updated task ID {task_id} successfully.")

    # 4. Delete task
    r = requests.delete(f"{BASE_URL}/clerk/dashboard/tasks/{task_id}")
    assert r.status_code == 200, f"Failed DELETE task: {r.text}"
    print(f"  Deleted task ID {task_id} successfully.")

def test_dashboard_stats():
    print("Testing Clerk Dashboard Stats Endpoint...")
    r = requests.get(f"{BASE_URL}/clerk/dashboard/stats")
    assert r.status_code == 200, f"Failed GET stats: {r.text}"
    stats = r.json()
    assert "templates" in stats
    assert "cabinets" in stats
    assert "objections" in stats
    print(f"  Stats successfully retrieved: {stats}")

def test_document_drafts():
    print("Testing Clerk Document Drafts Endpoints...")
    # 1. Get drafts
    r = requests.get(f"{BASE_URL}/clerk/document-draft/")
    assert r.status_code == 200, f"Failed GET drafts: {r.text}"
    initial_count = len(r.json())

    # 2. Create draft
    draft_data = {
        "template_type": "vakalatnama",
        "client_name": "Test Client",
        "advocate_name": "Adv. Test",
        "case_title": "Test v. State",
        "court_name": "District Court, Ernakulam",
        "batta_fee": "50",
        "mode_of_summons": "Registered Post with AD",
        "number_of_summons": "1",
        "content": "Sample Vakalatnama Content"
    }
    r = requests.post(f"{BASE_URL}/clerk/document-draft/", json=draft_data)
    assert r.status_code == 201, f"Failed POST draft: {r.text}"
    created_draft = r.json()
    draft_id = created_draft["id"]
    print(f"  Created draft with ID: {draft_id}")

    # 3. Get single draft
    r = requests.get(f"{BASE_URL}/clerk/document-draft/{draft_id}")
    assert r.status_code == 200, f"Failed GET draft detail: {r.text}"
    assert r.json()["client_name"] == "Test Client"

    # 4. Update draft
    update_data = {"client_name": "Updated Test Client"}
    r = requests.put(f"{BASE_URL}/clerk/document-draft/{draft_id}", json=update_data)
    assert r.status_code == 200, f"Failed PUT draft: {r.text}"
    assert r.json()["client_name"] == "Updated Test Client"
    print(f"  Updated draft ID {draft_id} successfully.")

    # 5. Delete draft
    r = requests.delete(f"{BASE_URL}/clerk/document-draft/{draft_id}")
    assert r.status_code == 200, f"Failed DELETE draft: {r.text}"
    print(f"  Deleted draft ID {draft_id} successfully.")

def test_physical_files():
    print("Testing Clerk Physical File Indexing Endpoints...")
    # 1. Get physical files
    r = requests.get(f"{BASE_URL}/clerk/format-physical-file/")
    assert r.status_code == 200, f"Failed GET files: {r.text}"

    # 2. Create file record
    import random
    file_no = f"PF-TEST-{random.randint(1000, 9999)}"
    file_data = {
        "file_number": file_no,
        "case_number": "OS/999/2026",
        "client_name": "File Test Client",
        "cabinet_location": "Cabinet C",
        "shelf_index": "Row 2, Shelf 3",
        "notes": "Testing physical file storage"
    }
    r = requests.post(f"{BASE_URL}/clerk/format-physical-file/", json=file_data)
    assert r.status_code == 201, f"Failed POST file: {r.text}"
    created_file = r.json()
    file_id = created_file["id"]
    print(f"  Created physical file record ID: {file_id} with File Number: {file_no}")

    # 3. Update file record
    update_data = {"cabinet_location": "Cabinet Z"}
    r = requests.put(f"{BASE_URL}/clerk/format-physical-file/{file_id}", json=update_data)
    assert r.status_code == 200, f"Failed PUT file: {r.text}"
    assert r.json()["cabinet_location"] == "Cabinet Z"
    print(f"  Updated file record ID {file_id} successfully.")

    # 4. Delete file record
    r = requests.delete(f"{BASE_URL}/clerk/format-physical-file/{file_id}")
    assert r.status_code == 200, f"Failed DELETE file: {r.text}"
    print(f"  Deleted file record ID {file_id} successfully.")

if __name__ == "__main__":
    print("Starting Clerk Backend Endpoints Integration Tests...\n")
    try:
        test_dashboard_tasks()
        print("-" * 50)
        test_dashboard_stats()
        print("-" * 50)
        test_document_drafts()
        print("-" * 50)
        test_physical_files()
        print("\nALL CLERK BACKEND ENDPOINT INTEGRATION TESTS PASSED SUCCESSFULLY!")
    except AssertionError as e:
        print(f"\nTEST FAILURE: {e}")
    except Exception as ex:
        print(f"\nERROR RUNNING TESTS: {ex}")
