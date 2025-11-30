// src/Pages/auth/HospitalRegistration.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { hospitalService } from '../../services/hospitalService';
import { toast } from 'react-hot-toast';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Send
} from 'lucide-react';

const HospitalRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactNumber: '',
    adminEmail: '',
    licenseNumber: ''
  });

  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) errors.name = 'Hospital name is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.contactNumber.trim()) errors.contactNumber = 'Contact number is required';
    if (!formData.adminEmail.trim()) errors.adminEmail = 'Email is required';
    if (!formData.licenseNumber.trim()) errors.licenseNumber = 'License number is required';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.adminEmail && !emailRegex.test(formData.adminEmail)) {
      errors.adminEmail = 'Please enter a valid email address';
    }

    if (formData.contactNumber && formData.contactNumber.length < 10) {
      errors.contactNumber = 'Contact number must be at least 10 digits';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      name: true,
      address: true,
      contactNumber: true,
      adminEmail: true,
      licenseNumber: true
    });

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach(error => toast.error(error));
      return;
    }

    setLoading(true);

    try {
      const result = await hospitalService.registerHospital(formData);
      
      if (result.success) {
        toast.success(
          'Hospital registered successfully! Check your email for verification link.',
          {
            duration: 6000,
            icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
          }
        );
        
        setFormData({
          name: '',
          address: '',
          contactNumber: '',
          adminEmail: '',
          licenseNumber: ''
        });
        
        setTimeout(() => {
          navigate('/login', {
            state: {
              message: 'Hospital registered successfully! Check your email for verification link.'
            }
          });
        }, 2000);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const errors = validateForm();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm text-cyan-600 hover:text-cyan-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
          
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-3">
            Hospital Registration
          </h1>
          <p className="text-gray-600 text-lg max-w-md mx-auto">
            Join our network and start managing your hospital efficiently
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/60 p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Hospital Name */}
            <div className="group">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <Building2 className="w-4 h-4 mr-2 text-cyan-600" />
                Hospital Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-4 pl-12 border-2 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 group-hover:border-cyan-300 ${
                    touched.name && errors.name 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                  placeholder="Enter hospital name"
                />
                <Building2 className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  touched.name && errors.name ? 'text-red-400' : 'text-gray-400'
                }`} />
              </div>
              {touched.name && errors.name && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="group">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <MapPin className="w-4 h-4 mr-2 text-cyan-600" />
                Full Address *
              </label>
              <div className="relative">
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  rows="3"
                  className={`w-full px-4 py-4 pl-12 border-2 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 resize-none group-hover:border-cyan-300 ${
                    touched.address && errors.address 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                  placeholder="Enter complete hospital address"
                />
                <MapPin className={`absolute left-4 top-4 w-5 h-5 ${
                  touched.address && errors.address ? 'text-red-400' : 'text-gray-400'
                }`} />
              </div>
              {touched.address && errors.address && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.address}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Number */}
              <div className="group">
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                  <Phone className="w-4 h-4 mr-2 text-cyan-600" />
                  Contact Number *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-4 pl-12 border-2 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 group-hover:border-cyan-300 ${
                      touched.contactNumber && errors.contactNumber 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200'
                    }`}
                    placeholder="Enter contact number"
                  />
                  <Phone className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    touched.contactNumber && errors.contactNumber ? 'text-red-400' : 'text-gray-400'
                  }`} />
                </div>
                {touched.contactNumber && errors.contactNumber && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.contactNumber}
                  </p>
                )}
              </div>

              {/* Admin Email */}
              <div className="group">
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                  <Mail className="w-4 h-4 mr-2 text-cyan-600" />
                  Admin Email *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="adminEmail"
                    value={formData.adminEmail}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-4 pl-12 border-2 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 group-hover:border-cyan-300 ${
                      touched.adminEmail && errors.adminEmail 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200'
                    }`}
                    placeholder="Enter admin email"
                  />
                  <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    touched.adminEmail && errors.adminEmail ? 'text-red-400' : 'text-gray-400'
                  }`} />
                </div>
                {touched.adminEmail && errors.adminEmail && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.adminEmail}
                  </p>
                )}
              </div>
            </div>

            {/* License Number */}
            <div className="group">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <FileText className="w-4 h-4 mr-2 text-cyan-600" />
                License Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-4 pl-12 border-2 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 group-hover:border-cyan-300 ${
                    touched.licenseNumber && errors.licenseNumber 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                  placeholder="Enter hospital license number"
                />
                <FileText className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  touched.licenseNumber && errors.licenseNumber ? 'text-red-400' : 'text-gray-400'
                }`} />
              </div>
              {touched.licenseNumber && errors.licenseNumber && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.licenseNumber}
                </p>
              )}
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-cyan-100 rounded-full flex items-center justify-center mt-0.5">
                  <Send className="w-3 h-3 text-cyan-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-cyan-800 mb-3">Registration Process</h4>
                  <ul className="text-sm text-cyan-700 space-y-2">
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></div>
                      Verification email will be sent to admin email
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></div>
                      Click verification link to activate account
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></div>
                      Admin user will be created automatically
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></div>
                      Temporary password: <strong className="ml-1">Admin@123</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 px-6 rounded-xl hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:shadow-lg flex items-center justify-center space-x-3 group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Registering Hospital...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <span>Register Hospital</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="text-cyan-600 hover:text-cyan-700 font-semibold underline-offset-2 hover:underline transition-colors"
            >
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HospitalRegister;