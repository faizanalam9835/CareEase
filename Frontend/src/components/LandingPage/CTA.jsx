import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function CTA() {
  return (
    <section id="contact" className="py-20 bg-gradient-to-b from-white to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-cyan-400 via-blue-400 to-cyan-500 relative">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '30px 30px',
              }}
            ></div>
          </div>

          <div className="grid lg:grid-cols-2 gap-0 relative z-10">

            {/* Left - Content */}
            <div className="p-8 md:p-12 lg:p-16">
              <h2 className="text-gray-900 mb-4">
                Ready to Transform Your Hospital Management?
              </h2>
              <p className="text-gray-700 mb-8">
                Join the future of healthcare management. Start your free 30-day trial today
                and experience the difference CareEase can make.
              </p>

              {/* Benefits List */}
              <div className="space-y-3 mb-8">
                {[
                  'No credit card required',
                  'Free 30-day trial',
                  'Full access to all features',
                  'Dedicated onboarding support',
                  'Cancel anytime',
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-cyan-900 flex-shrink-0" />
                    <span className="text-gray-800">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* CTA Form */}
              <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
                <form className="space-y-5">
                  <div>
                    <input
                      type="text"
                      placeholder="Hospital Name"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-200/50 outline-none transition-all duration-300 hover:border-cyan-300"
                    />
                  </div>

                  <div>
                    <input
                      type="email"
                      placeholder="Work Email"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-200/50 outline-none transition-all duration-300 hover:border-cyan-300"
                    />
                  </div>

                  <div>
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-200/50 outline-none transition-all duration-300 hover:border-cyan-300"
                    />
                  </div>

                  <button
                    type="submit"
                    className="group w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-4 rounded-xl hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-2xl transform hover:scale-[1.02]"
                  >
                    <span>Start Free Trial</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </button>
                </form>

                <p className="text-center text-gray-600 text-xs mt-5 leading-relaxed">
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </div>

            {/* Right - Image (simple img) */}
            <div className="relative h-64 lg:h-auto">
              <img
                src="https://images.unsplash.com/photo-1565262353342-6e919eab5b58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
                alt="Hospital interior"
                className="w-full h-full object-cover"
              />

              {/* Floating Badge */}
              <div className="absolute top-8 left-8 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-5 border border-white/20 hover:bg-white transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎉</span>
                  <div>
                    <p className="text-gray-900">Special Offer</p>
                    <p className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent text-sm">
                      50% off first 3 months
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
