import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { CreditCard, Shield, Clock } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    paymentType: 'card',
    cardNumber: '',
    cardHolderName: '',
    cardExpiry: '',
    cardCvv: '',
    paypalEmail: '',
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

  const handlePaymentTypeChange = (value) => {
    setFormData(prev => ({ ...prev, paymentType: value }));
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData(prev => ({ ...prev, cardNumber: formatted }));
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

    if (formData.paymentType === 'card') {
      if (!formData.cardNumber || !formData.cardHolderName || !formData.cardExpiry || !formData.cardCvv) {
        setError('يرجى إدخال جميع معلومات البطاقة');
        return;
      }
    } else if (formData.paymentType === 'paypal') {
      if (!formData.paypalEmail) {
        setError('يرجى إدخال بريد PayPal الإلكتروني');
        return;
      }
    }

    setLoading(true);
    const result = await register(
      formData.name,
      formData.email,
      formData.phoneNumber,
      formData.password,
      formData.paymentType,
      formData.cardNumber.replace(/\s/g, ''),
      formData.cardHolderName,
      formData.cardExpiry,
      formData.cardCvv,
      formData.paypalEmail,
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
            <p className="text-xl text-gray-600">14 يوم مجاناً - بدون التزام</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm" data-testid="feature-trial">
              <div className="bg-blue-100 p-3 rounded-full">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">فترة تجريبية 14 يوم</h3>
                <p className="text-gray-600 text-sm">استمتع بجميع المميزات مجاناً لمدة أسبوعين</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm" data-testid="feature-price">
              <div className="bg-green-100 p-3 rounded-full">
                <CreditCard className="w-6 h-6 text-green-600" />
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
                <h3 className="font-semibold text-gray-900 mb-1">دفع آمن ومشفر</h3>
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
              املأ البيانات للبدء في فترتك التجريبية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" data-testid="error-alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">المعلومات الشخصية</h3>
                
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
              </div>

              {/* Payment Information */}
              <div className="space-y-4 pt-4">
                <h3 className="font-semibold text-lg border-b pb-2">معلومات الدفع</h3>
                
                <Tabs value={formData.paymentType} onValueChange={handlePaymentTypeChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="card">بطاقة بنكية</TabsTrigger>
                    <TabsTrigger value="paypal">PayPal</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="card" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">رقم البطاقة</Label>
                      <Input
                        id="cardNumber"
                        name="cardNumber"
                        type="text"
                        maxLength="19"
                        value={formData.cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="1234 5678 9012 3456"
                        data-testid="card-number-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cardHolderName">اسم حامل البطاقة</Label>
                      <Input
                        id="cardHolderName"
                        name="cardHolderName"
                        type="text"
                        value={formData.cardHolderName}
                        onChange={handleChange}
                        placeholder="الاسم كما يظهر على البطاقة"
                        data-testid="card-holder-input"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardExpiry">تاريخ الانتهاء</Label>
                        <Input
                          id="cardExpiry"
                          name="cardExpiry"
                          type="text"
                          maxLength="5"
                          value={formData.cardExpiry}
                          onChange={handleChange}
                          placeholder="MM/YY"
                          data-testid="card-expiry-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardCvv">CVV</Label>
                        <Input
                          id="cardCvv"
                          name="cardCvv"
                          type="text"
                          maxLength="3"
                          value={formData.cardCvv}
                          onChange={handleChange}
                          placeholder="123"
                          data-testid="card-cvv-input"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="paypal" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="paypalEmail">بريد PayPal الإلكتروني</Label>
                      <Input
                        id="paypalEmail"
                        name="paypalEmail"
                        type="email"
                        value={formData.paypalEmail}
                        onChange={handleChange}
                        placeholder="paypal@email.com"
                        data-testid="paypal-email-input"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <p className="text-xs text-gray-500 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  💳 لن يتم خصم أي مبلغ خلال الفترة التجريبية (14 يوم)
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
