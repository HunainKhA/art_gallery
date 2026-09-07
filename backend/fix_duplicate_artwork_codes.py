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

def determine_correct_prefix(orig_prefix, first_name, last_name):
    first = (first_name or '').strip()
    last = (last_name or '').strip()
    full = f"{first} {last}".strip()

    if 'A.H' in full.upper() or 'A H ' in full.upper() or 'RIZVI' in full.upper() or 'ANWER' in full.upper():
        return 'A.H'
    
    m = re.search(r'([A-Za-z]\.[A-Za-z])', full)
    if m:
        return m.group(1).upper()

    if orig_prefix and orig_prefix.upper() not in ('ANO', 'ART'):
        return orig_prefix.upper()

    clean_first = re.sub(r'[^A-Za-z]', '', first).upper()
    clean_last = re.sub(r'[^A-Za-z]', '', last).upper()
    clean_full = re.sub(r'[^A-Za-z]', '', full).upper()
    
    if clean_first and clean_last:
        return f"{clean_first[:2]}{clean_last[0]}"
    elif len(clean_full) >= 3:
        return clean_full[:3]
    
    return orig_prefix.upper() if orig_prefix else "ART"

def fix_all_duplicate_codes():
    id_to_doc = parse_original_sql_codes()
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    c.id, 
                    c.document_name, 
                    cstm.code_c, 
                    c.date_entered, 
                    a.first_name, 
                    a.last_name
                FROM art_collections c
                LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
                LEFT JOIN art_artists_art_collections_c rel 
                    ON c.id = rel.art_artists_art_collectionsart_collections_idb
                LEFT JOIN art_artists a 
                    ON rel.art_artists_art_collectionsart_artists_ida = a.id
                WHERE c.deleted = 0;
            """)
            rows = cursor.fetchall()

            updates = []
            recent_21 = []

            for r in rows:
                row_id = r["id"]
                code = (r.get("code_c") or r.get("document_name") or "").strip()
                orig_prefix = code.rsplit("-", 1)[0] if "-" in code else ""
                prefix = determine_correct_prefix(orig_prefix, r.get("first_name"), r.get("last_name"))

                num = None
                if "-" in code:
                    _, num_str = code.rsplit("-", 1)
                    if num_str.isdigit():
                        num = int(num_str)

                artist_full = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip().upper()

                is_recent = False
                if num:
                    if num in (5062, 5794, 5928, 5929, 5930, 5931, 5932, 5933, 5936) or (num >= 5645 and num <= 5685) or (num >= 5007 and num <= 5027):
                        if any(k in artist_full for k in ['ANWAR MAQSOOD', 'ANWAR', 'MAQSOOD', 'GHULAM MUHAMMAD', 'GHULAM RASUL', 'AMNA FAISAL', 'JAMIL NAQSH', 'SHAHANA MASHKOOR', 'SHAHANA']):
                            is_recent = True

                if is_recent:
                    r["prefix"] = prefix
                    r["num"] = num
                    recent_21.append(r)
                elif row_id in id_to_doc:
                    updates.append((id_to_doc[row_id], row_id))

            def sort_key(item):
                code = item["code_c"]
                num = int(code.rsplit("-", 1)[1]) if "-" in code and code.rsplit("-", 1)[1].isdigit() else 0
                artist = f"{item['first_name']} {item['last_name']}".upper()
                if 'ANWAR' in artist or 'MAQSOOD' in artist:
                    return 1
                elif 'GHULAM MUHAMMAD' in artist:
                    return 2 + (1 if num in (5647, 5929, 5009) else 0)
                elif 'AMNA' in artist or 'FAISAL' in artist:
                    return 10 + num
                elif 'JAMIL' in artist or 'NAQSH' in artist:
                    return 100
                elif 'GHULAM RASUL' in artist or 'RASUL' in artist:
                    return 101
                elif 'SHAHANA' in artist or 'MASHKOOR' in artist:
                    return 200 + num
                return 999

            recent_21.sort(key=sort_key)

            seq = 5007
            for item in recent_21:
                new_code = f"{item['prefix']}-{seq}"
                updates.append((new_code, item["id"]))
                print(f"Recent 21 item: {item['code_c']} ({item['first_name']} {item['last_name']}) -> {new_code}")
                seq += 1

            for new_code, row_id in updates:
                cursor.execute("UPDATE art_collections SET document_name = %s WHERE id = %s;", (new_code, row_id))
                cursor.execute("SELECT id_c FROM art_collections_cstm WHERE id_c = %s;", (row_id,))
                cstm_exists = cursor.fetchone()
                if cstm_exists:
                    cursor.execute("UPDATE art_collections_cstm SET code_c = %s WHERE id_c = %s;", (new_code, row_id))
                else:
                    cursor.execute("INSERT INTO art_collections_cstm (id_c, code_c) VALUES (%s, %s);", (row_id, new_code))

            conn.commit()
            print(f"SUCCESS! Updated {len(updates)} database records. Recent 21 batch set to 5007..{seq - 1}!")
            return len(updates)

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    fix_all_duplicate_codes()
