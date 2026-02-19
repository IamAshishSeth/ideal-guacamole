from fastapi.testclient import TestClient
import src.app as app_module

client = TestClient(app_module.app)

def test_get_activities_contains_known_activity():
    # Arrange: client created above
    # Act
    resp = client.get('/activities')
    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert 'Chess Club' in data
