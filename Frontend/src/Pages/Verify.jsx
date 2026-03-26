import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Api from '../services/api'

export default function Verify() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Invalid verification link')
      setLoading(false)
      return
    }

    verifyHospital()
  }, [token])

  const verifyHospital = async () => {
    try {
      const res = await axios.get(
        `https://careease-3.onrender.com/api/hospitals/verify/${token}`
      )

      console.log('VERIFY RESPONSE:', res.data)

      setSuccess(true)
      setLoading(false)

      // ⏳ 3 sec baad login pe bhejo
      setTimeout(() => {
        navigate('/login')
      }, 3000)

    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.error || 'Verification failed. Link expired.'
      )
      setLoading(false)
    }
  }

  // 🌀 LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-cyan-700 font-medium">
            Verifying hospital, please wait...
          </p>
        </div>
      </div>
    )
  }

  // ❌ ERROR STATE
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 p-6 rounded-lg text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-600">
            Verification Failed ❌
          </h2>
          <p className="mt-3 text-gray-700">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  // ✅ SUCCESS STATE
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-green-50 p-6 rounded-lg text-center max-w-md">
        <h2 className="text-2xl font-semibold text-green-700">
          Hospital Verified ✅
        </h2>
        <p className="mt-3 text-gray-700">
          Admin account has been created successfully.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Redirecting to login page...
        </p>
      </div>
    </div>
  )
}
