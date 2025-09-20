"use client";
import Link from "next/link";

export default function Dashboard() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Career Dashboard</h1>
      <ul className="mt-4 space-y-2">
        <li><Link href="/dashboard/doppelgangers">Doppelgängers</Link></li>
        <li><Link href="/dashboard/career-map">Career Map</Link></li>
        <li><Link href="/dashboard/skill-gaps">Skill Gaps</Link></li>
        <li><Link href="/dashboard/lifestyle">Lifestyle Simulation</Link></li>
        <li><Link href="/dashboard/achievements">Achievements</Link></li>
      </ul>
    </main>
  );
}
