from utils import get_conn, fake

def seed_users():
    conn = get_conn()
    cur = conn.cursor()

    for _ in range(20):
        name = fake.name()
        email = fake.email()
        headline = fake.job()
        profile_text = fake.text(max_nb_chars=500)

        cur.execute("INSERT INTO users (name, email) VALUES (%s,%s) RETURNING id",
                    (name, email))
        user_id = cur.fetchone()[0]

        cur.execute("INSERT INTO user_profiles (user_id, headline, profile_text) VALUES (%s,%s,%s)",
                    (user_id, headline, profile_text))

    conn.commit(); cur.close(); conn.close()
    print("✅ Users seeded")

if __name__ == "__main__":
    seed_users()
