# backend/test_db_connection.py
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db_service import get_current_db_type, db_get_all_users
from backend.mongo_database import is_mongo_connected, init_mongo, MONGO_URI, DB_NAME

if is_mongo_connected():
    init_mongo()

print("=" * 60)
print(" VICKY AI CHESS - DATABASE STATUS CHECK")
print("=" * 60)
print(f"Configured MongoDB URI : {MONGO_URI}")
print(f"Target Database Name   : {DB_NAME}")
print(f"MongoDB Reachable?     : {is_mongo_connected()}")
print(f"Active Engine in Use   : {get_current_db_type().upper()}")

users = db_get_all_users()
print(f"Total Registered Users : {len(users)}")
for u in users:
    print(f"  - [{u.get('username')}] {u.get('name')} (Rating: {u.get('rating', 1200)})")

print("=" * 60)
if is_mongo_connected():
    print("SUCCESS: MongoDB is live and active!")
else:
    print("NOTE: MongoDB is not connected. SQLite fallback is handling all users & matches safely.")
print("=" * 60)

