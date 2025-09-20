import os, openai, pinecone
from utils import get_conn

openai.api_key = os.getenv("OPENAI_API_KEY")
pinecone.init(api_key=os.getenv("PINECONE_API_KEY"), environment="us-east1-gcp")

index_name = "career-mirror"
if index_name not in pinecone.list_indexes():
    pinecone.create_index(index_name, dimension=1536)
index = pinecone.Index(index_name)

def seed_embeddings():
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT id, profile_text FROM user_profiles")
    profiles = cur.fetchall()

    for uid, text in profiles:
        emb = openai.Embedding.create(
            input=text, model="text-embedding-ada-002"
        )["data"][0]["embedding"]
        index.upsert([(str(uid), emb)])

    print("✅ Embeddings synced")
    cur.close(); conn.close()

if __name__ == "__main__":
    seed_embeddings()
