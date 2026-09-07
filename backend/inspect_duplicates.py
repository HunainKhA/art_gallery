import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import execute_query

query = """
SELECT 
    c.document_name, 
    COUNT(*) as dup_count
FROM art_collections c
WHERE c.deleted = 0 AND c.document_name IS NOT NULL AND c.document_name != ''
GROUP BY c.document_name
HAVING COUNT(*) > 1
ORDER BY dup_count DESC
LIMIT 30;
"""

dups = execute_query(query)
print(f"Found {len(dups)} duplicate document_names:")
for d in dups:
    print(f"Code/DocName: {d['document_name']} | Count: {d['dup_count']}")
