import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Heart, X, User, MapPin, Briefcase } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Discover = () => {
  const { token, logout } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await axios.get(`${API}/profiles/discover`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfiles(response.data.profiles);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePass = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50" dir="rtl">
      <header className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-pink-600">💕 اكتشف</h1>
          <Button variant="ghost" onClick={logout}>تسجيل الخروج</Button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pt-8">
        {currentProfile ? (
          <Card className="overflow-hidden">
            <div className="h-96 bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center">
              <User className="w-32 h-32 text-white" />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{currentProfile.display_name}</h2>
              {currentProfile.bio && (
                <p className="text-gray-600 mb-4">{currentProfile.bio}</p>
              )}
              <div className="space-y-2 text-sm text-gray-600">
                {currentProfile.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {currentProfile.location}
                  </div>
                )}
                {currentProfile.occupation && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {currentProfile.occupation}
                  </div>
                )}
                {currentProfile.interests && currentProfile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currentProfile.interests.map((interest, i) => (
                      <span key={i} className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs">
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">لا توجد مزيد من الملفات الشخصية الآن</p>
            <Button onClick={fetchProfiles} className="mt-4">تحديث</Button>
          </div>
        )}

        {currentProfile && (
          <div className="flex justify-center gap-6 mt-6">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-16 h-16 border-2 border-red-500 hover:bg-red-50"
              onClick={handlePass}
            >
              <X className="w-8 h-8 text-red-500" />
            </Button>
            <Button
              size="lg"
              className="rounded-full w-16 h-16 bg-pink-500 hover:bg-pink-600"
              onClick={handleLike}
            >
              <Heart className="w-8 h-8 text-white" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Discover;
