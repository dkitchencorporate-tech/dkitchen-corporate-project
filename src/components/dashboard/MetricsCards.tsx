import React from 'react';

export default function MetricsCards({ chats }: { chats: any[] }) {
  // Calculos básicos
  const uniqueClients = new Set(chats.map(c => c.phone)).size;
  
  // Buscar último intent por cliente
  const intentByClient: Record<string, string> = {};
  // Los chats vienen ordenados por created_at descending (los primeros son más recientes)
  chats.forEach(chat => {
    if (chat.role === 'assistant' && chat.intent && !intentByClient[chat.phone]) {
      intentByClient[chat.phone] = chat.intent;
    }
  });

  let totalSales = 0;
  let totalRejections = 0;
  let totalLeads = 0;

  Object.values(intentByClient).forEach(intent => {
    if (intent === 'venta') totalSales++;
    else if (intent === 'rechazo') totalRejections++;
    else totalLeads++;
  });

  const conversionRate = uniqueClients > 0 ? Math.round((totalSales / uniqueClients) * 100) : 0;
  const rejectionRate = uniqueClients > 0 ? Math.round((totalRejections / uniqueClients) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
        <div className="text-gray-500 font-bold tracking-wider text-sm uppercase mb-2">Total Contactos</div>
        <div className="text-4xl font-black text-gray-900">{uniqueClients}</div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
        <div className="text-gray-500 font-bold tracking-wider text-sm uppercase mb-2">Ventas / Cierres</div>
        <div className="text-4xl font-black text-green-500">{totalSales}</div>
      </div>
      <div className="bg-vino text-white p-6 rounded-2xl shadow-lg flex flex-col justify-center items-center text-center">
        <div className="font-bold tracking-wider text-sm uppercase mb-2">Tasa de Conversión</div>
        <div className="text-4xl font-black">{conversionRate}%</div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
        <div className="text-gray-500 font-bold tracking-wider text-sm uppercase mb-2">Tasa de Rechazo</div>
        <div className="text-3xl font-bold text-red-400">{rejectionRate}%</div>
      </div>
    </div>
  );
}
