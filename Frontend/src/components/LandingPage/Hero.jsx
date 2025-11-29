import React from 'react';
import { ArrowRight, Play, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section
      id="home"
      className="relative pt-20 pb-16 md:pt-32 md:pb-24 bg-gradient-to-b from-cyan-50 via-white to-transparent overflow-hidden"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ backgroundColor: "#b2ebf2" }}
        />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse delay-1000"
          style={{ backgroundColor: "#80deea" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <div className="space-y-6 md:space-y-8 animate-fadeInUp">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-200 shadow-sm hover:shadow-md transition-all duration-300"
              style={{ backgroundColor: "#e0f7fa" }}
            >
              <Sparkles className="w-4 h-4 text-cyan-700" />
              <span className="text-cyan-800">Smart Hospital Management</span>
            </div>

            <h1 className="text-gray-900 leading-tight">
              Transform Healthcare with{" "}
              <span className="bg-gradient-to-r from-cyan-600 to-cyan-800 bg-clip-text text-transparent">
                CareEase
              </span>
            </h1>

            <p className="text-gray-600">
              Experience seamless hospital management with our cutting-edge
              platform. From patient records to appointment scheduling, staff
              management to billing — all in one intuitive system.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Button 1 */}
              <button
                className="group px-8 py-4 rounded-full text-white transition-all duration-300 hover:shadow-2xl transform hover:scale-105 flex items-center justify-center space-x-2 relative overflow-hidden"
                style={{ backgroundColor: "#00838f" }}
              >
                <span className="relative z-10">Get Started Free</span>
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-cyan-800 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* Button 2 */}
              <button className="group px-8 py-4 rounded-full border-2 border-cyan-300 text-gray-700 hover:border-cyan-500 hover:bg-cyan-50 transition-all duration-300 flex items-center justify-center space-x-2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-100 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Play className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform" />
                <span className="relative z-10">Watch Demo</span>
              </button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 pt-4">
              <div className="group cursor-default">
                <div className="text-cyan-700 group-hover:scale-110 transition-transform">500+</div>
                <div className="text-gray-600 text-sm">Hospitals</div>
              </div>
              <div className="group cursor-default">
                <div className="text-cyan-700 group-hover:scale-110 transition-transform">50K+</div>
                <div className="text-gray-600 text-sm">Healthcare Professionals</div>
              </div>
              <div className="group cursor-default">
                <div className="text-cyan-700 group-hover:scale-110 transition-transform">1M+</div>
                <div className="text-gray-600 text-sm">Patients Served</div>
              </div>
            </div>
          </div>

          {/* Right Image (simple <img>) */}
          <div className="relative animate-fadeInUp delay-200">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-transform duration-500">
              <img
                src="https://images.unsplash.com/photo-1720180246107-cf498760f1de?auto=format&fit=crop&w=1080&q=80"
                alt="Modern hospital doctor"
                className="w-full h-auto"
              />

              {/* Floating Card */}
              <div className="absolute bottom-8 left-8 right-8 bg-white/95 backdrop-blur-md rounded-xl shadow-xl p-4 border border-white/20 animate-slideUp">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">System Efficiency</p>
                    <p className="text-cyan-700">98.5% Uptime</p>
                  </div>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse"
                    style={{ backgroundColor: "#b2ebf2" }}
                  >
                    <span className="text-2xl">✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorations */}
            <div
              className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-50 blur-2xl animate-pulse"
              style={{ backgroundColor: "#b2ebf2" }}
            />
            <div
              className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full opacity-30 blur-2xl animate-pulse delay-500"
              style={{ backgroundColor: "#b2ebf2" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
