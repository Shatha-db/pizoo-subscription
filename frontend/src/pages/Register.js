import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Clock, Shield, Gift } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    termsAccepted: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked) => {
    setFormData(prev => ({ ...prev, termsAccepted: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.termsAccepted) {
      setError('يجب الموافقة على الشروط والأحكام');
      return;
    }

    if (formData.password.length < 6) {
      setError('يجب أن تكون كلمة المرور 6 أحرف على الأقل');
      return;
    }

    setLoading(true);
    const result = await register(
      formData.name,
      formData.email,
      formData.phoneNumber,
      formData.password,
      formData.termsAccepted
    );
    setLoading(false);

    if (result.success) {
      navigate('/welcome');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 py-12" dir="rtl">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8">
        {/* Right Side - Features */}
        <div className="hidden md:flex flex-col justify-center space-y-6 p-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">ابدأ فترتك التجريبية المجانية</h1>
            <p className="text-xl text-gray-600">14 يوم مجاناً - بدون بطاقة ائتمان</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm" data-testid="feature-trial">
              <div className="bg-blue-100 p-3 rounded-full">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">فترة تجريبية 14 يوم</h3>
                <p className="text-gray-600 text-sm">استمتع بجميع المميزات مجاناً بدون الحاجة لبطاقة ائتمان</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm" data-testid="feature-price">
              <div className="bg-green-100 p-3 rounded-full">
                <Gift className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">396 CHF سنوياً</h3>
                <p className="text-gray-600 text-sm">33 فرنك شهرياً فقط - وفر 20% مع الاشتراك السنوي</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm" data-testid="feature-security">
              <div className="bg-purple-100 p-3 rounded-full">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">آمن ومشفر</h3>
                <p className="text-gray-600 text-sm">معلوماتك محمية بأعلى معايير الأمان</p>
              </div>
            </div>
          </div>
        </div>

        {/* Left Side - Form */}
        <Card className="w-full" data-testid="register-card">
          <CardHeader>
            <CardTitle className="text-2xl text-center">إنشاء حساب جديد</CardTitle>
            <CardDescription className="text-center">
              املأ البيانات للبدء في فترتك التجريبية المجانية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" data-testid="error-alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="أدخل اسمك الكامل"
                  data-testid="name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  data-testid="email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">رقم الهاتف</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="+41 XX XXX XX XX"
                  data-testid="phone-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="6 أحرف على الأقل"
                  data-testid="password-input"
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 my-4">
                <p className="text-sm text-green-800 font-medium">
                  ✅ لا حاجة لبطاقة ائتمان الآن
                </p>
                <p className="text-xs text-green-700 mt-1">
                  ستتمكن من إضافة طريقة الدفع قبل انتهاء الفترة التجريبية
                </p>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={formData.termsAccepted}
                  onCheckedChange={handleCheckboxChange}
                  data-testid="terms-checkbox"
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                  أوافق على{' '}
                  <Link 
                    to="/terms" 
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                    target="_blank"
                    data-testid="terms-link"
                  >
                    الشروط والأحكام
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="register-submit-button"
              >
                {loading ? 'جاري التسجيل...' : 'بدء الفترة التجريبية المجانية'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-600">
              لديك حساب بالفعل؟{' '}
              <Link to="/login" className="text-blue-600 hover:underline" data-testid="login-link">
                تسجيل الدخول
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Register;
