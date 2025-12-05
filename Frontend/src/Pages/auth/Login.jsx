import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Stethoscope, Heart } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { authAPI } from '../../services/auth'

const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const response = await authAPI.login(data)
      
      // Store authentication data
      authAPI.storeAuthData(response)
      
      toast.success(`Welcome back, ${response.user.firstName}!`)
      navigate('/dashbooard')
      window.reload.href()
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed!'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 xl:px-12 bg-white">
        <div className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none lg:w-96">
          {/* Mobile Logo - Only show on small screens */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="bg-[#b2ebf2] rounded-xl p-3 shadow-lg">
              <Stethoscope className="h-8 w-8 text-cyan-700" />
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900">CareEase HMS</h2>
              <p className="text-sm text-cyan-600 font-medium">Hospital Management System</p>
            </div>
          </div>

          {/* Desktop Logo - Only show on large screens */}
          <div className="hidden lg:block">
            <div className="flex items-center">
              <div className="bg-[#b2ebf2] rounded-xl p-3 shadow-lg">
                <Stethoscope className="h-8 w-8 text-cyan-700" />
              </div>
              <div className="ml-4">
                <h2 className="text-2xl font-bold text-gray-900">CareEase HMS</h2>
                <p className="text-sm text-cyan-600 font-medium">Hospital Management System</p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="mt-6">
              <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    icon={<Mail className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500" />}
                    placeholder="admin@hospital.com"
                    error={errors.email}
                    className="text-sm sm:text-base"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: 'Invalid email address'
                      }
                    })}
                  />

                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    icon={<Lock className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500" />}
                    placeholder="Enter your password"
                    error={errors.password}
                    className="text-sm sm:text-base"
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-cyan-500 hover:text-cyan-600 transition-colors"
                      >
                        {showPassword ? 
                          <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : 
                          <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                        }
                      </button>
                    }
                    {...register('password', { 
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters'
                      }
                    })}
                  />

                  <Input
                    label="Hospital ID"
                    type="text"
                    placeholder="TABC123"
                    icon={<Heart className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500" />}
                    error={errors.tenantId}
                    className="text-sm sm:text-base"
                    {...register('tenantId', { 
                      required: 'Hospital ID is required'
                    })}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <a href="#" className="font-medium text-cyan-600 hover:text-cyan-500 transition-colors">
                      Forgot password?
                    </a>
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="large"
                    loading={loading}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm sm:text-base"
                  >
                    Access Dashboard
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-600">
                    New to CareEase?{' '}
                    <button 
                      type="button"
                      className="font-medium text-cyan-600 hover:text-cyan-500 transition-colors"
                      onClick={() => {
                        // Auto-fill demo credentials
                        const emailInput = document.querySelector('input[name="email"]')
                        const passwordInput = document.querySelector('input[name="password"]')
                        const tenantInput = document.querySelector('input[name="tenantId"]')
                        
                        if (emailInput) emailInput.value = 'admin@apollo.com'
                        if (passwordInput) passwordInput.value = 'Admin@123'
                        if (tenantInput) tenantInput.value = 'TDADBA9CB'
                        
                        toast.success('Demo credentials filled! Click Access Dashboard.')
                      }}
                    >
                      Try Demo Login
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Branding Section - Hidden on mobile */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center bg-gradient-to-br from-[#b2ebf2] to-cyan-200 p-8 xl:p-12">
        <div className="max-w-md text-center w-full">
          <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/40">
            <div className="bg-white rounded-full p-3 sm:p-4 w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 shadow-lg">
              <Heart className="h-8 w-8 sm:h-12 sm:w-12 text-cyan-600 mx-auto" />
            </div>
            
            <h1 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-cyan-900 mb-3 sm:mb-4">
              CareEase HMS
            </h1>
            
            <p className="text-sm sm:text-base xl:text-lg text-cyan-800 mb-4 sm:mb-6 leading-relaxed">
              Streamline your hospital operations with our comprehensive management system. 
              Built for modern healthcare facilities.
            </p>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm text-cyan-800">
              <div className="flex items-center justify-center p-2 sm:p-3 bg-white/50 rounded-lg">
                <span className="truncate">🏥 Multi-Tenant</span>
              </div>
              <div className="flex items-center justify-center p-2 sm:p-3 bg-white/50 rounded-lg">
                <span className="truncate">💊 Pharmacy</span>
              </div>
              <div className="flex items-center justify-center p-2 sm:p-3 bg-white/50 rounded-lg">
                <span className="truncate">📊 Analytics</span>
              </div>
              <div className="flex items-center justify-center p-2 sm:p-3 bg-white/50 rounded-lg">
                <span className="truncate">🔐 Secure</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 sm:mt-8 text-cyan-800/80 text-xs sm:text-sm">
            <p>Trusted by 500+ hospitals nationwide</p>
          </div>
        </div>
      </div>

      {/* Mobile Branding - Show only on mobile */}
      <div className="lg:hidden bg-gradient-to-br from-[#b2ebf2] to-cyan-200 py-8 px-6">
        <div className="max-w-sm mx-auto text-center">
          <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/40">
            <div className="bg-white rounded-full p-3 w-16 h-16 mx-auto mb-4 shadow-lg">
              <Heart className="h-8 w-8 text-cyan-600 mx-auto" />
            </div>
            
            <h1 className="text-2xl font-bold text-cyan-900 mb-3">
              CareEase HMS
            </h1>
            
            <p className="text-sm text-cyan-800 mb-4 leading-relaxed">
              Streamline your hospital operations with our comprehensive management system.
            </p>
            
            <div className="grid grid-cols-2 gap-2 text-xs text-cyan-800">
              <div className="flex items-center justify-center p-2 bg-white/50 rounded-lg">
                <span>🏥 Multi-Tenant</span>
              </div>
              <div className="flex items-center justify-center p-2 bg-white/50 rounded-lg">
                <span>💊 Pharmacy</span>
              </div>
              <div className="flex items-center justify-center p-2 bg-white/50 rounded-lg">
                <span>📊 Analytics</span>
              </div>
              <div className="flex items-center justify-center p-2 bg-white/50 rounded-lg">
                <span>🔐 Secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login