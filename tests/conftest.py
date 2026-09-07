import os

import pytest

from notion_columns import BillsColumns, MembersColumns

os.environ.setdefault("NOTION_API_KEY", "test-notion-key")
os.environ.setdefault("MEMBERS_DB_ID", "members_db_id")
os.environ.setdefault("NOTION_DB_BILLS_ID", "bills_db_id")
os.environ.setdefault("NOTION_CONTRIBUTIONS_DB_ID", "contributions_db_id")

import main  # noqa: E402

MEMBERS_DB_ID = os.environ["MEMBERS_DB_ID"]
BILLS_DB_ID = os.environ["NOTION_DB_BILLS_ID"]
CONTRIBUTIONS_DB_ID = os.environ["NOTION_CONTRIBUTIONS_DB_ID"]


class FakeNotionError(Exception):
    def __init__(self, message, *, code=None, status=None, body=None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status
        self.body = body


class FakeNotion:
    def __init__(self):
        self.member_pages = []
        self.bill_pages = []
        self.created_page_id = "created-page-id"
        self.error = None
        self.calls = {"create": [], "update": [], "request": []}

    def query_database(self, database_id, **body):
        return self.request(path=f"databases/{database_id}/query", method="POST", body=body)

    def request(self, *, path, method, body=None, **kwargs):
        self.calls["request"].append({"path": path, "method": method, "body": body})
        if self.error:
            raise self.error
        if MEMBERS_DB_ID in path:
            return {"results": self._filter_pages(self.member_pages, body, MembersColumns.NAME)}
        if BILLS_DB_ID in path:
            return {"results": self._filter_pages(self.bill_pages, body, BillsColumns.INVOICE_NO)}
        return {"results": []}

    @staticmethod
    def _filter_pages(pages, body, property_name):
        equals = (body or {}).get("filter", {}).get("title", {}).get("equals")
        if not equals:
            return pages
        return [page for page in pages if FakeNotion._page_title(page, property_name) == equals]

    @staticmethod
    def _page_title(page, property_name):
        title = page.get("properties", {}).get(property_name, {}).get("title")
        return title[0]["text"].get("content") if title else None

    @property
    def pages(self):
        return self

    def create(self, *, parent, properties, **kwargs):
        self.calls["create"].append({"parent": parent, "properties": properties})
        if self.error:
            raise self.error
        return {"id": self.created_page_id}

    def update(self, *, page_id, archived, **kwargs):
        self.calls["update"].append({"page_id": page_id, "archived": archived})
        if self.error:
            raise self.error
        return {"id": page_id}


def member_page(page_id, name):
    return {
        "id": page_id,
        "properties": {MembersColumns.NAME: {"title": [{"text": {"content": name}}]}},
    }


def bill_page(page_id, invoice_no):
    return {
        "id": page_id,
        "properties": {BillsColumns.INVOICE_NO: {"title": [{"text": {"content": invoice_no}}]}},
    }


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    return TestClient(main.app)


@pytest.fixture
def fake_notion(monkeypatch):
    fake = FakeNotion()
    monkeypatch.setattr(main, "notion", fake)
    monkeypatch.setattr(main, "query_database", fake.query_database)
    return fake
