import os, psycopg2
from faker import Faker

DB_URL = os.getenv("DATABASE_URL")
fake = Faker()

def get_conn():
    return psycopg2.connect(DB_URL)
