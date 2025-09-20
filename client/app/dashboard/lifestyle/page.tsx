"use client";
import { useEffect, useState } from "react";

export default function Lifestyle() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/lifestyle/simulate")
      .then((res) => res.json())
      .then(setData);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Lifestyle Simulation</h2>
      {data && (
        <div className="mt-3 p-4 bg-white rounded shadow">
          <p>Salary: ${data.salary}</p>
          <p>Work-Life Balance: {data.work_life_balance}</p>
          <p>Stress: {data.stress}</p>
          <p>Travel: {data.travel}</p>
        </div>
      )}
    </div>
  );
}
