import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import BottomNav from '../components/BottomNav';
import { Heart, X, Star, RotateCcw, Zap, Info } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState(false);
  const [showNewLikesPopup, setShowNewLikesPopup] = useState(false);
  const [newLikesCount, setNewLikesCount] = useState(0);

  useEffect(() => {
    fetchProfiles();
    checkNewLikes();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await axios.get(`${API}/profiles/discover?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfiles(response.data.profiles);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNewLikes = async () => {
    try {
      const response = await axios.get(`${API}/likes/received`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const likesCount = response.data.profiles?.length || 0;
      
      // Show popup if there are new likes (simulate new likes check)
      const lastSeenCount = localStorage.getItem('lastSeenLikesCount') || 0;
      if (likesCount > lastSeenCount && likesCount > 0) {
        setNewLikesCount(likesCount);
        setShowNewLikesPopup(true);
      }
    } catch (error) {
      console.error('Error checking likes:', error);
    }
  };

  const handleDismissLikesPopup = () => {
    localStorage.setItem('lastSeenLikesCount', newLikesCount.toString());
    setShowNewLikesPopup(false);
  };

  const handleSwipe = async (action) => {
    if (!currentProfile) return;
    
    try {
      const response = await axios.post(`${API}/swipe`, {
        swiped_user_id: currentProfile.user_id,
        action
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.is_match) {
        setShowMatch(true);
        setTimeout(() => setShowMatch(false), 3000);
      }
      
      setCurrentIndex(currentIndex + 1);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const currentProfile = profiles[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 pb-20" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-red-500 bg-clip-text text-transparent">
          ❤️‍🔥 Pizoo
        </div>
        <Button variant="ghost" size="icon">
          <Zap className="w-6 h-6 text-purple-500" />
        </Button>
      </header>

      {/* Main Card */}
      <main className="max-w-md mx-auto px-4 pt-6">
        {currentProfile ? (
          <Card className="overflow-hidden shadow-2xl">
            <div className="relative h-96 bg-gradient-to-br from-pink-200 to-purple-200">
              {currentProfile.photos && currentProfile.photos.length > 0 ? (
                <img 
                  src={currentProfile.photos[0]} 
                  alt={currentProfile.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-6xl">❤️</div>
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
                <h2 className="text-3xl font-bold">{currentProfile.display_name}</h2>
                <p className="text-lg opacity-90">{currentProfile.occupation || 'Professional'}</p>
                <p className="text-sm opacity-80 mt-1">📍 {currentProfile.location}</p>
                {currentProfile.bio && (
                  <p className="text-sm mt-2 opacity-90">{currentProfile.bio}</p>
                )}
              </div>

              <Button 
                size="icon" 
                variant="ghost" 
                className="absolute top-4 left-4 bg-white/20 backdrop-blur"
              >
                <Info className="w-5 h-5 text-white" />
              </Button>
            </div>

            {currentProfile.interests && currentProfile.interests.length > 0 && (
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {currentProfile.interests.slice(0, 5).map((interest, i) => (
                    <span key={i} className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">😔</div>
            <p className="text-xl text-gray-600 mb-4">لا توجد مزيد من الملفات</p>
            <Button onClick={fetchProfiles} className="bg-pink-500 hover:bg-pink-600">
              🔄 تحديث
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        {currentProfile && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <Button
              size="icon"
              className="w-14 h-14 rounded-full bg-white shadow-lg hover:shadow-xl border-2 border-yellow-400"
              onClick={() => {}}
            >
              <RotateCcw className="w-6 h-6 text-yellow-500" />
            </Button>

            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-white shadow-lg hover:shadow-xl border-2 border-red-400"
              onClick={() => handleSwipe('pass')}
            >
              <X className="w-8 h-8 text-red-500" />
            </Button>

            <Button
              size="icon"
              className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-500 to-red-500 shadow-lg hover:shadow-xl"
              onClick={() => handleSwipe('like')}
            >
              <Heart className="w-10 h-10 text-white" fill="white" />
            </Button>

            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-white shadow-lg hover:shadow-xl border-2 border-blue-400"
              onClick={() => handleSwipe('super_like')}
            >
              <Star className="w-8 h-8 text-blue-500" />
            </Button>

            <Button
              size="icon"
              className="w-14 h-14 rounded-full bg-white shadow-lg hover:shadow-xl border-2 border-purple-400"
            >
              <Zap className="w-6 h-6 text-purple-500" />
            </Button>
          </div>
        )}
      </main>

      {/* Match Popup */}
      {showMatch && (
        <div className="fixed inset-0 bg-gradient-to-br from-pink-500/95 to-purple-500/95 flex items-center justify-center z-50 animate-in fade-in">
          <div className="text-center text-white">
            <div className="text-8xl mb-6 animate-bounce">💕</div>
            <h2 className="text-4xl font-bold mb-2">إنه تطابق!</h2>
            <p className="text-xl">تم إنشاء تطابق جديد</p>
          </div>
        </div>
      )}

      {/* New Likes Popup */}
      {showNewLikesPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-4 border-yellow-400">
            <div className="text-center">
              <div className="text-6xl mb-4">💕</div>
              <h2 className="text-2xl font-bold mb-2">
                لديك {newLikesCount} إعجابات جديدة!
              </h2>
              <p className="text-gray-700 mb-6">
                بعض الأشخاص معجبون بك. اكتشف من هم!
              </p>
              
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4].slice(0, Math.min(newLikesCount, 4)).map((_, index) => (
                  <div
                    key={index}
                    className="flex-1 aspect-square rounded-lg bg-gradient-to-br from-pink-300 to-purple-300 blur-sm"
                  />
                ))}
              </div>

              <Button
                onClick={() => {
                  handleDismissLikesPopup();
                  navigate('/likes-you');
                }}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-bold text-lg py-6 mb-3"
              >
                <Zap className="w-5 h-5 ml-2" />
                انظر من أبدى إعجابه بك
              </Button>
              
              <Button
                onClick={handleDismissLikesPopup}
                variant="ghost"
                className="w-full"
              >
                ربما لاحقاً
              </Button>
            </div>
          </Card>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Home;
