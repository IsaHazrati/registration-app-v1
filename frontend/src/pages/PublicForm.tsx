import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const PublicForm: React.FC = () => {
  const fieldLabels: { [key: string]: string } = {
    national_code: 'کد ملی',
    phone_number: 'شماره تماس',
    current_phone_number: 'شماره تلفن قبلی',
    items: 'محصولات'
  };

  const getValidationErrorMessage = (error: any): string => {
    const detail = error.response?.data?.detail;
    if (!detail) return 'خطا در ثبت اطلاعات. لطفاً دوباره تلاش کنید.';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d: any) => {
          const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : '';
          const label = fieldLabels[field] || field;
          return `${label}: ${d.msg}`;
        })
        .join(' | ');
    }
    return 'خطا در ثبت اطلاعات. لطفاً دوباره تلاش کنید.';
  };

  // ====== مراحل فرم: lookup (جست‌وجوی کدملی) -> verify (تأیید هویت برای ویرایش) -> form (فرم اصلی) ======
  const [step, setStep] = useState<'lookup' | 'verify' | 'form'>('lookup');
  const [nationalCode, setNationalCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [personInfo, setPersonInfo] = useState<any>(null);
  const [notFoundModal, setNotFoundModal] = useState(false);

  const [verifyPhone, setVerifyPhone] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [requestItems, setRequestItems] = useState<{ [key: number]: number }>({});
  const [deadline, setDeadline] = useState<string | null>(null);
  const [adminDescription, setAdminDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [submitted, setSubmitted] = useState(false);
  const [showEditSuccessModal, setShowEditSuccessModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsRes = await axios.get('/api/products/public');
        setProducts(productsRes.data);

        const deadlineRes = await axios.get('/api/settings/deadline');
        setDeadline(deadlineRes.data.edit_deadline);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    fetchData();
  }, []);

  const handleReset = () => {
    setStep('lookup');
    setNationalCode('');
    setPersonInfo(null);
    setNotFoundModal(false);
    setVerifyPhone('');
    setVerifyError('');
    setIsEditing(false);
    setVerifiedPhone('');
    setPhoneNumber('');
    setPhoneError('');
    setRequestItems({});
    setAdminDescription('');
    setMessage('');
    setSubmitted(false);
  };

  const handleSearch = async () => {
    setMessage('');
    if (!/^\d{10}$/.test(nationalCode)) {
      setMessage('❌ کد ملی باید دقیقاً ۱۰ رقم و فقط عدد باشد.');
      setMessageType('error');
      return;
    }

    setSearching(true);
    try {
      const personRes = await axios.get(`/api/authorized-persons/lookup/${nationalCode}`);
      setPersonInfo(personRes.data);

      const existsRes = await axios.get(`/api/requests/exists/${nationalCode}`);
      if (existsRes.data.exists) {
        setStep('verify');
      } else {
        setIsEditing(false);
        setPhoneNumber('');
        setPhoneError('');
        setRequestItems({});
        setAdminDescription('');
        setStep('form');
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setNotFoundModal(true);
      } else {
        setMessage('❌ خطا در جست‌وجو. لطفاً دوباره تلاش کنید.');
        setMessageType('error');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleVerifyPhone = async () => {
    setVerifyError('');
    if (!/^09\d{9}$/.test(verifyPhone)) {
      setVerifyError('شماره تلفن باید به فرمت صحیح موبایل ایران (مثال: 09123456789) باشد.');
      return;
    }

    setVerifying(true);
    try {
      const res = await axios.post('/api/requests/verify-edit', {
        national_code: nationalCode,
        phone_number: verifyPhone
      });
      const existing = res.data;
      setIsEditing(true);
      setVerifiedPhone(verifyPhone);
      setPhoneNumber(existing.phone_number || verifyPhone);
      setPhoneError('');
      setAdminDescription(existing.admin_description || '');

      const items: { [key: number]: number } = {};
      existing.items.forEach((item: any) => {
        items[item.product_id] = item.quantity;
      });
      setRequestItems(items);
      setStep('form');
    } catch (error: any) {
      setVerifyError(error.response?.data?.detail || 'شماره تلفن واردشده صحیح نیست. لطفاً دوباره تلاش کنید.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setPhoneError('');

    if (!/^09\d{9}$/.test(phoneNumber)) {
      const errText = phoneNumber.trim() === ''
        ? 'لطفاً شماره تماس را وارد کنید.'
        : 'شماره تماس باید به فرمت صحیح موبایل ایران باشد (مثال: 09123456789).';
      setPhoneError(errText);
      phoneInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      phoneInputRef.current?.focus();
      return;
    }

    const items = products.map(p => ({
      product_id: p.id,
      quantity: requestItems[p.id] || 0
    }));

    const hasAnyProduct = items.some(item => item.quantity > 0);
    if (!hasAnyProduct) {
      setMessage('❌ شما هیچ محصولی انتخاب نکرده‌اید.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await axios.put(`/api/requests/${nationalCode}`, {
          current_phone_number: verifiedPhone,
          phone_number: phoneNumber,
          items
        });
        setShowEditSuccessModal(true);
      } else {
        await axios.post('/api/requests', {
          national_code: nationalCode,
          phone_number: phoneNumber,
          items
        });
        setMessage('✅ درخواست شما با موفقیت ثبت شد!');
        setMessageType('success');
        setSubmitted(true);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setNotFoundModal(true);
      } else if (error.response?.status === 400) {
        setMessage(`❌ ${error.response?.data?.detail || 'این کدملی قبلاً ثبت شده است.'}`);
        setMessageType('error');
      } else if (error.response?.status === 403) {
        setMessage(`❌ ${error.response?.data?.detail || 'امکان ویرایش این درخواست وجود ندارد.'}`);
        setMessageType('error');
      } else if (error.response?.status === 422) {
        setMessage(`❌ ${getValidationErrorMessage(error)}`);
        setMessageType('error');
      } else {
        setMessage('❌ خطا در ثبت درخواست. لطفاً دوباره تلاش کنید.');
        setMessageType('error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!window.confirm('آیا از حذف درخواست خود مطمئن هستید؟')) return;

    try {
      await axios.delete(`/api/requests/${nationalCode}`, { params: { phone_number: verifiedPhone } });
      setMessage('✅ درخواست شما با موفقیت حذف شد.');
      setMessageType('success');
      setIsEditing(false);
      setSubmitted(true);
    } catch (error: any) {
      setMessage(`❌ ${error.response?.data?.detail || 'خطا در حذف درخواست. لطفاً دوباره تلاش کنید.'}`);
      setMessageType('error');
    }
  };

  const totalPrice = products.reduce(
    (sum, p) => sum + (p.price || 0) * (p.package_size || 1) * (requestItems[p.id] || 0),
    0
  );

  const hasSelectedProduct = products.length > 0 && products.some(p => (requestItems[p.id] || 0) > 0);

  return (
    <div className="min-h-screen bg-gray-100 py-6 sm:py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-blue-600 mb-6">
          {isEditing ? '✏️ ویرایش درخواست' : '📝 فرم ثبت درخواست'}
        </h1>

        {deadline && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded mb-4 text-center text-sm sm:text-base">
            ⏰ آخرین مهلت ویرایش: {new Date(deadline).toLocaleDateString('fa-IR')}
          </div>
        )}

        {message && (
          <div className={`p-3 rounded-md mb-4 text-sm sm:text-base ${
            messageType === 'success' ? 'bg-green-50 text-green-700' :
            messageType === 'error' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {message}
          </div>
        )}

        {!submitted || isEditing ? (
          <>
            {/* مرحله ۱: جست‌وجوی کد ملی */}
            {step === 'lookup' && (
              <div className="max-w-sm mx-auto text-center py-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  کد ملی خود را وارد کنید
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={nationalCode}
                  onChange={(e) => setNationalCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  placeholder="۱۰ رقم"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
                >
                  {searching ? 'در حال جست‌وجو...' : '🔍 جست‌وجو'}
                </button>
              </div>
            )}

            {/* مرحله ۲: تأیید هویت برای ویرایش درخواست قبلی */}
            {step === 'verify' && (
              <div className="max-w-sm mx-auto text-center py-6">
                <p className="mb-4 text-sm text-gray-600">
                  برای این کد ملی قبلاً درخواستی ثبت شده است. برای ویرایش، لطفاً شماره تلفنی که قبلاً با آن ثبت‌نام کرده‌اید را وارد کنید.
                </p>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={verifyPhone}
                  onChange={(e) => setVerifyPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))}
                  placeholder="مثال: 09123456789"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyPhone(); }}
                />
                {verifyError && <p className="text-red-600 text-sm mt-2">{verifyError}</p>}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleVerifyPhone}
                    disabled={verifying}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
                  >
                    {verifying ? 'در حال بررسی...' : 'تأیید'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 text-sm sm:text-base"
                  >
                    بازگشت
                  </button>
                </div>
              </div>
            )}

            {/* مرحله ۳: فرم اصلی */}
            {step === 'form' && personInfo && (
              <form onSubmit={handleSubmit}>
                {adminDescription && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">📌 توضیحات مدیر:</span> {adminDescription}
                    </p>
                  </div>
                )}

                {/* اطلاعات هویتی - فقط‌خواندنی، از دیتابیس افراد مجاز واکشی شده */}
                <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-sm sm:text-base font-semibold text-gray-700">مشخصات شما</h2>
                    <button type="button" onClick={handleReset} className="text-xs text-blue-600 hover:underline">
                      تغییر کد ملی
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">کد ملی: </span>
                      <span className="font-medium">{nationalCode}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">کد پرسنلی: </span>
                      <span className="font-medium">{personInfo.personnel_code || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">نام و نام خانوادگی: </span>
                      <span className="font-medium">{personInfo.first_name} {personInfo.last_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">محل خدمت: </span>
                      <span className="font-medium">{personInfo.service_location || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">وضعیت خدمت: </span>
                      <span className="font-medium">{personInfo.service_status || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    شماره تماس (موبایل) *
                  </label>
                  {phoneError && (
                    <p className="text-red-600 text-sm mb-1">{phoneError}</p>
                  )}
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    required
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                      phoneError
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 11));
                      if (phoneError) setPhoneError('');
                    }}
                    placeholder="مثال: 09123456789"
                  />
                </div>

                <div className="mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">محصولات</h2>
                  {products.map((product) => {
                    const unitName = product.unit_name || 'عدد';
                    const packageSize = product.package_size || 1;
                    const pricePerPackage = Math.round((product.price || 0) * packageSize);
                    const qty = requestItems[product.id] || 0;
                    const lineTotal = Math.round(pricePerPackage * qty);
                    return (
                      <div
                        key={product.id}
                        className="flex flex-col gap-1 p-3 border rounded-md mb-2"
                      >
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <span className="font-medium text-sm sm:text-base break-words">
                            {product.name}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                            ({product.type})
                          </span>
                          <span className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">
                            حداکثر: {product.max_quantity} بسته
                          </span>
                        </div>

                        {product.price > 0 && (
                          <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-md px-2 py-1.5 leading-6">
                            هر بسته = <span className="font-medium">{packageSize.toLocaleString('fa-IR')} {unitName}</span>
                            {' | '}قیمت هر {unitName}: <span className="font-medium">{product.price.toLocaleString('fa-IR')} ریال</span>
                            {' | '}
                            <span className="text-green-700 font-medium">
                              قیمت هر بسته: {pricePerPackage.toLocaleString('fa-IR')} ریال
                            </span>
                          </div>
                        )}

                        {product.description && (
                          <p className="text-xs text-gray-500 break-words line-clamp-3">
                            {product.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-1">
                          {qty > 0 && product.price > 0 ? (
                            <span className="text-xs sm:text-sm text-blue-700 font-medium">
                              جمع این محصول: {lineTotal.toLocaleString('fa-IR')} ریال
                            </span>
                          ) : <span />}
                          <div className="flex items-center">
                            <label className="text-sm text-gray-600 ml-2">تعداد بسته:</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                              value={qty}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
                                const val = parseInt(digitsOnly) || 0;
                                setRequestItems({
                                  ...requestItems,
                                  [product.id]: Math.min(val, product.max_quantity),
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-md p-3 mb-6">
                  <span className="text-sm sm:text-base font-semibold text-gray-700">مجموع کالاها</span>
                  <span className="text-sm sm:text-base font-bold text-blue-700">
                    {Math.round(totalPrice).toLocaleString('fa-IR')} ریال
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={loading || !hasSelectedProduct}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {loading ? 'در حال ارسال...' : isEditing ? 'ویرایش درخواست' : 'ثبت درخواست'}
                  </button>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleDeleteRequest}
                      className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition text-sm sm:text-base"
                    >
                      🗑️ حذف درخواست
                    </button>
                  )}
                </div>
                {!hasSelectedProduct && (
                  <p className="text-xs text-amber-600 mt-2 text-center sm:text-right">
                    {products.length === 0
                      ? 'در حال حاضر محصولی برای ثبت درخواست وجود ندارد.'
                      : 'برای فعال شدن دکمه‌ی ثبت، حداقل یک محصول را انتخاب کنید.'}
                  </p>
                )}
              </form>
            )}
          </>
        ) : (
          <div className="text-center p-6">
            <p className="text-lg sm:text-xl text-gray-600">✅ عملیات با موفقیت انجام شد.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700"
            >
              ثبت درخواست جدید
            </button>
          </div>
        )}
      </div>

      {/* مودال خطا: کد ملی در سامانه ثبت نشده است */}
      {notFoundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
            <h3 className="text-xl font-semibold mb-3 text-red-600">خطا در ثبت</h3>
            <p className="mb-5 text-sm text-gray-700">
              کد ملی شما در سامانه ثبت نشده است، برای حل مشکل به امور مالی اداره مراجعه نمایید.
            </p>
            <button
              onClick={() => { setNotFoundModal(false); setNationalCode(''); }}
              className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 text-sm sm:text-base"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}

      {/* مودال موفقیت: ویرایش درخواست انجام شد */}
      {showEditSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
            <h3 className="text-xl font-semibold mb-3 text-green-600">✅ ویرایش موفق</h3>
            <p className="mb-5 text-sm text-gray-700">
              ویرایش محصولات با موفقیت انجام شد.
            </p>
            <button
              onClick={() => { setShowEditSuccessModal(false); handleReset(); }}
              className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 text-sm sm:text-base"
            >
              باشه
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicForm;
