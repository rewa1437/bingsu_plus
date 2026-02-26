"""
Database schema and information routes
"""
import re
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.utils.sanitize import sanitize_for_log

router = APIRouter(tags=["database"])


def validate_identifier(identifier: str) -> bool:
    """Validate identifier name to prevent SQL injection"""
    # Only allow alphanumeric, underscore, and hyphen
    return bool(re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', identifier))


@router.get("/database/schemas")
async def get_all_schemas(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get all schemas from PostgreSQL database
    Returns list of schemas with their details
    """
    try:
        # Query to get all schemas
        query = text("""
            SELECT 
                schema_name,
                schema_owner
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
            ORDER BY schema_name
        """)
        
        result = db.execute(query)
        schemas = []
        
        for row in result:
            schema_name = row[0]
            schema_owner = row[1]
            
            # Get tables in this schema
            tables_query = text("""
                SELECT 
                    table_name,
                    table_type
                FROM information_schema.tables
                WHERE table_schema = :schema_name
                ORDER BY table_name
            """)
            
            tables_result = db.execute(tables_query, {"schema_name": schema_name})
            tables = []
            
            for table_row in tables_result:
                table_name = table_row[0]
                table_type = table_row[1]
                
                # Get columns for this table
                columns_query = text("""
                    SELECT 
                        column_name,
                        data_type,
                        character_maximum_length,
                        is_nullable,
                        column_default
                    FROM information_schema.columns
                    WHERE table_schema = :schema_name 
                    AND table_name = :table_name
                    ORDER BY ordinal_position
                """)
                
                columns_result = db.execute(columns_query, {
                    "schema_name": schema_name,
                    "table_name": table_name
                })
                
                columns = []
                for col_row in columns_result:
                    columns.append({
                        "name": col_row[0],
                        "type": col_row[1],
                        "max_length": col_row[2],
                        "nullable": col_row[3] == "YES",
                        "default": col_row[4]
                    })
                
                tables.append({
                    "name": table_name,
                    "type": table_type,
                    "columns": columns
                })
            
            schemas.append({
                "name": schema_name,
                "owner": schema_owner,
                "tables": tables
            })
        
        return {
            "schemas": schemas,
            "count": len(schemas)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching schemas: {sanitize_for_log(str(e))}"
        )


@router.get("/database/schemas/{schema_name}")
async def get_schema_details(schema_name: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get detailed information about a specific schema
    """
    try:
        # Verify schema exists
        schema_check = text("""
            SELECT schema_name, schema_owner
            FROM information_schema.schemata
            WHERE schema_name = :schema_name
        """)
        
        result = db.execute(schema_check, {"schema_name": schema_name})
        schema_row = result.fetchone()
        
        if not schema_row:
            raise HTTPException(
                status_code=404,
                detail=f"Schema '{schema_name}' not found"
            )
        
        # Get all tables in schema
        tables_query = text("""
            SELECT 
                table_name,
                table_type
            FROM information_schema.tables
            WHERE table_schema = :schema_name
            ORDER BY table_name
        """)
        
        tables_result = db.execute(tables_query, {"schema_name": schema_name})
        tables = []
        
        for table_row in tables_result:
            table_name = table_row[0]
            table_type = table_row[1]
            
            # Get columns
            columns_query = text("""
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = :schema_name 
                AND table_name = :table_name
                ORDER BY ordinal_position
            """)
            
            columns_result = db.execute(columns_query, {
                "schema_name": schema_name,
                "table_name": table_name
            })
            
            columns = []
            for col_row in columns_result:
                columns.append({
                    "name": col_row[0],
                    "type": col_row[1],
                    "max_length": col_row[2],
                    "precision": col_row[3],
                    "scale": col_row[4],
                    "nullable": col_row[5] == "YES",
                    "default": col_row[6]
                })
            
            tables.append({
                "name": table_name,
                "type": table_type,
                "columns": columns
            })
        
        return {
            "name": schema_row[0],
            "owner": schema_row[1],
            "tables": tables,
            "table_count": len(tables)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching schema details: {sanitize_for_log(str(e))}"
        )


@router.get("/database/schemas/{schema_name}/tables/{table_name}/data")
async def get_table_data(
    schema_name: str,
    table_name: str,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get data from a specific table
    Returns table rows with pagination support
    """
    try:
        # Validate identifiers to prevent SQL injection
        if not validate_identifier(schema_name):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid schema name: {schema_name}"
            )
        if not validate_identifier(table_name):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid table name: {table_name}"
            )
        
        # Verify table exists
        table_check = text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = :schema_name 
            AND table_name = :table_name
        """)
        
        result = db.execute(table_check, {
            "schema_name": schema_name,
            "table_name": table_name
        })
        
        if not result.fetchone():
            raise HTTPException(
                status_code=404,
                detail=f"Table '{schema_name}.{table_name}' not found"
            )
        
        # Get total count - using identifier quoting for safety
        count_query = text(f"""
            SELECT COUNT(*) 
            FROM "{schema_name}"."{table_name}"
        """)
        count_result = db.execute(count_query)
        total_count = count_result.scalar()
        
        # Get table data with pagination
        # Schema and table names are validated above, so safe to use in f-string with quotes
        data_query = text(f"""
            SELECT * 
            FROM "{schema_name}"."{table_name}"
            ORDER BY 1
            LIMIT :limit OFFSET :offset
        """)
        
        data_result = db.execute(data_query, {
            "limit": min(limit, 1000),  # Max 1000 rows per request
            "offset": offset
        })
        
        # Get column names from result
        columns = list(data_result.keys())
        
        # Convert rows to dictionaries
        rows = []
        for row in data_result:
            row_dict = {}
            for i, col in enumerate(columns):
                value = row[i]
                # Convert non-serializable types to strings
                if value is None:
                    row_dict[col] = None
                elif isinstance(value, (dict, list)):
                    row_dict[col] = str(value)
                else:
                    row_dict[col] = value
            rows.append(row_dict)
        
        return {
            "schema": schema_name,
            "table": table_name,
            "columns": columns,
            "rows": rows,
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + len(rows)) < total_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching table data: {sanitize_for_log(str(e))}"
        )
