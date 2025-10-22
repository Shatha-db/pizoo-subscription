import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { X, Plus, Camera } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    date_of_birth: '',
    gender: '',
    height: '',
    looking_for: '',
    location: '',
    occupation: '',
    education: '',
    relationship_goals: '',
    smoking: '',
    drinking: '',
    has_children: null,
    wants_children: null
  });
  const [interests, setInterests] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [newInterest, setNewInterest] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const removeInterest = (interest) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !languages.includes(newLanguage.trim())) {
      setLanguages([...languages, newLanguage.trim()]);
      setNewLanguage('');
    }
  };

  const removeLanguage = (language) => {
    setLanguages(languages.filter(l => l !== language));
  };

  const handleSubmit = async () => {
    setError('');

    if (!formData.display_name) {
      setError('يرجى إدخال اسم العرض');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/profile/create`, {
        ...formData,
        height: formData.height ? parseInt(formData.height) : null,
        interests,
        languages
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      navigate('/discover');
    } catch (error) {
      setError(error.response?.data?.detail || 'حدث خطأ أثناء إنشاء الملف');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !formData.display_name) {
      setError('يرجى إدخال اسم العرض');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-2xl" data-testid="profile-setup-card">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">أكمل ملفك الشخصي</CardTitle>
          <CardDescription>
            خطوة {step} من 3 - أخبرنا عن نفسك لنساعدك في إيجاد التطابق المثالي
          </CardDescription>
          <div className="flex gap-2 mt-4">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-pink-500' : 'bg-gray-200'}`} />
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-pink-500' : 'bg-gray-200'}`} />
            <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-pink-500' : 'bg-gray-200'}`} />
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: المعلومات الأساسية */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">اسمك أو اسمك المستعار *</Label>
                <Input
                  id="display_name"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  placeholder="ما الاسم الذي تريد أن يظهر للآخرين؟"
                  data-testid="display-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">نبذة عنك</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="أخبر الآخرين قليلاً عن نفسك..."
                  rows={4}
                  data-testid="bio-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">تاريخ الميلاد</Label>
                  <Input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    data-testid="dob-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">الجنس</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleSelectChange('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                      <SelectItem value="other">آخر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">الطول (سم)</Label>
                  <Input
                    id="height"
                    name="height"
                    type="number"
                    value={formData.height}
                    onChange={handleChange}
                    placeholder="170"
                    data-testid="height-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">الموقع</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="المدينة، البلد"
                    data-testid="location-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: المعلومات الشخصية */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="occupation">المهنة</Label>
                <Input
                  id="occupation"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                  placeholder="ماذا تعمل؟"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="education">التعليم</Label>
                <Input
                  id="education"
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  placeholder="أعلى شهادة حصلت عليها"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationship_goals">ماذا تبحث عنه؟</Label>
                <Select value={formData.relationship_goals} onValueChange={(value) => handleSelectChange('relationship_goals', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="serious">علاقة جدية</SelectItem>
                    <SelectItem value="casual">علاقة عابرة</SelectItem>
                    <SelectItem value="friendship">صداقة</SelectItem>
                    <SelectItem value="not_sure">لست متأكد</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smoking">التدخين</Label>
                  <Select value={formData.smoking} onValueChange={(value) => handleSelectChange('smoking', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">نعم</SelectItem>
                      <SelectItem value="no">لا</SelectItem>
                      <SelectItem value="sometimes">أحياناً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="drinking">الكحول</Label>
                  <Select value={formData.drinking} onValueChange={(value) => handleSelectChange('drinking', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">نعم</SelectItem>
                      <SelectItem value="no">لا</SelectItem>
                      <SelectItem value="sometimes">أحياناً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="has_children">لديك أطفال؟</Label>
                  <Select value={formData.has_children === null ? '' : formData.has_children.toString()} onValueChange={(value) => handleSelectChange('has_children', value === 'true')}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">نعم</SelectItem>
                      <SelectItem value="false">لا</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wants_children">تريد أطفالاً؟</Label>
                  <Select value={formData.wants_children === null ? '' : formData.wants_children.toString()} onValueChange={(value) => handleSelectChange('wants_children', value === 'true')}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">نعم</SelectItem>
                      <SelectItem value="false">لا</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: الهوايات واللغات */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الهوايات والاهتمامات</Label>
                <div className="flex gap-2">
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="أضف هواية (مثل: السفر، القراءة، الرياضة)"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                  />
                  <Button type="button" onClick={addInterest} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {interests.map((interest, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {interest}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeInterest(interest)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>اللغات التي تتحدثها</Label>
                <div className="flex gap-2">
                  <Input
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    placeholder="أضف لغة (مثل: العربية، الإنجليزية)"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                  />
                  <Button type="button" onClick={addLanguage} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {languages.map((language, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {language}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeLanguage(language)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-pink-900">
                  💡 نصيحة: كلما أضفت معلومات أكثر، كلما ساعدنا ذلك في إيجاد التطابق المثالي لك!
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-6">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                السابق
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" onClick={nextStep} className="flex-1">
                التالي
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? 'جاري الحفظ...' : 'إنهاء وابدأ الاكتشاف'}
              </Button>
            )}
          </div>

          <p className="text-xs text-center text-gray-500 mt-4">
            يمكنك تعديل ملفك الشخصي في أي وقت لاحقاً
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSetup;
