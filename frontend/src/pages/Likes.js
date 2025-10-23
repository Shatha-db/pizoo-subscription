import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import BottomNav from '../components/BottomNav';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Likes = () => {
  const { token } = useAuth();
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLikes();
  }, []);

  const fetchLikes = async () => {
    try {
      const [sentRes, receivedRes] = await Promise.all([
        axios.get(`${API}/likes/sent`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/likes/received`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setSent(sentRes.data.profiles);
      setReceived(receivedRes.data.profiles);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const ProfileGrid = ({ profiles }) => (
    <div className="grid grid-cols-3 gap-2">
      {profiles.map((profile, i) => (
        <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-pink-200 to-purple-200">
          {profile.photos && profile.photos.length > 0 ? (
            <img src={profile.photos[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">❤️</div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-2xl font-bold text-center">الإعجابات 💕</h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        <Tabs defaultValue="sent" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sent">أرسلت ({sent.length})</TabsTrigger>
            <TabsTrigger value="received">استلمت ({received.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sent" className="mt-4">
            {loading ? <div className="text-center py-10">جاري التحميل...</div> : 
              sent.length > 0 ? <ProfileGrid profiles={sent} /> : 
              <div className="text-center py-20 text-gray-500">لم ترسل إعجابات بعد</div>
            }
          </TabsContent>
          
          <TabsContent value="received" className="mt-4">
            {loading ? <div className="text-center py-10">جاري التحميل...</div> :
              received.length > 0 ? <ProfileGrid profiles={received} /> :
              <div className="text-center py-20 text-gray-500">لم تستلم إعجابات بعد</div>
            }
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Likes;
