"use client";
import { useEffect, useState } from "react";

export default function CareerMap() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/career-map")
      .then((res) => res.json())
      .then(setData);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Career Map</h2>
      {data?.careerPaths?.map((c: any, i: number) => (
        <div key={i} className="mt-3 p-4 bg-white rounded shadow">
          <h3 className="font-bold">{c.title}</h3>
          <p>Salary: ${c.avg_salary}</p>
          <p>Lifestyle: {c.lifestyle}</p>
        </div>
      ))}
    </div>
  );
}
