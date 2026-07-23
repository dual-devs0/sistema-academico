def test_list_settings_seeds_defaults(client, tokens):
    h = {"Authorization": f"Bearer {tokens['admin']}"}
    resp = client.get("/admin/settings", headers=h)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 10
    keys = [s["key"] for s in data]
    assert "periodo_actual" in keys
    assert "ppa_minimo" in keys
    assert "email_contacto" in keys


def test_list_settings_no_admin_403(client, tokens):
    h = {"Authorization": f"Bearer {tokens['alumno']}"}
    resp = client.get("/admin/settings", headers=h)
    assert resp.status_code == 403


def test_update_setting(client, tokens):
    h = {"Authorization": f"Bearer {tokens['admin']}"}
    resp = client.put("/admin/settings/periodo_actual", json={"value": "2027-1", "reason": "Test"}, headers=h)
    assert resp.status_code == 200
    assert resp.json()["value"] == "2027-1"

    # reset
    client.put("/admin/settings/periodo_actual", json={"value": "2026-2", "reason": "Reset"}, headers=h)


def test_audit_log_records_change(client, tokens):
    h = {"Authorization": f"Bearer {tokens['admin']}"}
    client.put("/admin/settings/periodo_actual", json={"value": "2027-1", "reason": "Audit test"}, headers=h)

    resp = client.get("/admin/settings/audit/list", headers=h)
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) >= 1
    matching = [e for e in entries if e["setting_key"] == "periodo_actual" and e["reason"] == "Audit test"]
    assert len(matching) >= 1

    # reset
    client.put("/admin/settings/periodo_actual", json={"value": "2026-2", "reason": "Reset"}, headers=h)


def test_export_settings(client, tokens):
    h = {"Authorization": f"Bearer {tokens['admin']}"}
    resp = client.get("/admin/settings/export/all", headers=h)
    assert resp.status_code == 200
    data = resp.json()
    assert "settings" in data
    assert len(data["settings"]) >= 10


def test_import_settings(client, tokens):
    h = {"Authorization": f"Bearer {tokens['admin']}"}

    export = client.get("/admin/settings/export/all", headers=h).json()

    resp = client.post("/admin/settings/import", json=export, headers=h)
    assert resp.status_code == 200
    result = resp.json()
    assert result["imported"] >= 0
    assert len(result["errors"]) == 0


def test_get_setting_by_key(client, tokens):
    h = {"Authorization": f"Bearer {tokens['admin']}"}
    resp = client.get("/admin/settings/periodo_actual", headers=h)
    assert resp.status_code == 200
    assert resp.json()["key"] == "periodo_actual"


def test_get_setting_not_found(client, tokens):
    h = {"Authorization": f"Bearer {tokens['admin']}"}
    resp = client.get("/admin/settings/no_existe", headers=h)
    assert resp.status_code == 404
