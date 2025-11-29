import React from 'react';
import { TrendingUp, Award, Heart, Zap } from 'lucide-react';

const stats = [
  {
    icon: TrendingUp,
    value: '40%',
    label: 'Efficiency Increase',
    description: 'Average improvement in operational efficiency',
  },
  {
    icon: Award,
    value: '99.9%',
    label: 'Customer Satisfaction',
    description: 'Hospitals rate us excellent or very good',
  },
  {
    icon: Heart,
    value: '2M+',
    label: 'Patient Records',
    description: 'Securely managed every month',
  },
  {
    icon: Zap,
    value: '50%',
    label: 'Cost Reduction',
    description: 'In administrative overhead',
  },
];

export default function Statistics() {
  return (
    <section className="py-20 bg-gradient-to-br from-cyan-400 via-blue-400 to-cyan-500 relative overflow-hidden">
      
      {/* Background Dots */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        ></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-gray-900 mb-4">
            Trusted by Healthcare Leaders Worldwide
          </h2>
          <p className="text-gray-700 max-w-2xl mx-auto">
            Join hundreds of hospitals that have transformed their operations with CareEase
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group bg-white/95 backdrop-blur-sm rounded-3xl p-8 text-center hover:bg-white hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 hover:scale-105 border border-white/20 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-gradient-to-br from-cyan-400 to-blue-500 shadow-xl group-hover:scale-110 transition-transform duration-500">
                  <stat.icon className="w-10 h-10 text-white" />
                </div>

                <div className="text-cyan-800 mb-3 group-hover:scale-110 transition-transform duration-300">
                  {stat.value}
                </div>

                <h3 className="text-gray-900 mb-2">
                  {stat.label}
                </h3>

                <p className="text-gray-600 text-sm leading-relaxed">
                  {stat.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Info Bar */}
        <div className="mt-16 bg-white/95 backdrop-blur-lg rounded-3xl p-10 shadow-2xl border border-white/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">

            <div className="group hover:scale-105 transition-transform duration-300">
              <div className="text-cyan-800 mb-1 group-hover:text-cyan-600">24/7</div>
              <p className="text-gray-600 text-sm">Support Available</p>
            </div>

            <div className="group hover:scale-105 transition-transform duration-300">
              <div className="text-cyan-800 mb-1 group-hover:text-cyan-600">ISO Certified</div>
              <p className="text-gray-600 text-sm">Quality Standards</p>
            </div>

            <div className="group hover:scale-105 transition-transform duration-300">
              <div className="text-cyan-800 mb-1 group-hover:text-cyan-600">HIPAA</div>
              <p className="text-gray-600 text-sm">Compliant Security</p>
            </div>

            <div className="group hover:scale-105 transition-transform duration-300">
              <div className="text-cyan-800 mb-1 group-hover:text-cyan-600">Cloud Based</div>
              <p className="text-gray-600 text-sm">Accessible Anywhere</p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
