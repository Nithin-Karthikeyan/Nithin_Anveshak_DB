import os
from typing import Any

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from notion_client import Client
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="Anveshak DB API")  # Create instance of the object
notion = Client(
    auth=os.getenv("NOTION_API_KEY"), notion_version="2022-06-28"
)  # Create instance of notion client to communicate with notion db


# Allow only these URLs to communicate with the backend. Block the rest using CORS
allowed_origins = ["https://anveshak-db.vercel.app"]
if frontend_url := os.getenv("FRONTEND_URL"):
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^http://localhost(:\d+)?$",
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

# Warn user about no env vars
if not os.getenv("NOTION_API_KEY") or not os.getenv("MEMBERS_DB_ID"):
    print("Missing critical Notion environment variables.")


# Body for POST /api/create-bill . Sets the types so that pydantic can handle client side mismatches
# All the fields are REQUIRED except description and gst
class CreateBill(BaseModel):
    image_url: str
    invoice_number: str
    date: str
    total_amount: float
    description: str | None = None  # Can be left blank
    gst: bool = False  # Accepts bool, Default is False


class Contributor(BaseModel):
    name: str | None = None
    amount: float | None = None


# Body for POST /api/add-contributors
class AddContributors(BaseModel):
    invoice_number: str
    contributors: list[Contributor]


def query_database(database_id: str, **body: Any) -> Any:
    return notion.request(path=f"databases/{database_id}/query", method="POST", body=body)


# Get the 'Members' Database from Notion to display in Contributors selection
@app.get("/api/members")
def get_members():
    try:
        response = query_database(os.getenv("MEMBERS_DB_ID"))
        members = []
        for page in response["results"]:
            title = page["properties"]["Name"]["title"]
            name = (title[0]["text"].get("content") if title else None) or "Unnamed"
            members.append({"id": page["id"], "name": name})
        return members
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={
                "error": getattr(error, "message", None) or str(error),
                "code": getattr(error, "code", None),
                "status": getattr(error, "status", None),
            },
        )


# POST the bill to notion Bills db
@app.post("/api/create-bill")
def create_bill(body: CreateBill):  # Enforce that body is of type CreateBill class

    # Establish that type of properties is a dict with key as str, and value as Any (Any type)
    properties: dict[str, Any] = {
        "Invoice No.": {
            "title": [
                {
                    "text": {
                        "content": str(body.invoice_number) if body.invoice_number else "B-UNKNOWN"
                    }
                }
            ],
        },
        "GST": {"checkbox": bool(body.gst)},
    }

    # Check if the fields are not None before POSTING to Notion
    if body.image_url:
        properties["Link"] = {"url": body.image_url}
    if body.date:
        properties["Date"] = {"date": {"start": body.date}}
    if body.total_amount is not None:
        properties["Total Amount"] = {"number": float(body.total_amount)}
    if body.description:
        properties["Description"] = {"rich_text": [{"text": {"content": body.description}}]}

    try:
        response = notion.pages.create(
            parent={"database_id": os.getenv("NOTION_DB_BILLS_ID")},
            properties=properties,
        )
        return {"billId": response["id"]}
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to create bill",
                "details": getattr(error, "body", None) or str(error),
            },
        )


# POST the contributors to 'Contributors' DB
@app.post("/api/add-contributors")
def add_contributors(body: AddContributors):
    if not body.invoice_number or not body.contributors:
        return JSONResponse(
            status_code=400,
            content={"error": "invoice_number and contributors[] are required"},
        )

    try:  # Try to get the bill with that invoice number from Bills DB
        bills_query = query_database(
            os.getenv("NOTION_DB_BILLS_ID"),
            filter={"property": "Invoice No.", "title": {"equals": body.invoice_number}},
        )
        if not bills_query["results"]:
            return JSONResponse(
                status_code=404,
                content={"error": f'No bill found with Invoice No. "{body.invoice_number}"'},
            )

        bill_page_id = bills_query["results"][0]["id"]

        created = []
        errors = []

        for contributor in body.contributors:
            name = contributor.name
            amount = contributor.amount

            if not name or amount is None:
                errors.append({"name": name, "reason": "Missing name or amount"})
                continue

            member_query = query_database(
                os.getenv("MEMBERS_DB_ID"),
                filter={"property": "Name", "title": {"equals": name}},
            )
            if not member_query["results"]:
                errors.append({"name": name, "reason": f'Member "{name}" not found in Members DB'})
                continue

            member_page_id = member_query["results"][0]["id"]
            contribution = notion.pages.create(
                parent={"database_id": os.getenv("NOTION_CONTRIBUTIONS_DB_ID")},
                properties={
                    "Bills": {"relation": [{"id": bill_page_id}]},
                    "Contributor": {"relation": [{"id": member_page_id}]},
                    "Amount": {"number": float(amount)},
                    "Serial No.": {"title": [{"text": {"content": name}}]},
                },
            )
            created.append({"name": name, "contributionId": contribution["id"]})

        result: dict[str, Any] = {"success": True, "billPageId": bill_page_id, "created": created}
        if errors:
            result["errors"] = errors
        return result
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={"error": getattr(error, "message", None) or str(error)},
        )


# Archive a bill page (used to roll back a submission when contributors fail)
@app.delete("/api/bills/{bill_id}")
def delete_bill(bill_id: str):
    try:
        notion.pages.update(page_id=bill_id, archived=True)
        return {"success": True, "billId": bill_id}
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={"error": getattr(error, "message", None) or str(error)},
        )


app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "3000")))
