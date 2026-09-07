from conftest import BILLS_DB_ID, CONTRIBUTIONS_DB_ID, FakeNotionError, bill_page, member_page


# ---- GET /api/members ----


# client and fake_notion args are passed from fixtures defined in conftest.py
# client is a TestClient from FastAPI
def test_members_success(client, fake_notion):
    # Creats a fake notion page with member id and names
    fake_notion.member_pages = [
        member_page("mem-1", "Alice"),
        member_page("mem-2", "Bob"),
        {"id": "mem-3", "properties": {"Name": {"title": []}}},
    ]
    # Sends a GET request
    res = client.get("/api/members")
    # Assert that the get request is valid
    assert res.status_code == 200
    assert res.json() == [
        {"id": "mem-1", "name": "Alice"},
        {"id": "mem-2", "name": "Bob"},
        {"id": "mem-3", "name": "Unnamed"},
    ]


def test_members_notion_error(client, fake_notion):
    fake_notion.error = FakeNotionError("token expired", code="unauthorized", status=401)

    res = client.get("/api/members")

    assert res.status_code == 500
    assert res.json() == {"error": "token expired", "code": "unauthorized", "status": 401}


# ---- POST /api/create-bill ----


def test_create_bill_success(client, fake_notion):
    fake_notion.created_page_id = "bill-abc"

    res = client.post(
        "/api/create-bill",
        json={
            "image_url": "https://img.example.com/bill.png",
            "invoice_number": "INV-2024-001",
            "date": "2024-01-15",
            "total_amount": 1500.0,
            "description": "CAC26 Elec Comps",
            "gst": True,
        },
    )

    assert res.status_code == 200
    assert res.json() == {"billId": "bill-abc"}

    create = fake_notion.calls["create"]
    assert len(create) == 1
    assert create[0]["parent"] == {"database_id": BILLS_DB_ID}
    props = create[0]["properties"]
    assert props["Invoice No."] == {"title": [{"text": {"content": "INV-2024-001"}}]}
    assert props["GST"] == {"checkbox": True}
    assert props["Link"] == {"url": "https://img.example.com/bill.png"}
    assert props["Date"] == {"date": {"start": "2024-01-15"}}
    assert props["Total Amount"] == {"number": 1500.0}
    assert props["Description"] == {"rich_text": [{"text": {"content": "CAC26 Elec Comps"}}]}


def test_create_bill_omits_optional_fields(client, fake_notion):
    res = client.post(
        "/api/create-bill",
        json={
            "image_url": "",
            "invoice_number": "INV-2",
            "date": "",
            "total_amount": 0.0,
            "description": "",
            "gst": False,
        },
    )

    assert res.status_code == 200
    props = fake_notion.calls["create"][0]["properties"]
    assert props["GST"] == {"checkbox": False}
    assert "Link" not in props
    assert "Date" not in props
    assert "Description" not in props
    assert props["Total Amount"] == {"number": 0.0}


def test_create_bill_missing_required_fields(client, fake_notion):
    res = client.post(
        "/api/create-bill",
        json={"image_url": "https://x/y.png", "invoice_number": "INV-3"},
    )

    assert res.status_code == 422
    assert fake_notion.calls["create"] == []


def test_create_bill_wrong_type(client, fake_notion):
    res = client.post(
        "/api/create-bill",
        json={
            "image_url": "https://x/y.png",
            "invoice_number": "INV-4",
            "total_amount": "not-a-number",
        },
    )

    assert res.status_code == 422
    assert fake_notion.calls["create"] == []


def test_create_bill_notion_error(client, fake_notion):
    fake_notion.error = FakeNotionError("boom", body='{"code": "validation_error"}')

    res = client.post(
        "/api/create-bill",
        json={
            "image_url": "https://x/y.png",
            "invoice_number": "INV-5",
            "date": "2024-01-15",
            "total_amount": 10.0,
        },
    )

    assert res.status_code == 500
    assert res.json() == {
        "error": "Failed to create bill",
        "details": '{"code": "validation_error"}',
    }


# ---- POST /api/add-contributors ----


def test_add_contributors_success(client, fake_notion):
    fake_notion.bill_pages = [bill_page("bill-abc", "INV-2024-001")]
    fake_notion.member_pages = [member_page("mem-1", "Alice")]

    res = client.post(
        "/api/add-contributors",
        json={
            "invoice_number": "INV-2024-001",
            "contributors": [{"name": "Alice", "amount": 1500.0}],
        },
    )

    assert res.status_code == 200
    assert res.json() == {
        "success": True,
        "billPageId": "bill-abc",
        "created": [{"name": "Alice", "contributionId": "created-page-id"}],
    }

    create = fake_notion.calls["create"]
    assert len(create) == 1
    assert create[0]["parent"] == {"database_id": CONTRIBUTIONS_DB_ID}
    props = create[0]["properties"]
    assert props["Bill"] == {"relation": [{"id": "bill-abc"}]}
    assert props["Contributor"] == {"relation": [{"id": "mem-1"}]}
    assert props["Amount"] == {"number": 1500.0}
    assert props["Serial No."] == {"title": [{"text": {"content": "Alice"}}]}


def test_add_contributors_missing_name_or_amount(client, fake_notion):
    fake_notion.bill_pages = [bill_page("bill-abc", "INV-2024-001")]

    res = client.post(
        "/api/add-contributors",
        json={
            "invoice_number": "INV-2024-001",
            "contributors": [{"name": "", "amount": None}],
        },
    )

    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["created"] == []
    assert data["errors"] == [{"name": "", "reason": "Missing name or amount"}]


def test_add_contributors_zero_amount(client, fake_notion):
    fake_notion.bill_pages = [bill_page("bill-abc", "INV-2024-001")]

    res = client.post(
        "/api/add-contributors",
        json={
            "invoice_number": "INV-2024-001",
            "contributors": [{"name": "Alice", "amount": 0}],
        },
    )

    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["created"] == []
    assert data["errors"] == [{"name": "Alice", "reason": "Amount must be greater than 0"}]
    assert fake_notion.calls["create"] == []


def test_add_contributors_negative_amount(client, fake_notion):
    fake_notion.bill_pages = [bill_page("bill-abc", "INV-2024-001")]

    res = client.post(
        "/api/add-contributors",
        json={
            "invoice_number": "INV-2024-001",
            "contributors": [{"name": "Alice", "amount": -5}],
        },
    )

    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["created"] == []
    assert data["errors"] == [{"name": "Alice", "reason": "Amount must be greater than 0"}]
    assert fake_notion.calls["create"] == []


def test_add_contributors_member_not_found(client, fake_notion):
    fake_notion.bill_pages = [bill_page("bill-abc", "INV-2024-001")]

    res = client.post(
        "/api/add-contributors",
        json={
            "invoice_number": "INV-2024-001",
            "contributors": [{"name": "Ghost", "amount": 10.0}],
        },
    )

    assert res.status_code == 200
    data = res.json()
    assert data["errors"] == [{"name": "Ghost", "reason": 'Member "Ghost" not found in Members DB'}]


def test_add_contributors_bill_not_found(client, fake_notion):
    res = client.post(
        "/api/add-contributors",
        json={
            "invoice_number": "INV-MISSING",
            "contributors": [{"name": "Alice", "amount": 10.0}],
        },
    )

    assert res.status_code == 404
    assert res.json() == {"error": 'No bill found with Invoice No. "INV-MISSING"'}


def test_add_contributors_empty_body(client, fake_notion):
    res = client.post(
        "/api/add-contributors",
        json={"invoice_number": "INV-2024-001", "contributors": []},
    )

    assert res.status_code == 400
    assert res.json() == {"error": "invoice_number and contributors[] are required"}


def test_add_contributors_notion_error(client, fake_notion):
    fake_notion.bill_pages = [bill_page("bill-abc", "INV-2024-001")]
    fake_notion.error = FakeNotionError("rate limited", status=429)

    res = client.post(
        "/api/add-contributors",
        json={
            "invoice_number": "INV-2024-001",
            "contributors": [{"name": "Alice", "amount": 10.0}],
        },
    )

    assert res.status_code == 500
    assert res.json() == {"error": "rate limited"}


# ---- DELETE /api/bills/{bill_id} ----


def test_delete_bill_archives_page(client, fake_notion):
    res = client.delete("/api/bills/bill-xyz")

    assert res.status_code == 200
    assert res.json() == {"success": True, "billId": "bill-xyz"}
    assert fake_notion.calls["update"] == [{"page_id": "bill-xyz", "archived": True}]


def test_delete_bill_notion_error(client, fake_notion):
    fake_notion.error = FakeNotionError("page not found", code="object_not_found")

    res = client.delete("/api/bills/bill-xyz")

    assert res.status_code == 500
    assert res.json() == {"error": "page not found"}


# ---- Full submission flow (mirrors static/app.js handleSubmit) ----


def test_submission_flow_rollback_when_contributors_fail(client, fake_notion):
    fake_notion.created_page_id = "bill-xyz"
    fake_notion.bill_pages = [bill_page("bill-xyz", "INV-2024-042")]
    fake_notion.member_pages = [member_page("mem-1", "Alice")]

    create_res = client.post(
        "/api/create-bill",
        json={
            "image_url": "https://res.cloudinary.com/bill.png",
            "invoice_number": "INV-2024-042",
            "date": "2024-06-01",
            "total_amount": 500.0,
            "description": "Team lunch",
            "gst": False,
        },
    )
    assert create_res.status_code == 200
    bill_id = create_res.json()["billId"]
    assert bill_id == "bill-xyz"

    contributor_res = client.post(
        "/api/add-contributors",
        json={
            "invoice_number": "INV-2024-042",
            "contributors": [
                {"name": "Alice", "amount": 300.0},
                {"name": "Not-a-Member", "amount": 200.0},
            ],
        },
    )
    assert contributor_res.status_code == 200
    assert contributor_res.json()["errors"] == [
        {"name": "Not-a-Member", "reason": 'Member "Not-a-Member" not found in Members DB'}
    ]

    rollback_res = client.delete(f"/api/bills/{bill_id}")
    assert rollback_res.status_code == 200
    assert rollback_res.json() == {"success": True, "billId": bill_id}

    assert fake_notion.calls["update"] == [{"page_id": "bill-xyz", "archived": True}]
    assert [c["parent"]["database_id"] for c in fake_notion.calls["create"]] == [
        BILLS_DB_ID,
        CONTRIBUTIONS_DB_ID,
    ]


# ---- Static frontend serving ----


def test_index_served(client):
    res = client.get("/")

    assert res.status_code == 200
    assert "text/html" in res.headers["content-type"]
    assert "Anveshak DB" in res.text


def test_built_css_served(client):
    res = client.get("/app.css")

    assert res.status_code == 200
    assert "text/css" in res.headers["content-type"]
