"""
Notion database column name constants.

Centralizes all Notion property names used across Bills, Contributors, and Members databases.
"""


class BillsColumns:
    """Column names for the Bills database in Notion."""

    INVOICE_NO = "Invoice No."
    LINK = "Link"
    DATE = "Date"
    TOTAL_AMOUNT = "Total Amount"
    DESCRIPTION = "Description"
    GST = "GST"


class ContributorsColumns:
    """Column names for the Contributors database in Notion."""

    BILL = "Bill"
    CONTRIBUTOR = "Contributor"
    AMOUNT = "Amount"
    SERIAL_NO = "Serial No."


class MembersColumns:
    """Column names for the Members database in Notion."""

    NAME = "Name"
