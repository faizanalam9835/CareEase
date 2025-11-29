import React from 'react';
import { CheckCircle2, Sparkles, Headphones, Rocket, Lock, Globe } from 'lucide-react';

const benefits = [
  {
    icon: Sparkles,
    title: 'Intuitive Interface',
    description: 'User-friendly design that requires minimal training for your staff',
  },
  {
    icon: Headphones,
    title: 'Dedicated Support',
    description: '24/7 customer support with healthcare industry experts',
  },
  {
    icon: Rocket,
    title: 'Quick Implementation',
    description: 'Get up and running in days, not months',
  },
  {
    icon: Lock,
    title: 'Enterprise Security',
    description: 'Bank-level encryption and compliance with healthcare regulations',
  },
  {
    icon: Globe,
    title: 'Multi-location Support',
    description: 'Manage multiple facilities from a single dashboard',
  },
  {
    icon: CheckCircle2,
    title: 'Regular Updates',
    description: 'Continuous improvements and new features at no extra cost',
  },
];

export default function WhyChooseUs() {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Image */}
          <div className="relative order-2 lg:order-1">
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1549560826-4b7bfe23f37b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGhjYXJlJTIwcGF0aWVudCUyMGNhcmV8ZW58MXx8fHwxNzY0MzE2NzEyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Healthcare patient care"
                className="w-full h-auto"
              />
            </div>

            {/* Decorative Badge */}
            <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-6 text-center">
              <div className="text-cyan-700 mb-1">
                #1 Rated
              </div>
              <p className="text-gray-600 text-sm">HMS Platform</p>
              <div className="flex gap-1 mt-2 justify-center">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400">⭐</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right - Content */}
          <div className="order-1 lg:order-2">
            <div className="inline-block px-4 py-2 rounded-full mb-4" style={{ backgroundColor: '#e0f7fa' }}>
              <span className="text-cyan-800">Why Choose CareEase</span>
            </div>
            
            <h2 className="text-gray-900 mb-4">
              Built for Healthcare, Designed for Excellence
            </h2>
            
            <p className="text-gray-600 mb-8">
              CareEase is more than just software – it's a complete healthcare management 
              solution designed by healthcare professionals for healthcare professionals. 
              We understand the unique challenges you face and have built features to address them.
            </p>

            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="group flex gap-4 p-5 rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 border border-cyan-100 hover:border-cyan-300 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:translate-x-2"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-cyan-400 to-blue-500 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
                  >
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-gray-900 mb-1 group-hover:text-cyan-700 transition-colors">
                      {benefit.title}
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
