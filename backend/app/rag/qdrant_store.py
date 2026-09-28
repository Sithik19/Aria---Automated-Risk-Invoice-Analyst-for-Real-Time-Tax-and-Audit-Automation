import os
import math
import re
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

class LocalTaxEmbedder:
    """
    Lightweight, deterministic statutory semantic embedder that maps regulatory tax concepts
    into a dense 64-dimensional vector space without requiring heavy external torch downloads.
    """
    VOCAB = [
        "194q", "206c", "tds", "tcs", "buyer", "seller", "turnover", "crores",
        "lakhs", "cbdt", "circular", "precedence", "override", "goods", "threshold",
        "gstr2b", "gstr1", "gstr3b", "itc", "input_tax_credit", "reversal", "section_16",
        "rule_36", "mismatch", "supplier", "recipient", "interest", "section_50",
        "companies_act", "section_141", "ca", "chartered_accountant", "udin", "statutory",
        "audit", "compliance", "taxable_value", "cgst", "sgst", "igst", "e_invoice",
        "irn", "qr_code", "reverse_charge", "rcm", "penalties", "adjudication",
        "form_3cd", "tax_audit", "reconciliation", "books", "sap", "erp", "portal",
        "eligible", "ineligible", "excess_claim", "short_payment", "statute", "mandate"
    ]
    
    def __init__(self):
        self.dim = 64

    def embed_text(self, text: str) -> List[float]:
        text_lower = text.lower()
        tokens = re.findall(r"\b[a-z0-9_]+\b", text_lower)
        vector = [0.0] * self.dim
        
        for token in tokens:
            if token in self.VOCAB:
                idx = self.VOCAB.index(token) % self.dim
                vector[idx] += 1.5
            else:
                # Hash-based distribution for vocabulary coverage
                h = sum(ord(c) for c in token) % self.dim
                vector[h] += 0.25
                
        # L2 Normalize
        norm = math.sqrt(sum(x * x for x in vector)) or 1.0
        return [float(x / norm) for x in vector]


STATUTORY_KNOWLEDGE_BASE = [
    {
        "id": 1,
        "title": "CBDT Circular No. 13 of 2021: Precedence of Section 194Q TDS over Section 206C(1H) TCS",
        "section": "Section 194Q vs Section 206C(1H)",
        "citation": "CBDT Circular No. 13/2021 dated 30-06-2021 (Question 4)",
        "content": (
            "Under Section 194Q, any buyer whose total turnover exceeds Rs. 10 Crores in the preceding "
            "financial year and purchases goods exceeding Rs. 50 Lakhs from a resident seller is liable to deduct "
            "TDS at 0.1% on the value exceeding Rs. 50 Lakhs. Section 206C(1H) requires the seller to collect TCS at 0.1%. "
            "Statutory Precedence Rule: Under the second proviso to Section 206C(1H) read with Section 194Q(5), "
            "if on a transaction both Section 194Q TDS and Section 206C(1H) TCS apply, Section 194Q TDS takes strict precedence. "
            "No TCS shall be collected by the seller if the buyer has deducted or is liable to deduct TDS under Section 194Q. "
            "If the seller has erroneously charged TCS in their invoice, the buyer must still deduct 194Q TDS and the seller "
            "must adjust or credit the TCS charged."
        ),
        "statutory_mandate": "TDS_194Q_PREVAILS_OVER_TCS"
    },
    {
        "id": 2,
        "title": "CGST Act Section 16(2)(aa) & Rule 36(4): ITC Matching with GSTR-2B",
        "section": "Section 16(2)(aa) of CGST Act read with Rule 36(4)",
        "citation": "Notification No. 39/2021-Central Tax & Circular No. 170/02/2022-GST",
        "content": (
            "Section 16(2)(aa) stipulates that Input Tax Credit (ITC) can only be availed by a registered recipient if "
            "the details of the invoice or debit note have been furnished by the supplier in their GSTR-1 / IFF and "
            "communicated to the recipient in Form GSTR-2B. Invoices recorded in SAP purchase registers that are not reflected "
            "in GSTR-2B cannot be claimed as eligible ITC in Form GSTR-3B. Claiming ITC on missing invoices constitutes "
            "an unauthorized credit requiring immediate reversal under Table 4(B)(2) of GSTR-3B along with interest."
        ),
        "statutory_mandate": "ITC_REVERSAL_FOR_MISSING_2B"
    },
    {
        "id": 3,
        "title": "CGST Act Section 50(1): Interest on Belated Payment and Wrongful ITC Utilization",
        "section": "Section 50(1) read with Rule 88B of CGST Rules",
        "citation": "Finance Act 2022 retrospective amendment to Section 50(3)",
        "content": (
            "Where Input Tax Credit has been wrongly availed and subsequently utilized against output tax liability, "
            "the taxpayer is liable to pay interest at 18% per annum under Section 50(1). Interest is computed from the date "
            "the credit was utilized (i.e. date of filing the GSTR-3B return in which wrong credit set off liability) until the "
            "date of actual cash payment or reversal in the electronic credit ledger. Mere availment without utilization does "
            "not attract interest."
        ),
        "statutory_mandate": "INTEREST_CALCULATION_18_PCT"
    },
    {
        "id": 4,
        "title": "Section 141 Companies Act, 2013 & ICAI UDIN Mandate for Statutory Audit Finality",
        "section": "Section 141 Companies Act, 2013 & ICAI Council Guidelines",
        "citation": "ICAI Gazette Notification No. 1-CA(7)/192/2019",
        "content": (
            "Under Section 141 of the Companies Act 2013, statutory audit opinions, tax audit certificates (Form 3CD), "
            "and reconciliation determinations require independent human oversight by an authorized Chartered Accountant. "
            "Automated algorithms, AI systems, and ERP workflows cannot sign off or legalize tax adjustments. "
            "Every statutory certificate or audit endorsement requires generation of an 18-digit Unique Document "
            "Identification Number (UDIN) by the practicing Chartered Accountant to prevent impersonation and certify integrity."
        ),
        "statutory_mandate": "HITL_CHARTERED_ACCOUNTANT_UDIN_REQUIRED"
    }
]


class QdrantTaxKnowledgeStore:
    def __init__(self, storage_path: str = "./backend/qdrant_data"):
        self.collection_name = "indian_tax_statutes"
        self.embedder = LocalTaxEmbedder()
        
        os.makedirs(storage_path, exist_ok=True)
        # Use local persistent Qdrant instance
        try:
            self.client = QdrantClient(path=storage_path)
        except Exception:
            # Fallback to in-memory instance if locked
            self.client = QdrantClient(":memory:")
            
        self._ensure_collection_and_seed()

    def _ensure_collection_and_seed(self):
        collections = [c.name for c in self.client.get_collections().collections]
        if self.collection_name not in collections:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=self.embedder.dim, distance=Distance.COSINE)
            )
            
            # Seed knowledge base
            points = []
            for item in STATUTORY_KNOWLEDGE_BASE:
                vector = self.embedder.embed_text(f"{item['title']} {item['section']} {item['content']}")
                points.append(
                    PointStruct(
                        id=item["id"],
                        vector=vector,
                        payload=item
                    )
                )
            self.client.upsert(collection_name=self.collection_name, points=points)

    def search_statutes(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        query_vector = self.embedder.embed_text(query)
        response = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            limit=limit
        )
        return [
            {
                "score": round(hit.score, 4),
                "title": hit.payload.get("title"),
                "section": hit.payload.get("section"),
                "citation": hit.payload.get("citation"),
                "content": hit.payload.get("content"),
                "statutory_mandate": hit.payload.get("statutory_mandate")
            }
            for hit in response.points
        ]

# Singleton instance
tax_knowledge_store = QdrantTaxKnowledgeStore()
