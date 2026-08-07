from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from unittest.mock import Mock, call


SCRIPT_PATH = Path(__file__).with_name("fetch-groups-perimeters.py")
SPEC = spec_from_file_location("fetch_groups_perimeters", SCRIPT_PATH)
assert SPEC and SPEC.loader
fetch_groups_perimeters = module_from_spec(SPEC)
SPEC.loader.exec_module(fetch_groups_perimeters)


def test_jwt_authentication_is_used_for_group_and_perimeter_requests(
    monkeypatch, tmp_path
):
    auth_response = Mock(status_code=200)
    auth_response.json.return_value = {
        "access": "jwt-access-token",
        "refresh": "jwt-refresh-token",
    }
    post = Mock(return_value=auth_response)

    group_response = Mock(status_code=200)
    group_response.json.return_value = {
        "id_groupe": 42,
        "perimetre": 7,
        "lovac": True,
    }
    perimeter_response = Mock(status_code=200)
    perimeter_response.json.return_value = {
        "perimetre_id": 7,
        "fr_entiere": True,
    }
    get = Mock(side_effect=[group_response, perimeter_response])

    monkeypatch.setattr(fetch_groups_perimeters.requests, "post", post)
    monkeypatch.setattr(fetch_groups_perimeters.requests, "get", get)
    monkeypatch.setattr(fetch_groups_perimeters.time, "sleep", lambda _: None)

    token = fetch_groups_perimeters.authenticate("zlv-user", "zlv-password")
    groups, perimeter_ids = fetch_groups_perimeters.fetch_all_groups(
        token,
        {42},
        str(tmp_path / "groups.jsonl"),
    )
    perimeters = fetch_groups_perimeters.fetch_all_perimeters(
        token,
        perimeter_ids,
        str(tmp_path / "perimeters.jsonl"),
    )

    post.assert_called_once_with(
        "https://portaildf.cerema.fr/api/token/",
        json={"username": "zlv-user", "password": "zlv-password"},
        timeout=60,
    )
    bearer_headers = {
        "Authorization": "Bearer jwt-access-token",
        "Content-Type": "application/json",
    }
    assert get.call_args_list == [
        call(
            "https://portaildf.cerema.fr/api/groupes/42/",
            headers=bearer_headers,
            timeout=30,
        ),
        call(
            "https://portaildf.cerema.fr/api/perimetres/7/",
            headers=bearer_headers,
            timeout=30,
        ),
    ]
    assert groups[42]["perimetre"] == 7
    assert perimeters[7]["fr_entiere"] is True
