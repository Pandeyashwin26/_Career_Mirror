import random
from datetime import datetime, timedelta
from utils import get_conn

def seed_achievements():
    achievements = [("First Steps","Completed first analysis",50),
                    ("Learner","Took a course",100)]
    conn = get_conn(); cur = conn.cursor()
    for t,d,p in achievements:
        cur.execute("INSERT INTO achievements (title,description,points) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",(t,d,p))
    conn.commit(); cur.close(); conn.close()
    print("✅ Achievements seeded")

if __name__ == "__main__":
    seed_achievements()
