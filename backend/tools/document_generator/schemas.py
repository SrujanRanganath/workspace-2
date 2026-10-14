from pydantic import BaseModel


class DocumentRequest(BaseModel):
    document_type: str
    template: str
    title: str
    name: str
    company: str = ""
    content: str


class DocumentResponse(BaseModel):
    message: str
    filename: str