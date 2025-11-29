import React from 'react';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Dr. Sarah Mitchell',
    role: 'Chief Medical Officer',
    hospital: 'City General Hospital',
    image: '👩‍⚕️',
    rating: 5,
    text: 'CareEase has revolutionized how we manage patient care. The intuitive interface and comprehensive features have significantly improved our operational efficiency. Our staff adapted quickly, and patient satisfaction has increased dramatically.',
  },
  {
    name: 'Michael Chen',
    role: 'Hospital Administrator',
    hospital: 'Metropolitan Medical Center',
    image: '👨‍💼',
    rating: 5,
    text: 'The billing and insurance module alone has saved us countless hours. The real-time analytics help us make informed decisions quickly. Best investment we\'ve made in healthcare technology in the past decade.',
  },
  {
    name: 'Dr. Priya Sharma',
    role: 'Head of Emergency Services',
    hospital: 'Central Emergency Hospital',
    image: '👩‍⚕️',
    rating: 5,
    text: 'In emergency medicine, every second counts. CareEase gives us instant access to patient history and streamlines our workflows. It\'s been a game-changer for our department.',
  },
  {
    name: 'James Wilson',
    role: 'IT Director',
    hospital: 'Regional Healthcare Network',
    image: '👨‍💻',
    rating: 5,
    text: 'Implementation was smooth, and the technical support is outstanding. The security features meet all our compliance requirements. Managing multiple facilities has never been easier.',
  },
  {
    name: 'Dr. Amanda Rodriguez',
    role: 'Medical Director',
    hospital: 'Sunrise Medical Institute',
    image: '👩‍⚕️',
    rating: 5,
    text: 'The patient management system is incredibly comprehensive. We can track everything from initial consultation to discharge and follow-up. Our clinical outcomes have improved measurably.',
  },
  {
    name: 'Robert Taylor',
    role: 'CFO',
    hospital: 'Lakeside Hospital Group',
    image: '👨‍💼',
    rating: 5,
    text: 'From a financial perspective, CareEase has delivered excellent ROI. Reduced administrative costs, fewer billing errors, and improved cash flow. Highly recommend to any healthcare organization.',
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 bg-gradient-to-b from-cyan-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 rounded-full mb-4" style={{ backgroundColor: '#e0f7fa' }}>
            <span className="text-cyan-800">Testimonials</span>
          </div>
          <h2 className="text-gray-900 mb-4">
            Loved by Healthcare Professionals
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            See what healthcare leaders are saying about their experience with CareEase
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 transform hover:-translate-y-3 border border-gray-100 hover:border-cyan-200 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                {/* Quote Icon */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-6 bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <Quote className="w-6 h-6 text-white" />
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400 hover:scale-125 transition-transform" />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="text-gray-700 mb-6 text-sm leading-relaxed">
                  "{testimonial.text}"
                </p>

                {/* Author Info */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl bg-gradient-to-br from-cyan-100 to-blue-100 group-hover:scale-110 transition-transform duration-300">
                    {testimonial.image}
                  </div>
                  <div>
                    <h4 className="text-gray-900 group-hover:text-cyan-700 transition-colors">
                      {testimonial.name}
                    </h4>
                    <p className="text-gray-600 text-sm">{testimonial.role}</p>
                    <p className="text-cyan-700 text-xs">{testimonial.hospital}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-600 mb-6">Join over 500+ hospitals using CareEase</p>
          <button
            className="group px-10 py-5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/50 transform hover:scale-110 hover:-translate-y-1 relative overflow-hidden"
          >
            <span className="relative z-10">Start Your Free Trial</span>
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </button>
        </div>
      </div>
    </section>
  );
}
