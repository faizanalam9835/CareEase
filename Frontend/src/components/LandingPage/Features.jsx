import React from 'react';
import { Calendar, Users, FileText, CreditCard, Activity, Shield, Clock, Database } from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Automated appointment booking with intelligent scheduling algorithms and real-time availability.',
    color: '#b2ebf2',
  },
  {
    icon: Users,
    title: 'Patient Management',
    description: 'Comprehensive patient records, medical history, and treatment tracking in one secure location.',
    color: '#80deea',
  },
  {
    icon: FileText,
    title: 'Digital Records',
    description: 'Paperless operations with electronic health records, prescriptions, and lab reports.',
    color: '#4dd0e1',
  },
  {
    icon: CreditCard,
    title: 'Billing & Insurance',
    description: 'Streamlined billing process with insurance claim management and payment tracking.',
    color: '#26c6da',
  },
  {
    icon: Activity,
    title: 'Real-time Monitoring',
    description: 'Track patient vitals, bed occupancy, and resource utilization in real-time.',
    color: '#00bcd4',
  },
  {
    icon: Shield,
    title: 'Data Security',
    description: 'HIPAA-compliant security with encryption, access controls, and audit trails.',
    color: '#00acc1',
  },
  {
    icon: Clock,
    title: '24/7 Access',
    description: 'Cloud-based platform accessible anytime, anywhere from any device.',
    color: '#0097a7',
  },
  {
    icon: Database,
    title: 'Analytics & Reports',
    description: 'Powerful insights with customizable dashboards and comprehensive reporting tools.',
    color: '#00838f',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center mb-16">
          <div
            className="inline-block px-4 py-2 rounded-full mb-4"
            style={{ backgroundColor: '#e0f7fa' }}
          >
            <span className="text-cyan-800">Features</span>
          </div>

          <h2 className="text-gray-900 mb-4">
            Everything You Need to Manage Your Hospital
          </h2>

          <p className="text-gray-600 max-w-2xl mx-auto">
            Our comprehensive suite of features is designed to streamline every aspect
            of hospital operations, from patient care to administrative tasks.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl border border-gray-100 hover:border-cyan-200 transition-all duration-500 hover:shadow-2xl cursor-pointer bg-white hover:bg-gradient-to-br hover:from-white hover:to-cyan-50 relative overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-cyan-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div
                className="relative w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-lg"
                style={{ backgroundColor: feature.color + '20' }}
              >
                <feature.icon
                  className="w-7 h-7 transition-transform duration-500 group-hover:scale-110"
                  style={{ color: feature.color }}
                />
              </div>

              <h3 className="relative text-gray-900 mb-2 group-hover:text-cyan-800 transition-colors">
                {feature.title}
              </h3>

              <p className="relative text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <button
            className="group px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/50 transform hover:scale-105 hover:-translate-y-1 relative overflow-hidden"
          >
            <span className="relative z-10">Explore All Features</span>
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </button>
        </div>

      </div>
    </section>
  );
}
