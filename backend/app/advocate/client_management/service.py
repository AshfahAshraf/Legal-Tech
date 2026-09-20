from sqlalchemy.orm import Session
from .models import ClientDocument, Client


def get_case_documents(
    db: Session,
    client_id: int,
    advocate_role: str,
    document_type: str = None
):
    # Get all documents of client
    documents = db.query(ClientDocument).filter(
        ClientDocument.client_id == client_id
    ).all()

    # Junior Advocate Restrictions
    if advocate_role.lower() == "junior":
        restricted_docs = [
            "Witness Statement",
            "Strategy Notes"
        ]

        documents = [
            doc for doc in documents
            if doc.document_type not in restricted_docs
        ]

    # Filter by document type
    if document_type:
        documents = [
            doc for doc in documents
            if doc.document_type == document_type
        ]

    return documents