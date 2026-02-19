from fastapi.testclient import TestClient
import src.app as app_module

client = TestClient(app_module.app)

def test_signup_success_and_duplicate():
    # Arrange
    activity = 'Chess Club'
    email = 'test.student@mergington.edu'
    if email in app_module.activities[activity]['participants']:
        app_module.activities[activity]['participants'].remove(email)
    # Act: signup
    resp = client.post(f"/activities/{activity}/signup", params={'email': email})
    # Assert
    assert resp.status_code == 200
    assert email in app_module.activities[activity]['participants']

    # Act: duplicate signup
    resp2 = client.post(f"/activities/{activity}/signup", params={'email': email})
    # Assert duplicate triggers 400
    assert resp2.status_code == 400
