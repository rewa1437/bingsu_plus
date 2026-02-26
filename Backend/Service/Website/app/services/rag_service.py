"""
RAG (Retrieval-Augmented Generation) service for FastAPI
"""
import os
import json
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from app.services.embeddings_service import embed_texts
from app.services.qdrant_client import search_qdrant, QDRANT_TOP_K
from app.utils.sanitize import sanitize_for_log

load_dotenv()

# RAG configuration
RAG_TIMEOUT_MS = int(os.getenv("RAG_TIMEOUT_MS", "2000"))
RAG_QUERY_VARIANT_LIMIT = int(os.getenv("RAG_QUERY_VARIANT_LIMIT", "4"))

# RAG Query Synonyms
def _parse_json_env(value: Optional[str]) -> Optional[Dict[str, Any]]:
    """Parse JSON from environment variable"""
    if not value:
        return None
    try:
        return json.loads(value)
    except:
        return None

_default_rag_synonyms = {
    "ความสามารถ": ["skill", "ability", "competency"],
    "ทักษะ": ["skill", "ability", "competency"],
    "skill": ["ความสามารถ", "ทักษะ", "ability", "competency"],
    "ability": ["ความสามารถ", "ทักษะ", "skill", "competency"],
    "competency": ["ความสามารถ", "ทักษะ", "skill", "ability"],
}

_env_rag_synonyms = _parse_json_env(os.getenv("RAG_QUERY_SYNONYMS"))
RAG_QUERY_SYNONYMS = (
    {**_default_rag_synonyms, **_env_rag_synonyms}
    if _env_rag_synonyms and isinstance(_env_rag_synonyms, dict)
    else _default_rag_synonyms
)

# Simple in-memory cache (can be replaced with Redis)
_rag_cache: Dict[str, Dict[str, Any]] = {}
RAG_CACHE_TTL_MS = 5 * 60 * 1000  # 5 minutes
RAG_CACHE_MAX_ENTRIES = 200


def _normalize_query(query: str) -> str:
    """Normalize query string"""
    return str(query or "").strip().lower()


def _build_cache_key(doc_ids: List[str], queries: List[str]) -> str:
    """Build cache key"""
    return f"{','.join(sorted(doc_ids))}::{'||'.join(queries)}"


def _expand_query_variants(query: str) -> List[str]:
    """Expand query with synonyms"""
    normalized = _normalize_query(query)
    if not normalized:
        return []
    
    variants = {normalized}
    for term, synonyms in RAG_QUERY_SYNONYMS.items():
        normalized_term = _normalize_query(term)
        if not normalized_term or normalized_term not in normalized:
            continue
        
        for synonym in synonyms if isinstance(synonyms, list) else [synonyms]:
            normalized_synonym = _normalize_query(str(synonym))
            if not normalized_synonym:
                continue
            variants.add(normalized.replace(normalized_term, normalized_synonym))
            variants.add(normalized_synonym)
    
    limit = RAG_QUERY_VARIANT_LIMIT if RAG_QUERY_VARIANT_LIMIT > 0 else 4
    return list(variants)[:max(1, limit)]


def _get_cached(key: str) -> Optional[List[Dict[str, Any]]]:
    """Get cached result"""
    import time
    entry = _rag_cache.get(key)
    if not entry:
        return None
    
    if entry.get("expires_at", 0) <= time.time() * 1000:
        _rag_cache.pop(key, None)
        return None
    
    # Move to end (LRU)
    _rag_cache.pop(key, None)
    _rag_cache[key] = entry
    return entry.get("value")


def _set_cached(key: str, value: List[Dict[str, Any]]) -> None:
    """Set cached result"""
    import time
    if len(_rag_cache) >= RAG_CACHE_MAX_ENTRIES:
        # Remove oldest (first) entry
        oldest_key = next(iter(_rag_cache), None)
        if oldest_key:
            _rag_cache.pop(oldest_key, None)
    
    _rag_cache[key] = {
        "value": value,
        "expires_at": time.time() * 1000 + RAG_CACHE_TTL_MS
    }


async def retrieve_grounding_chunks(
    document_ids: List[str],
    query: str
) -> List[Dict[str, Any]]:
    """Retrieve relevant chunks for RAG"""
    import asyncio
    
    doc_ids = sorted(list(set([str(d) for d in document_ids if d])))
    if not doc_ids:
        return []
    
    variants = _expand_query_variants(query)
    if not variants:
        return []
    
    cache_key = _build_cache_key(doc_ids, variants)
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached
    
    try:
        async def _search():
            vectors = await embed_texts(variants)
            search_results = await asyncio.gather(*[
                search_qdrant(vector, doc_ids=doc_ids, limit=QDRANT_TOP_K)
                for vector in vectors
            ])
            
            # Merge and deduplicate results
            merged = {}
            for results in search_results:
                for result in results:
                    payload = result.get("payload", {})
                    key = f"{payload.get('docId', 'unknown')}::{payload.get('chunkIndex', '')}::{str(payload.get('text', ''))[:80]}"
                    existing = merged.get(key)
                    if not existing or result.get("score", 0) > existing.get("score", 0):
                        merged[key] = result
            
            # Sort by score and limit
            sorted_results = sorted(
                merged.values(),
                key=lambda x: x.get("score", 0),
                reverse=True
            )[:QDRANT_TOP_K]
            
            return [
                {
                    "score": result.get("score", 0),
                    "retrievedContext": {
                        "text": result.get("payload", {}).get("text"),
                        "title": result.get("payload", {}).get("fileName"),
                        "docId": result.get("payload", {}).get("docId"),
                    },
                    "payload": result.get("payload", {}),
                }
                for result in sorted_results
            ]
        
        timeout_ms = RAG_TIMEOUT_MS if RAG_TIMEOUT_MS > 0 else 2000
        results = await asyncio.wait_for(_search(), timeout=timeout_ms / 1000.0)
        _set_cached(cache_key, results)
        return results
    except asyncio.TimeoutError:
        print("⚠️  RAG request timed out")
        return []
    except Exception as e:
        print(f"⚠️  Qdrant search failed: {sanitize_for_log(str(e))}")
        return []
