import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'products' | 'locations' | 'people' | 'settings'>('requests');
  const [products, setProducts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', type: '', max_quantity: 1, price: 0, unit_name: 'عدد', package_size: 1, description: '' });
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ name: '', type: '', max_quantity: 1, price: 0, unit_name: 'عدد', package_size: 1, description: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [serviceLocations, setServiceLocations] = useState<any[]>([]);
  const [newServiceLocation, setNewServiceLocation] = useState({ name: '' });
  const [editingServiceLocation, setEditingServiceLocation] = useState<any>(null);
  const [editServiceLocationData, setEditServiceLocationData] = useState({ name: '' });
  const [showEditServiceLocationModal, setShowEditServiceLocationModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // ====== افراد مجاز (← بخش جدید) ======
  const emptyPersonForm = { national_code: '', personnel_code: '', first_name: '', last_name: '', service_location: '', service_status: '' };
  const [authorizedPersons, setAuthorizedPersons] = useState<any[]>([]);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [newPerson, setNewPerson] = useState(emptyPersonForm);
  const [editingPerson, setEditingPerson] = useState<any>(null);
  const [editPersonData, setEditPersonData] = useState(emptyPersonForm);
  const [showEditPersonModal, setShowEditPersonModal] = useState(false);

  const token = localStorage.getItem('admin_token');

  const fetchData = async () => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [productsRes, requestsRes, deadlineRes, serviceLocationsRes, peopleRes] = await Promise.allSettled([
        axios.get('/api/products/public'),
        axios.get('/api/admin/requests', { headers }),
        axios.get('/api/settings/deadline'),
        axios.get('/api/service-locations/public'),
        axios.get('/api/authorized-persons', { headers })
      ]);

      if (productsRes.status === 'fulfilled') {
        setProducts(productsRes.value.data);
      } else {
        console.error('خطا در دریافت محصولات:', productsRes.reason);
      }

      if (requestsRes.status === 'fulfilled') {
        setRequests(requestsRes.value.data);
      } else {
        console.error('خطا در دریافت درخواست‌ها:', requestsRes.reason);
        if (requestsRes.reason?.response?.status === 401) {
          navigate('/admin/login');
        }
      }

      if (deadlineRes.status === 'fulfilled') {
        setDeadline(deadlineRes.value.data.edit_deadline || '');
      } else {
        console.error('خطا در دریافت مهلت ویرایش:', deadlineRes.reason);
      }

      if (serviceLocationsRes.status === 'fulfilled') {
        setServiceLocations(serviceLocationsRes.value.data);
      } else {
        console.error('خطا در دریافت محل‌های خدمت:', serviceLocationsRes.reason);
      }

      if (peopleRes.status === 'fulfilled') {
        setAuthorizedPersons(peopleRes.value.data);
      } else {
        console.error('خطا در دریافت افراد مجاز:', peopleRes.reason);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post('/api/products', newProduct, { headers });
      setNewProduct({ name: '', type: '', max_quantity: 1, price: 0, unit_name: 'عدد', package_size: 1, description: '' });
      setMessage('✅ محصول با موفقیت اضافه شد');
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در افزودن محصول');
      console.error(error);
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      type: product.type,
      max_quantity: product.max_quantity,
      price: product.price || 0,
      unit_name: product.unit_name || 'عدد',
      package_size: product.package_size || 1,
      description: product.description || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/products/${editingProduct.id}`, editFormData, { headers });
      setMessage('✅ محصول با موفقیت ویرایش شد');
      setShowEditModal(false);
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در ویرایش محصول');
      console.error(error);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('آیا از حذف این محصول مطمئن هستید؟')) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/products/${id}`, { headers });
      setMessage('✅ محصول با موفقیت حذف شد');
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در حذف محصول');
      console.error(error);
    }
  };

  const handleAddServiceLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post('/api/service-locations', newServiceLocation, { headers });
      setNewServiceLocation({ name: '' });
      setMessage('✅ محل خدمت با موفقیت اضافه شد');
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در افزودن محل خدمت');
      console.error(error);
    }
  };

  const handleEditServiceLocation = (location: any) => {
    setEditingServiceLocation(location);
    setEditServiceLocationData({ name: location.name });
    setShowEditServiceLocationModal(true);
  };

  const handleUpdateServiceLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/service-locations/${editingServiceLocation.id}`, editServiceLocationData, { headers });
      setMessage('✅ محل خدمت با موفقیت ویرایش شد');
      setShowEditServiceLocationModal(false);
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در ویرایش محل خدمت');
      console.error(error);
    }
  };

  const handleDeleteServiceLocation = async (id: number) => {
    if (!window.confirm('آیا از حذف این محل خدمت مطمئن هستید؟')) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/service-locations/${id}`, { headers });
      setMessage('✅ محل خدمت با موفقیت حذف شد');
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در حذف محل خدمت');
      console.error(error);
    }
  };

  // ====== افراد مجاز (← بخش جدید) ======
  const handleUploadPersons = async () => {
    if (!uploadFile) {
      setMessage('❌ لطفاً یک فایل اکسل انتخاب کنید');
      return;
    }
    setUploading(true);
    setUploadResult(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await axios.post('/api/authorized-persons/upload', formData, { headers });
      setUploadResult(res.data);
      setMessage(`✅ آپلود انجام شد: ${res.data.created} مورد جدید، ${res.data.updated} مورد به‌روزرسانی شد`);
      setUploadFile(null);
      fetchData();
    } catch (error: any) {
      setMessage(`❌ ${error.response?.data?.detail || 'خطا در آپلود فایل'}`);
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/authorized-persons/template', { headers, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'authorized_persons_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      setMessage('❌ خطا در دانلود فایل نمونه');
      console.error(error);
    }
  };

  const handleExportPersonsCSV = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/authorized-persons/export/csv', { headers, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'authorized_persons.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage('✅ خروجی CSV با موفقیت دانلود شد');
    } catch (error: any) {
      setMessage('❌ خطا در دانلود CSV');
      console.error(error);
    }
  };

  const handleExportPersonsExcel = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/authorized-persons/export/excel', { headers, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'authorized_persons.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage('✅ خروجی Excel با موفقیت دانلود شد');
    } catch (error: any) {
      setMessage('❌ خطا در دانلود Excel');
      console.error(error);
    }
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post('/api/authorized-persons', newPerson, { headers });
      setNewPerson(emptyPersonForm);
      setMessage('✅ فرد با موفقیت اضافه شد');
      fetchData();
    } catch (error: any) {
      setMessage(`❌ ${error.response?.data?.detail || 'خطا در افزودن فرد'}`);
      console.error(error);
    }
  };

  const handleEditPerson = (person: any) => {
    setEditingPerson(person);
    setEditPersonData({
      national_code: person.national_code,
      personnel_code: person.personnel_code || '',
      first_name: person.first_name,
      last_name: person.last_name,
      service_location: person.service_location || '',
      service_status: person.service_status || ''
    });
    setShowEditPersonModal(true);
  };

  const handleUpdatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/authorized-persons/${editingPerson.id}`, editPersonData, { headers });
      setMessage('✅ اطلاعات فرد با موفقیت ویرایش شد');
      setShowEditPersonModal(false);
      fetchData();
    } catch (error: any) {
      setMessage(`❌ ${error.response?.data?.detail || 'خطا در ویرایش'}`);
      console.error(error);
    }
  };

  const handleDeletePerson = async (id: number) => {
    if (!window.confirm('آیا از حذف این فرد از لیست افراد مجاز مطمئن هستید؟')) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/authorized-persons/${id}`, { headers });
      setMessage('✅ فرد با موفقیت حذف شد');
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در حذف');
      console.error(error);
    }
  };

  const handleResetData = async () => {
    const step1 = window.confirm(
      'با این کار، کل «لیست افراد مجاز» و همه‌ی «درخواست‌های ثبت‌شده» برای همیشه پاک می‌شوند (محصولات و تنظیمات دست‌نخورده باقی می‌مانند).\n\nآیا مطمئن هستید؟'
    );
    if (!step1) return;
    const step2 = window.confirm('این عملیات غیرقابل بازگشت است. برای تأیید نهایی دوباره تأیید کنید.');
    if (!step2) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.delete('/api/admin/reset-data', { headers });
      setMessage(`✅ پاک‌سازی انجام شد: ${res.data.deleted_persons} فرد و ${res.data.deleted_requests} درخواست حذف شد`);
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در پاک‌سازی دیتابیس');
      console.error(error);
    }
  };

  const filteredPersons = authorizedPersons.filter((p) => {
    if (!peopleSearch.trim()) return true;
    const q = peopleSearch.trim().toLowerCase();
    return (
      p.national_code?.toLowerCase().includes(q) ||
      p.personnel_code?.toLowerCase().includes(q) ||
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q)
    );
  });

  const handleToggleEdit = async (requestId: number, currentStatus: boolean) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/admin/requests/${requestId}/toggle-edit?is_editable=${!currentStatus}`, {}, { headers });
      setMessage('✅ وضعیت ویرایش به‌روزرسانی شد');
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در به‌روزرسانی وضعیت');
      console.error(error);
    }
  };

  const handleDeleteRequest = async (id: number) => {
    if (!window.confirm('آیا از حذف این درخواست مطمئن هستید؟')) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/admin/requests/${id}`, { headers });
      setMessage('✅ درخواست با موفقیت حذف شد');
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در حذف درخواست');
      console.error(error);
    }
  };

  const handleUpdateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put('/api/settings/deadline', { edit_deadline: deadline }, { headers });
      setMessage('✅ تاریخ ویرایش با موفقیت به‌روزرسانی شد');
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در به‌روزرسانی تاریخ');
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setDescriptionText(request.admin_description || '');
    setEditingDescription(false);
    setShowDetailModal(true);
  };

  const handleSaveDescription = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `/api/admin/requests/${selectedRequest.id}/description?description=${encodeURIComponent(descriptionText)}`,
        {},
        { headers }
      );
      setMessage('✅ توضیحات با موفقیت به‌روزرسانی شد');
      setEditingDescription(false);
      fetchData();
      setSelectedRequest({ ...selectedRequest, admin_description: descriptionText });
    } catch (error: any) {
      setMessage('❌ خطا در به‌روزرسانی توضیحات');
      console.error(error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/admin/requests/export/csv', {
        headers,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'requests.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage('✅ خروجی CSV با موفقیت دانلود شد');
    } catch (error: any) {
      setMessage('❌ خطا در دانلود CSV');
      console.error(error);
    }
  };

  const handleExportExcel = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/admin/requests/export/excel', {
        headers,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'requests.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage('✅ خروجی Excel با موفقیت دانلود شد');
    } catch (error: any) {
      setMessage('❌ خطا در دانلود Excel');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">پنل مدیریت</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 text-sm sm:text-base"
            >
              خروج
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-md mb-4 text-sm sm:text-base ${
            message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* نوار تب‌ها */}
        <div className="flex flex-wrap gap-1 mb-6 bg-white rounded-lg shadow p-1.5 overflow-x-auto">
          {[
            { key: 'requests', label: '📋 درخواست‌ها' },
            { key: 'people', label: '👥 افزودن اسامی افراد' },
            { key: 'products', label: '📦 محصولات' },
            { key: 'locations', label: '📍 محل‌های خدمت' },
            { key: 'settings', label: '⚙️ تنظیمات' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base whitespace-nowrap transition ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* مدیریت محصولات */}
        {activeTab === 'products' && (
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">مدیریت محصولات</h2>
          
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <input
              type="text"
              placeholder="نام محصول"
              required
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={newProduct.name}
              onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
            />
            <input
              type="text"
              placeholder="نوع محصول"
              required
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={newProduct.type}
              onChange={(e) => setNewProduct({...newProduct, type: e.target.value})}
            />
            <input
              type="number"
              placeholder="حداکثر تعداد بسته"
              required
              min="1"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={newProduct.max_quantity}
              onChange={(e) => setNewProduct({...newProduct, max_quantity: parseInt(e.target.value) || 1})}
            />
            <input
              type="text"
              placeholder="واحد (کیلوگرم، عدد، لیتر...)"
              required
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={newProduct.unit_name}
              onChange={(e) => setNewProduct({...newProduct, unit_name: e.target.value})}
            />
            <input
              type="number"
              placeholder="مقدار هر بسته (مثلاً 2)"
              required
              min="0.01"
              step="0.01"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={newProduct.package_size}
              onChange={(e) => setNewProduct({...newProduct, package_size: parseFloat(e.target.value) || 1})}
            />
            <input
              type="number"
              placeholder="قیمت به ازای هر واحد (ریال)"
              required
              min="0"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={newProduct.price}
              onChange={(e) => setNewProduct({...newProduct, price: parseInt(e.target.value) || 0})}
            />
            <input
              type="text"
              placeholder="توضیحات (اختیاری)"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={newProduct.description}
              onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
            />
            <button type="submit" className="bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 col-span-full text-sm sm:text-base">
              افزودن محصول
            </button>
          </form>
          <p className="text-xs text-gray-500 mb-4">
            مثال: برای «گوشت قرمز» با بسته‌بندی ۲ کیلوگرمی، واحد را «کیلوگرم»، مقدار هر بسته را ۲ و قیمت را قیمتِ هر کیلوگرم وارد کنید.
          </p>

          <div className="overflow-x-auto -mx-4 sm:-mx-0">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden shadow sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">حداکثر تعداد بسته</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">بسته‌بندی</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">قیمت هر واحد (ریال)</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">قیمت هر بسته (ریال)</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">توضیحات</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="px-3 py-2 text-sm break-words max-w-[100px] sm:max-w-[150px]">
                          {product.name}
                        </td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">
                          {product.type}
                        </td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">
                          {product.max_quantity}
                        </td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">
                          {(product.package_size || 1)} {product.unit_name || 'عدد'} / بسته
                        </td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">
                          {(product.price || 0).toLocaleString('fa-IR')}
                        </td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">
                          {Math.round((product.price || 0) * (product.package_size || 1)).toLocaleString('fa-IR')}
                        </td>
                        <td className="px-3 py-2 text-sm break-words max-w-[80px] sm:max-w-[120px] truncate">
                          {product.description || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 text-xs sm:text-sm ml-1"
                          >
                            ویرایش
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 text-xs sm:text-sm"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* مدیریت محل‌های خدمت */}
        {activeTab === 'locations' && (
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">مدیریت محل‌های خدمت</h2>

          <form onSubmit={handleAddServiceLocation} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <input
              type="text"
              placeholder="نام محل خدمت"
              required
              className="px-3 py-2 border border-gray-300 rounded-md text-sm sm:col-span-2"
              value={newServiceLocation.name}
              onChange={(e) => setNewServiceLocation({ name: e.target.value })}
            />
            <button type="submit" className="bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base">
              افزودن محل خدمت
            </button>
          </form>

          <div className="overflow-x-auto -mx-4 sm:-mx-0">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden shadow sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {serviceLocations.map((location) => (
                      <tr key={location.id}>
                        <td className="px-3 py-2 text-sm break-words max-w-[150px] sm:max-w-[250px]">
                          {location.name}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            onClick={() => handleEditServiceLocation(location)}
                            className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 text-xs sm:text-sm ml-1"
                          >
                            ویرایش
                          </button>
                          <button
                            onClick={() => handleDeleteServiceLocation(location.id)}
                            className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 text-xs sm:text-sm"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* افزودن اسامی افراد (← بخش جدید) */}
        {activeTab === 'people' && (
        <div className="space-y-6 mb-6">
          {/* آپلود فایل اکسل */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">آپلود فایل افراد مجاز</h2>
              <button
                onClick={handleResetData}
                className="bg-red-50 text-red-700 border border-red-200 py-2 px-3 rounded-md hover:bg-red-100 text-xs sm:text-sm whitespace-nowrap"
              >
                🗑️ پاک‌سازی کامل افراد مجاز و درخواست‌ها
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              فایل اکسل باید شامل ستون‌های «کدملی»، «کدپرسنلی»، «نام»، «نام خانوادگی»، «محل خدمت» و «وضعیت خدمت» باشد.
              اگر کدملی از قبل در سیستم وجود داشته باشد، اطلاعات آن با مقادیر جدید جایگزین می‌شود.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-3">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                className="text-sm block w-full sm:w-auto file:ml-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm hover:file:bg-blue-100"
              />
              <button
                onClick={handleUploadPersons}
                disabled={uploading || !uploadFile}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base whitespace-nowrap"
              >
                {uploading ? 'در حال آپلود...' : '⬆️ آپلود و به‌روزرسانی'}
              </button>
              <button
                onClick={handleDownloadTemplate}
                className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 text-sm sm:text-base whitespace-nowrap"
              >
                📄 دانلود فایل نمونه
              </button>
            </div>

            {uploadResult && (
              <div className="mt-3 p-3 rounded-md bg-blue-50 text-sm">
                <p className="text-blue-800">
                  از {uploadResult.total_rows} ردیف پردازش‌شده: <strong>{uploadResult.created}</strong> مورد جدید،{' '}
                  <strong>{uploadResult.updated}</strong> مورد به‌روزرسانی شد.
                </p>
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-red-700">
                      ⚠️ {uploadResult.errors.length} ردیف نادیده گرفته شد (برای مشاهده کلیک کنید)
                    </summary>
                    <ul className="mt-2 list-disc pr-5 text-red-600 space-y-1">
                      {uploadResult.errors.map((err: string, idx: number) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>

          {/* افزودن دستی یک نفر */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">افزودن دستی یک نفر</h2>
            <form onSubmit={handleAddPerson} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="کدملی"
                required
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={newPerson.national_code}
                onChange={(e) => setNewPerson({ ...newPerson, national_code: e.target.value })}
              />
              <input
                type="text"
                placeholder="کدپرسنلی"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={newPerson.personnel_code}
                onChange={(e) => setNewPerson({ ...newPerson, personnel_code: e.target.value })}
              />
              <input
                type="text"
                placeholder="نام"
                required
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={newPerson.first_name}
                onChange={(e) => setNewPerson({ ...newPerson, first_name: e.target.value })}
              />
              <input
                type="text"
                placeholder="نام خانوادگی"
                required
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={newPerson.last_name}
                onChange={(e) => setNewPerson({ ...newPerson, last_name: e.target.value })}
              />
              <input
                type="text"
                placeholder="محل خدمت"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={newPerson.service_location}
                onChange={(e) => setNewPerson({ ...newPerson, service_location: e.target.value })}
              />
              <input
                type="text"
                placeholder="وضعیت خدمت"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={newPerson.service_status}
                onChange={(e) => setNewPerson({ ...newPerson, service_status: e.target.value })}
              />
              <button type="submit" className="bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 col-span-full lg:col-span-1 text-sm sm:text-base">
                افزودن
              </button>
            </form>
          </div>

          {/* لیست افراد مجاز */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                لیست افراد مجاز ({authorizedPersons.length} نفر)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleExportPersonsCSV}
                  className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm"
                >
                  📥 CSV
                </button>
                <button
                  onClick={handleExportPersonsExcel}
                  className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 text-sm"
                >
                  📊 Excel
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder="جست‌وجو بر اساس کدملی، کدپرسنلی، نام یا نام خانوادگی..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-4"
              value={peopleSearch}
              onChange={(e) => setPeopleSearch(e.target.value)}
            />

            <div className="overflow-x-auto -mx-4 sm:-mx-0">
              <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden shadow sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کدملی</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کدپرسنلی</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام خانوادگی</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">محل خدمت</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعیت خدمت</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPersons.map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 text-sm whitespace-nowrap">{p.national_code}</td>
                          <td className="px-3 py-2 text-sm whitespace-nowrap">{p.personnel_code || '-'}</td>
                          <td className="px-3 py-2 text-sm whitespace-nowrap">{p.first_name}</td>
                          <td className="px-3 py-2 text-sm whitespace-nowrap">{p.last_name}</td>
                          <td className="px-3 py-2 text-sm break-words max-w-[120px]">{p.service_location || '-'}</td>
                          <td className="px-3 py-2 text-sm whitespace-nowrap">{p.service_status || '-'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <button
                              onClick={() => handleEditPerson(p)}
                              className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 text-xs sm:text-sm ml-1"
                            >
                              ویرایش
                            </button>
                            <button
                              onClick={() => handleDeletePerson(p.id)}
                              className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 text-xs sm:text-sm"
                            >
                              حذف
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* مدیریت درخواست‌ها */}
        {activeTab === 'requests' && (
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">مدیریت درخواست‌ها</h2>
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm"
              >
                📥 CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 text-sm"
              >
                📊 Excel
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto -mx-4 sm:-mx-0">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden shadow sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کدملی</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کد پرسنلی</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعیت خدمت</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">محل خدمت</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاریخ ثبت</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">قابل ویرایش</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {requests.map((req) => (
                      <tr key={req.id}>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">{req.national_code || '-'}</td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">{req.employee_code}</td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">{req.full_name}</td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">{req.employment_status}</td>
                        <td className="px-3 py-2 text-sm break-words max-w-[120px]">{req.service_location_text || req.service_location?.name || '-'}</td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">{new Date(req.submitted_at).toLocaleDateString('fa-IR')}</td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">
                          {req.is_editable ? '✅ فعال' : '❌ غیرفعال'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            onClick={() => handleViewDetails(req)}
                            className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 text-xs sm:text-sm ml-1"
                          >
                            جزئیات
                          </button>
                          <button
                            onClick={() => handleToggleEdit(req.id, req.is_editable)}
                            className={`px-2 py-1 rounded-md text-xs sm:text-sm mr-1 ${
                              req.is_editable 
                                ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            {req.is_editable ? 'غیرفعال' : 'فعال'}
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 text-xs sm:text-sm"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* تنظیمات تاریخ ویرایش */}
        {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">تنظیمات تاریخ ویرایش</h2>
          <form onSubmit={handleUpdateDeadline} className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تاریخ و زمان آخرین فرصت ویرایش
              </label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={deadline || ''}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base w-full sm:w-auto">
              ذخیره
            </button>
          </form>
        </div>
        )}
      </div>

      {/* مودال ویرایش محصول */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">ویرایش محصول</h3>
            <form onSubmit={handleUpdateProduct}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">نام محصول</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع محصول</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editFormData.type}
                  onChange={(e) => setEditFormData({...editFormData, type: e.target.value})}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">حداکثر تعداد بسته</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editFormData.max_quantity}
                  onChange={(e) => setEditFormData({...editFormData, max_quantity: parseInt(e.target.value) || 1})}
                />
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">واحد</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={editFormData.unit_name}
                    onChange={(e) => setEditFormData({...editFormData, unit_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">مقدار هر بسته</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={editFormData.package_size}
                    onChange={(e) => setEditFormData({...editFormData, package_size: parseFloat(e.target.value) || 1})}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">قیمت به ازای هر واحد (ریال)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editFormData.price}
                  onChange={(e) => setEditFormData({...editFormData, price: parseInt(e.target.value) || 0})}
                />
                <p className="text-xs text-gray-500 mt-1">
                  قیمت این بسته: {Math.round((editFormData.price || 0) * (editFormData.package_size || 1)).toLocaleString('fa-IR')} ریال
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base"
                >
                  ذخیره تغییرات
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 text-sm sm:text-base"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال ویرایش محل خدمت */}
      {showEditServiceLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">ویرایش محل خدمت</h3>
            <form onSubmit={handleUpdateServiceLocation}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">نام محل خدمت</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editServiceLocationData.name}
                  onChange={(e) => setEditServiceLocationData({ name: e.target.value })}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base"
                >
                  ذخیره تغییرات
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditServiceLocationModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 text-sm sm:text-base"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال ویرایش افراد مجاز */}
      {showEditPersonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">ویرایش اطلاعات فرد</h3>
            <form onSubmit={handleUpdatePerson}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">کدملی</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editPersonData.national_code}
                  onChange={(e) => setEditPersonData({ ...editPersonData, national_code: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">کدپرسنلی</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editPersonData.personnel_code}
                  onChange={(e) => setEditPersonData({ ...editPersonData, personnel_code: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">نام</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editPersonData.first_name}
                  onChange={(e) => setEditPersonData({ ...editPersonData, first_name: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">نام خانوادگی</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editPersonData.last_name}
                  onChange={(e) => setEditPersonData({ ...editPersonData, last_name: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">محل خدمت</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editPersonData.service_location}
                  onChange={(e) => setEditPersonData({ ...editPersonData, service_location: e.target.value })}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">وضعیت خدمت</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editPersonData.service_status}
                  onChange={(e) => setEditPersonData({ ...editPersonData, service_status: e.target.value })}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base"
                >
                  ذخیره تغییرات
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditPersonModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 text-sm sm:text-base"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال جزئیات درخواست */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">جزئیات درخواست</h3>
            <div className="mb-4 text-sm sm:text-base">
              <p><strong>کدملی:</strong> {selectedRequest.national_code || '-'}</p>
              <p><strong>کد پرسنلی:</strong> {selectedRequest.employee_code}</p>
              <p><strong>نام و نام خانوادگی:</strong> {selectedRequest.full_name}</p>
              <p><strong>شماره تماس:</strong> {selectedRequest.phone_number || '-'}</p>
              <p><strong>وضعیت خدمت:</strong> {selectedRequest.employment_status}</p>
              <p><strong>محل خدمت:</strong> {selectedRequest.service_location_text || selectedRequest.service_location?.name || '-'}</p>
              <p><strong>تاریخ ثبت:</strong> {new Date(selectedRequest.submitted_at).toLocaleString('fa-IR')}</p>
              <p><strong>وضعیت ویرایش:</strong> {selectedRequest.is_editable ? 'فعال' : 'غیرفعال'}</p>
            </div>
            
            <div className="mb-4 border-t pt-4">
              <h4 className="font-semibold mb-2 text-sm sm:text-base">📌 توضیحات مدیر:</h4>
              {editingDescription ? (
                <div>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={3}
                    value={descriptionText}
                    onChange={(e) => setDescriptionText(e.target.value)}
                  />
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <button
                      onClick={handleSaveDescription}
                      className="bg-blue-600 text-white px-4 py-1 rounded-md hover:bg-blue-700 text-sm"
                    >
                      ذخیره
                    </button>
                    <button
                      onClick={() => {
                        setEditingDescription(false);
                        setDescriptionText(selectedRequest.admin_description || '');
                      }}
                      className="bg-gray-300 text-gray-700 px-4 py-1 rounded-md hover:bg-gray-400 text-sm"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 bg-gray-50 p-2 rounded-md mb-2 text-sm">
                    {selectedRequest.admin_description || 'هنوز توضیحی ثبت نشده است.'}
                  </p>
                  <button
                    onClick={() => setEditingDescription(true)}
                    className="bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600 text-sm"
                  >
                    ✏️ ویرایش توضیحات
                  </button>
                </div>
              )}
            </div>

            <h4 className="font-semibold mb-2 text-sm sm:text-base">محصولات درخواستی:</h4>
            {selectedRequest.items && selectedRequest.items.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:-mx-0">
                <table className="min-w-full bg-white border mb-4">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">نام محصول</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">نوع</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">تعداد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRequest.items.filter((item: any) => item.quantity > 0).map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-sm break-words max-w-[100px]">{item.product?.name || 'محصول حذف شده'}</td>
                        <td className="px-3 py-2 text-sm">{item.product?.type || '-'}</td>
                        <td className="px-3 py-2 text-sm">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">هیچ محصولی انتخاب نشده است</p>
            )}
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 text-sm sm:text-base"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;