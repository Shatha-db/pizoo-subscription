import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import BottomNav from '../components/BottomNav';

const Explore = () => {
  const navigate = useNavigate();

  const categories = [
    { id: 1, title: 'أصدقاء جُدد', count: '259K', color: 'bg-gradient-to-br from-orange-400 to-red-400', emoji: '👋' },
    { id: 2, title: 'شريك لفترة طويلة', count: '214K', color: 'bg-gradient-to-br from-purple-400 to-pink-400', emoji: '💕' },
    { id: 3, title: 'قضاء وقت ممتع', count: '567K', color: 'bg-gradient-to-br from-blue-400 to-purple-400', emoji: '🎉' },
    { id: 4, title: 'محبو السفر', count: '212K', color: 'bg-gradient-to-br from-teal-400 to-green-400', emoji: '✈️' },
    { id: 5, title: 'محبو الموسيقى', count: '211K', color: 'bg-gradient-to-br from-pink-400 to-red-400', emoji: '🎵' },
    { id: 6, title: 'محبو الرياضة', count: '263K', color: 'bg-gradient-to-br from-green-400 to-teal-400', emoji: '⚽' },
    { id: 7, title: 'عشاق القهوة', count: '189K', color: 'bg-gradient-to-br from-amber-400 to-orange-400', emoji: '☕' },
    { id: 8, title: 'محبو الطبيعة', count: '156K', color: 'bg-gradient-to-br from-green-500 to-emerald-400', emoji: '🌿' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20" dir="rtl">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-2xl font-bold text-center">استكشف 🔍</h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {categories.map((cat) => (
            <Card 
              key={cat.id}
              className={`${cat.color} p-6 cursor-pointer hover:scale-105 transition-transform`}
              onClick={() => navigate('/home')}
            >
              <div className="text-white">
                <div className="text-4xl mb-2">{cat.emoji}</div>
                <h3 className="font-bold text-lg mb-1">{cat.title}</h3>
                <p className="text-sm opacity-90">{cat.count}</p>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Explore;
