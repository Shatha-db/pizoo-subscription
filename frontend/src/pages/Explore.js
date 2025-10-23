import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { Card } from '../components/ui/card';
import { Moon, Zap, Heart, Users, Globe, Music, Coffee, Mountain } from 'lucide-react';

const Explore = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(null);

  const categories = [
    {
      id: 'new-friends',
      title: 'أصدقاء جُدد',
      subtitle: 'ابحث عن أصدقاء جدد',
      emoji: '👋',
      gradient: 'from-orange-400 to-red-400',
      users: 2847,
      icon: Users
    },
    {
      id: 'long-term',
      title: 'شريك لفترة طويلة',
      subtitle: 'علاقة جدية',
      emoji: '💕',
      gradient: 'from-purple-400 to-pink-400',
      users: 3521,
      icon: Heart
    },
    {
      id: 'fun-time',
      title: 'قضاء وقت ممتع',
      subtitle: 'مواعدة عفوية',
      emoji: '🎉',
      gradient: 'from-blue-400 to-purple-400',
      users: 1892,
      icon: Zap
    },
    {
      id: 'night-owl',
      title: 'Night Owl',
      subtitle: 'نشطون الآن',
      emoji: '🌙',
      gradient: 'from-indigo-500 to-purple-600',
      users: 456,
      icon: Moon,
      badge: 'جديد'
    },
    {
      id: 'travelers',
      title: 'محبو السفر',
      subtitle: 'مغامرون حول العالم',
      emoji: '✈️',
      gradient: 'from-cyan-400 to-blue-400',
      users: 1247,
      icon: Globe
    },
    {
      id: 'music-lovers',
      title: 'محبو الموسيقى',
      subtitle: 'عشاق الموسيقى والحفلات',
      emoji: '🎵',
      gradient: 'from-pink-400 to-red-400',
      users: 2103,
      icon: Music
    },
    {
      id: 'coffee-dates',
      title: 'عشاق القهوة',
      subtitle: 'لقاءات مقهى مريحة',
      emoji: '☕',
      gradient: 'from-amber-400 to-orange-400',
      users: 987,
      icon: Coffee
    },
    {
      id: 'nature-lovers',
      title: 'محبو الطبيعة',
      subtitle: 'مشي لمسافات طويلة والهواء الطلق',
      emoji: '🌿',
      gradient: 'from-green-400 to-emerald-400',
      users: 1564,
      icon: Mountain
    }
  ];

  const moods = [
    {
      id: 'serious',
      title: 'جاد',
      emoji: '💼',
      color: 'bg-blue-500'
    },
    {
      id: 'casual',
      title: 'غير رسمي',
      emoji: '😊',
      color: 'bg-green-500'
    },
    {
      id: 'fun',
      title: 'ممتع',
      emoji: '🎊',
      color: 'bg-purple-500'
    },
    {
      id: 'romantic',
      title: 'رومانسي',
      emoji: '💖',
      color: 'bg-pink-500'
    }
  ];

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
    // TODO: Navigate to filtered profiles
    // navigate(`/browse/${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold">استكشاف 🔍</h1>
        <p className="text-gray-600 text-sm">اكتشف أشخاص جدد حسب اهتماماتك</p>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Moods Section */}
        <section>
          <h2 className="text-lg font-bold mb-3">كيف تشعر اليوم؟</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {moods.map((mood) => (
              <button
                key={mood.id}
                className={`${mood.color} text-white px-6 py-3 rounded-full flex items-center gap-2 whitespace-nowrap shadow-lg hover:shadow-xl transition-shadow`}
              >
                <span className="text-xl">{mood.emoji}</span>
                <span className="font-medium">{mood.title}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Categories Grid */}
        <section>
          <h2 className="text-lg font-bold mb-3">تصفح حسب الاهتمامات</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((category) => {
              const IconComponent = category.icon;
              
              return (
                <Card
                  key={category.id}
                  className={`relative p-6 cursor-pointer transition-all hover:scale-105 bg-gradient-to-br ${category.gradient} text-white overflow-hidden group`}
                  onClick={() => handleCategoryClick(category.id)}
                >
                  {/* Badge */}
                  {category.badge && (
                    <div className="absolute top-2 left-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold">
                      {category.badge}
                    </div>
                  )}

                  {/* Background Icon */}
                  <div className="absolute -bottom-4 -right-4 opacity-20">
                    <IconComponent className="w-24 h-24" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    <div className="text-4xl mb-2">{category.emoji}</div>
                    <h3 className="font-bold text-lg mb-1">{category.title}</h3>
                    <p className="text-white/80 text-sm mb-3">{category.subtitle}</p>
                    
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <span>{category.users.toLocaleString()}</span>
                      <span className="text-white/80">مستخدم</span>
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </Card>
              );
            })}
          </div>
        </section>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-2 py-4">
          {[1, 2, 3].map((dot) => (
            <div
              key={dot}
              className={`w-2 h-2 rounded-full ${
                dot === 1 ? 'bg-pink-500 w-8' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Featured Section */}
        <section className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">🌟 اختيارات اليوم المميزة</h2>
          <p className="mb-4">ملفات شخصية مختارة خصيصاً لك</p>
          <button
            onClick={() => navigate('/home')}
            className="bg-white text-pink-600 px-6 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors"
          >
            اكتشف الآن
          </button>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Explore;
