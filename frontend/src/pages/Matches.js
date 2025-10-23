import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Avatar } from '../components/ui/avatar';
import BottomNav from '../components/BottomNav';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Matches = () => {
  const { token } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await axios.get(`${API}/matches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMatches(response.data.matches);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-2xl font-bold text-center">المحادثات 💬</h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        {loading ? (
          <div className="text-center py-20">جاري التحميل...</div>
        ) : matches.length > 0 ? (
          <div className="space-y-3">
            {matches.map((match) => (
              <Card key={match.match_id} className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-lg">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-2xl">
                  {match.profile.photos && match.profile.photos.length > 0 ? (
                    <img src={match.profile.photos[0]} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : '❤️'}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{match.profile.display_name}</h3>
                  <p className="text-sm text-gray-500">ابدأ المحادثة الآن...</p>
                </div>
                <div className="text-pink-500 text-2xl">💕</div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">💔</div>
            <p className="text-gray-600">لا توجد تطابقات بعد</p>
            <p className="text-sm text-gray-500 mt-2">استمر في التصفح لإيجاد تطابقك!</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Matches;
