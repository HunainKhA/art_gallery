import sys
import os
import re

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db_connection

def parse_original_sql_codes():
    sql_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mf_db_website", "mf_db_latest.sql")
    if not os.path.exists(sql_path):
        print(f"SQL dump file not found at {sql_path}")
        return {}

    id_to_doc = {}
    with open(sql_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    start_str = "INSERT INTO `art_collections` VALUES "
    start_pos = content.find(start_str)
    if start_pos == -1:
        return {}

    end_pos = content.find(";\n", start_pos)
    if end_pos == -1:
        end_pos = len(content)

    insert_block = content[start_pos + len(start_str):end_pos]
    tuples = insert_block.split("),(")

    for t in tuples:
        t_clean = t.lstrip("(").rstrip(")")
        fields = []
        in_quote = False
        cur = []
        i = 0
        while i < len(t_clean):
            c = t_clean[i]
            if c == "'" and (i == 0 or t_clean[i-1] != "\\"):
                in_quote = not in_quote
            elif c == "," and not in_quote:
                fields.append("".join(cur).strip().strip("'"))
                cur = []
                i += 1
                continue
            cur.append(c)
            i += 1
        if cur:
            fields.append("".join(cur).strip().strip("'"))

        if len(fields) >= 9:
            row_id = fields[0]
            doc_name = fields[8]
            if row_id and len(row_id) == 36 and doc_name:
                id_to_doc[row_id] = doc_name

    return id_to_doc

def restore_all_database_codes():
    id_to_doc = parse_original_sql_codes()
    print(f"Found {len(id_to_doc)} original artwork records in SQL dump.")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            restored = 0
            for row_id, orig_code in id_to_doc.items():
                cursor.execute("UPDATE art_collections SET document_name = %s WHERE id = %s;", (orig_code, row_id))
                cursor.execute("SELECT id_c FROM art_collections_cstm WHERE id_c = %s;", (row_id,))
                cstm_exists = cursor.fetchone()
                if cstm_exists:
                    cursor.execute("UPDATE art_collections_cstm SET code_c = %s WHERE id_c = %s;", (orig_code, row_id))
                else:
                    cursor.execute("INSERT INTO art_collections_cstm (id_c, code_c) VALUES (%s, %s);", (row_id, orig_code))
                restored += 1

            conn.commit()
            print(f"SUCCESSFULLY RESTORED {restored} artwork codes back to original SQL dump state!")
            return restored
    except Exception as e:
        conn.rollback()
        print(f"Error restoring codes: {e}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    restore_all_database_codes()
