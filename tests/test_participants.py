from fastapi.testclient import TestClient
import src.app as app_module

client = TestClient(app_module.app)

def test_remove_participant_success_and_404():
    # Arrange
    activity = 'Programming Class'
    email = app_module.activities[activity]['participants'][0]
    # Act: remove existing participant
    resp = client.delete(f"/activities/{activity}/participants", params={'email': email})
    # Assert
    assert resp.status_code == 200
    assert email not in app_module.activities[activity]['participants']

    # Act: remove non-existent participant
    resp2 = client.delete(f"/activities/{activity}/participants", params={'email': 'noone@mergington.edu'})
    # Assert
    assert resp2.status_code == 404
