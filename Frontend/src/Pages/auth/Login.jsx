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
      console.log("📡 Calling login API...")

      const response = await authAPI.login(data)

      console.log("✅ API Response:", response)

      // ✅ Handle failed response
      if (!response || !response.success) {
        toast.error(response?.error || "Login failed")
        return
      }

      // ✅ Store auth data
      authAPI.storeAuthData(response)

      // ✅ Safe access user
      const firstName = response?.user?.firstName || "User"

      toast.success(`Welcome back, ${firstName}!`)

      // ✅ Navigate only if success
      navigate('/app/dashboard')

    } catch (error) {
      console.error("❌ Login Error:", error)

      // ✅ Network error
      if (error.message === "Network Error") {
        toast.error("Server unreachable. Check internet or backend.")
        return
      }

      // ✅ Backend error
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Something went wrong"

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

          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="bg-[#b2ebf2] rounded-xl p-3 shadow-lg">
              <Stethoscope className="h-8 w-8 text-cyan-700" />
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900">CareEase HMS</h2>
              <p className="text-sm text-cyan-600 font-medium">Hospital Management System</p>
            </div>
          </div>

          {/* Desktop Logo */}
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
            <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit(onSubmit)}>

              {/* Inputs */}
              <div className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  icon={<Mail className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500" />}
                  placeholder="admin@hospital.com"
                  error={errors.email}
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
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
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
                  {...register('tenantId', {
                    required: 'Hospital ID is required'
                  })}
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-lg font-semibold"
              >
                {loading ? "Loading..." : "Access Dashboard"}
              </Button>

              {/* Demo Button */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-cyan-600"
                  onClick={() => {
                    document.querySelector('input[name="email"]').value = 'admin@apollo.com'
                    document.querySelector('input[name="password"]').value = 'Admin@123'
                    document.querySelector('input[name="tenantId"]').value = 'TDADBA9CB'
                    toast.success('Demo credentials filled!')
                  }}
                >
                  Try Demo Login
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>

      {/* Right Side same as before */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center bg-gradient-to-br from-[#B2EBF2] to-cyan-200 p-8 xl:p-12">
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
                <span className="truncate">:hospital: Multi-Tenant</span>
              </div>
              <div className="flex items-center justify-center p-2 sm:p-3 bg-white/50 rounded-lg">
                <span className="truncate">:pill: Pharmacy</span>
              </div>
              <div className="flex items-center justify-center p-2 sm:p-3 bg-white/50 rounded-lg">
                <span className="truncate">:bar_chart: Analytics</span>
              </div>
              <div className="flex items-center justify-center p-2 sm:p-3 bg-white/50 rounded-lg">
                <span className="truncate">:closed_lock_with_key: Secure</span>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 text-cyan-800/80 text-xs sm:text-sm">
            <p>Trusted by 500+ hospitals nationwide</p>
          </div>
        </div>
      </div>

      {/* Mobile Branding - Show only on mobile */}
      <div className="lg:hidden bg-gradient-to-br from-[#B2EBF2] to-cyan-200 py-8 px-6">
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
                <span>:hospital: Multi-Tenant</span>
              </div>
              <div className="flex items-center justify-center p-2 bg-white/50 rounded-lg">
                <span>:pill: Pharmacy</span>
              </div>
              <div className="flex items-center justify-center p-2 bg-white/50 rounded-lg">
                <span>:bar_chart: Analytics</span>
              </div>
              <div className="flex items-center justify-center p-2 bg-white/50 rounded-lg">
                <span>:closed_lock_with_key: Secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login