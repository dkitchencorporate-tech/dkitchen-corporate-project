"use client";

import React, { useState } from 'react';

export default function AdminClientsTable({ initialProfiles }: { initialProfiles: any[] }) {
  const [profiles] = useState(initialProfiles);

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full text-left text-sm text-zinc-600">
        <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase font-bold text-zinc-500">
          <tr>
            <th className="px-6 py-4">Negocio / Email</th>
            <th className="px-6 py-4">Plan Actual</th>
            <th className="px-6 py-4">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {profiles && profiles.length > 0 ? (
            profiles.map((profile: any) => {
              const project = profile.projects?.[0];
              return (
                <tr key={profile.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-zinc-900">
                    {project?.restaurant_name || profile.email}
                    <span className="block text-xs font-normal text-zinc-400">{profile.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-md font-bold text-xs bg-zinc-100 text-zinc-600 capitalize">
                      {profile.plan || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${profile.onboarding_completed ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                      {profile.onboarding_completed ? 'Activo' : 'Onboarding'}
                    </span>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={3} className="px-6 py-8 text-center text-zinc-400">
                No hay clientes registrados en la base de datos todavía.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
