'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

type Item = { _id: string; favoriteId: string; name: string; slug?: string };

export default function FavoritesPage() {
  const [data, setData] = useState<{ salons: Item[]; barbers: Item[] }>({ salons: [], barbers: [] });
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch('/api/favorites')
        .then((response) => response.json())
        .then((result) => setData(result.data || { salons: [], barbers: [] }));
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  async function remove(id: string) { await fetch(`/api/favorites/${id}`, { method: 'DELETE' }); const response = await fetch('/api/favorites'); const result = await response.json(); setData(result.data || { salons: [], barbers: [] }); }
  const render = (items: Item[], prefix: string) => items.map((item) => <Card key={item.favoriteId} className="p-5"><h3 className="font-bold">{item.name}</h3><a className="text-brand-pink mr-3" href={`/${prefix}/${item.slug || item._id}`}>View {prefix.slice(0, -1)}</a><Button variant="secondary" onClick={() => void remove(item.favoriteId)}>Remove</Button></Card>);
  return <main className="max-w-4xl mx-auto px-4 py-12"><h1 className="text-3xl font-bold mb-6">Favorites</h1><h2 className="text-xl font-bold mb-3">Salons</h2><div className="grid md:grid-cols-2 gap-3 mb-8">{render(data.salons, 'salons')}</div><h2 className="text-xl font-bold mb-3">Barbers</h2><div className="grid md:grid-cols-2 gap-3">{render(data.barbers, 'barbers')}</div></main>;
}
