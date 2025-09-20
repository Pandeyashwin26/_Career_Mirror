"use client";
import { useState } from "react";

export default function Doppelgangers() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("http://localhost:5000/api/doppelganger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileText: input }),
    });

    const data = await res.json();
    setResults(data.doppelgangers || []);
    setLoading(false);
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Career Doppelgängers</h2>

      <form onSubmit={handleSearch} className="mt-4 flex space-x-2">
        <textarea
          className="border rounded p-2 w-full"
          placeholder="Paste your CV summary, LinkedIn profile, or skills..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? "Searching..." : "Find Doppelgängers"}
        </button>
      </form>

      <div className="mt-6 space-y-4">
        {results.map((r, i) => (
          <div
            key={i}
            className="p-4 bg-white rounded shadow hover:shadow-md transition"
          >
            <p className="text-gray-800">
              <strong>Career:</strong> {r.career || "Unknown"}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Similarity:</strong>{" "}
              {(r.score * 100).toFixed(1)}%
            </p>
            {r.skills?.length > 0 && (
              <p className="text-sm text-gray-600">
                <strong>Skills:</strong> {r.skills.join(", ")}
              </p>
            )}
            {r.profile && (
              <p className="text-sm mt-2 italic">"{r.profile}"</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
