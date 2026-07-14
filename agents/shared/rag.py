import numpy as np
import google.generativeai as genai
import time
from shared.config import GEMINI_API_KEYS
from shared.gemini_client import _rotate_api_key, _is_quota_error, logger

# We don't configure genai directly here because gemini_client configures it globally
# and handles rotation.

# text-embedding-004 was retired for new accounts; gemini-embedding-001 is the
# current stable embedding model (verified available on this key Jul 2026).
EMBED_MODEL = "models/gemini-embedding-001"

# A lightweight mock Knowledge Base of IRDAI-compliant insurance clauses
KNOWLEDGE_BASE = [
    "Clause 10.1: Maternity expenses are only covered after a 9-month waiting period from the policy inception date. Ectopic pregnancies are covered under standard hospitalization, not maternity.",
    "Clause 15.3: Pre-existing conditions (PED) like Diabetes, Hypertension, and Asthma have a mandatory 24-month waiting period before claims can be approved.",
    "Clause 4.2: Daycare procedures such as Cataract surgery, Dialysis, and Chemotherapy are covered up to the sum insured, provided they require less than 24 hours of hospitalization.",
    "Clause 22.1: Dental treatments are strictly excluded from coverage unless they are required due to an accidental injury resulting in hospitalization.",
    "Clause 8.5: Room rent limits apply. For standard plans, daily room rent is capped at 1% of the total sum insured. ICU charges are capped at 2% of the sum insured.",
    "Clause 31.4: Cosmetic surgeries, including rhinoplasty and Botox, are strictly excluded unless required for reconstructive purposes following an accident or cancer treatment.",
    "Clause 11.2: Ayurvedic, Homeopathic, and Unani treatments (AYUSH) are covered up to 25% of the total sum insured if treated in a government-recognized AYUSH hospital.",
    "Clause 5.1: Initial 30-day waiting period applies to all non-accidental claims. Any illness diagnosed within the first 30 days of the policy is rejected."
]

# We will cache the embeddings in memory to avoid hitting the API repeatedly for the static DB
_DOCUMENT_EMBEDDINGS = None

def _safe_embed(model_name: str, content, task_type: str) -> dict:
    for attempt in range(3):
        try:
            return genai.embed_content(model=model_name, content=content, task_type=task_type)
        except Exception as e:
            if _is_quota_error(e):
                logger.error(f"[RAG] Quota exhausted: {e}")
                if _rotate_api_key():
                    continue
            logger.warning(f"[RAG] Embed failed attempt {attempt+1}: {e}")
            if attempt < 2:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise

def get_embedding(text: str) -> np.ndarray:
    """Generates an embedding vector for a given text using Gemini."""
    result = _safe_embed(EMBED_MODEL, text, "retrieval_document")
    return np.array(result['embedding'])

def get_query_embedding(text: str) -> np.ndarray:
    """Generates an embedding vector for a search query using Gemini."""
    result = _safe_embed(EMBED_MODEL, text, "retrieval_query")
    return np.array(result['embedding'])

def init_knowledge_base():
    """Initializes the vector embeddings for the knowledge base."""
    global _DOCUMENT_EMBEDDINGS
    if _DOCUMENT_EMBEDDINGS is None:
        print("[RAG] Initializing Knowledge Base Embeddings in bulk...")
        # Batch the embeddings to make 1 API call instead of looping and hitting rate limits!
        result = _safe_embed(EMBED_MODEL, KNOWLEDGE_BASE, "retrieval_document")
        _DOCUMENT_EMBEDDINGS = np.array(result['embedding'])
        print("[RAG] Knowledge Base Ready.")

def semantic_search(query: str, top_k: int = 2) -> list[str]:
    """
    Performs Retrieval-Augmented Generation (RAG) semantic search.
    Returns the top_k most relevant clauses from the Knowledge Base.
    """
    init_knowledge_base()
    
    query_vec = get_query_embedding(query)
    
    # Cosine similarity (dot product of normalized vectors)
    # Gemini embeddings are typically pre-normalized, but we normalize just in case
    query_norm = query_vec / np.linalg.norm(query_vec)
    doc_norms = _DOCUMENT_EMBEDDINGS / np.linalg.norm(_DOCUMENT_EMBEDDINGS, axis=1, keepdims=True)
    
    similarities = np.dot(doc_norms, query_norm)
    
    # Get top_k indices
    top_indices = np.argsort(similarities)[::-1][:top_k]
    
    results = [KNOWLEDGE_BASE[i] for i in top_indices]
    return results
