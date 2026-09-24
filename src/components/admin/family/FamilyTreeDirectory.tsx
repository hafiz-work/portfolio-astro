import React, { useEffect, useState } from "react";
import { familyService } from "../../../lib/family";
import type { FamilyTree } from "../../../types/family";

export const FamilyTreeDirectory = () => {
  const [trees, setTrees] = useState<FamilyTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await familyService.getAdminTrees();
        setTrees(result);
      } catch (err) {
        console.error(err);
        setError("Failed to load family trees.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-6 text-sm text-gray-400">
        Loading family trees...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Existing Trees</h2>
          <p className="mt-1 text-sm text-gray-400">
            Pick a family tree to continue editing in the visual builder.
          </p>
        </div>
        <a
          href="/admin/family/new"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
        >
          New Family Tree
        </a>
      </div>

      {trees.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-6 text-sm text-gray-400">
          No family trees yet. Create your first tree to start building.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {trees.map((tree) => (
            <article
              key={tree.id}
              className="rounded-xl border border-gray-700 bg-gray-800/40 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{tree.name}</h3>
                  <p className="mt-1 font-mono text-xs text-cyan-300">/{tree.slug}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tree.isPublic
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-gray-700/60 text-gray-300"
                    }`}
                >
                  {tree.isPublic ? "PUBLIC" : "PRIVATE"}
                </span>
              </div>

              <p className="mt-3 min-h-10 text-sm text-gray-400">
                {tree.description || "No description yet."}
              </p>

              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500">
                  Updated {new Date(tree.updatedAt).toLocaleDateString()}
                </span>
                <a
                  href={`/admin/family/edit?id=${tree.id}`}
                  className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
                >
                  Open Builder
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
