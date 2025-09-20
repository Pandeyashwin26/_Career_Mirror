import random, json
from utils import get_conn

def seed_careers():
    careers = ["Data Scientist","Frontend Developer","Backend Engineer",
               "UX Designer","AI Researcher"]
    conn = get_conn(); cur = conn.cursor()

    for c in careers:
        cur.execute("""INSERT INTO career_paths (title, description, avg_salary, lifestyle)
                       VALUES (%s,%s,%s,%s) ON CONFLICT DO NOTHING""",
                    (c, f"A career as {c}", random.randint(60000,180000),
                     json.dumps({"stress":"medium","travel":"occasional"})))
    conn.commit(); cur.close(); conn.close()
    print("✅ Careers seeded")

if __name__ == "__main__":
    seed_careers()
