"use client";
import { useEffect, useState } from "react";

export default function Achievements() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/achievements")
      .then((res) => res.json())
      .then(setData);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Achievements</h2>
      {data?.achievements?.map((a: any, i: number) => (
        <div key={i} className="mt-3 p-4 bg-white rounded shadow">
          <h3 className="font-bold">{a.title}</h3>
          <p>Points: {a.points}</p>
        </div>
      ))}
    </div>
  );
}
