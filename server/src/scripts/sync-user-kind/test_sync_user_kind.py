from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from unittest.mock import Mock


SCRIPT_PATH = Path(__file__).with_name("sync_user_kind.py")
SPEC = spec_from_file_location("sync_user_kind", SCRIPT_PATH)
assert SPEC and SPEC.loader
sync_user_kind = module_from_spec(SPEC)
SPEC.loader.exec_module(sync_user_kind)


def test_authenticate_uses_jwt_access_token_and_bearer_header(monkeypatch):
    response = Mock()
    response.json.return_value = {
        "access": "jwt-access-token",
        "refresh": "jwt-refresh-token",
    }
    post = Mock(return_value=response)
    monkeypatch.setattr(sync_user_kind.requests, "post", post)

    sync = sync_user_kind.UserKindSync(
        db_url="postgresql://localhost/zlv",
        api_url="https://datafoncier.example/api/",
        username="zlv-user",
        password="zlv-password",
    )

    sync.authenticate()

    post.assert_called_once_with(
        "https://datafoncier.example/api/token/",
        json={"username": "zlv-user", "password": "zlv-password"},
        headers={"Content-Type": "application/json"},
        timeout=60,
    )
    assert sync.auth_token == "jwt-access-token"
    assert sync.session.headers["Authorization"] == "Bearer jwt-access-token"
