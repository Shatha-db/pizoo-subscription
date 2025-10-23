import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Home, Search, Heart, MessageCircle, User } from 'lucide-react';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/home', icon: Home, label: 'الرئيسية', emoji: '❤️‍🔥' },
    { path: '/explore', icon: Search, label: 'استكشاف', emoji: '🔍' },
    { path: '/likes', icon: Heart, label: 'إعجابات', emoji: '💕' },
    { path: '/chat', icon: MessageCircle, label: 'محادثات', emoji: '💬' },
    { path: '/profile', icon: User, label: 'الحساب', emoji: '👤' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Button
              key={tab.path}
              variant="ghost"
              className={`flex flex-col items-center gap-1 h-full ${isActive ? 'text-pink-500' : 'text-gray-500'}`}
              onClick={() => navigate(tab.path)}
            >
              <span className="text-xl">{tab.emoji}</span>
              <span className="text-xs">{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
