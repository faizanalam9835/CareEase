import React from "react";
import {
  Stethoscope,
  Building2,
  UserCog,
  ClipboardList,
  Pill,
  Ambulance,
} from "lucide-react";

const services = [
  {
    icon: Stethoscope,
    title: "Outpatient Management",
    description:
      "Streamline OPD operations with queue management, consultation tracking, and follow-up scheduling.",
  },
  {
    icon: Building2,
    title: "Inpatient Care",
    description:
      "Manage admissions, bed allocation, ward transfers, and discharge processes efficiently.",
  },
  {
    icon: UserCog,
    title: "Staff Management",
    description:
      "Handle scheduling, attendance, payroll, and performance tracking for all hospital staff.",
  },
  {
    icon: ClipboardList,
    title: "Laboratory Management",
    description:
      "Integrate lab tests, results, and reports directly into patient records with automated workflows.",
  },
  {
    icon: Pill,
    title: "Pharmacy Integration",
    description:
      "Connect pharmacy inventory, prescriptions, and dispensing with patient treatment plans.",
  },
  {
    icon: Ambulance,
    title: "Emergency Services",
    description:
      "Priority handling for emergency cases with quick access to patient history and immediate care protocols.",
  },
];

export default function Services() {
  return (
    <section id="services" className="py-20 bg-gradient-to-b from-white to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center mb-16">
          <div
            className="inline-block px-4 py-2 rounded-full mb-4"
            style={{ backgroundColor: "#e0f7fa" }}
          >
            <span className="text-cyan-800">Services</span>
          </div>

          <h2 className="text-gray-900 mb-4">
            Comprehensive Hospital Services Management
          </h2>

          <p className="text-gray-600 max-w-2xl mx-auto">
            Manage every department and service with dedicated modules tailored
            to healthcare workflows and best practices.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div className="space-y-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="flex gap-4 p-5 rounded-xl bg-white hover:shadow-2xl transition-all duration-500 cursor-pointer group border border-transparent hover:border-cyan-100 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div
                  className="relative w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-md"
                  style={{ backgroundColor: "#b2ebf2" }}
                >
                  <service.icon className="w-6 h-6 text-cyan-900 transition-transform duration-500 group-hover:scale-110" />
                </div>

                <div className="relative">
                  <h3 className="text-gray-900 mb-1 group-hover:text-cyan-800 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right – SIMPLE IMG */}
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 transform hover:scale-[1.02]">
              <img
                src="https://images.unsplash.com/photo-1606206873764-fd15e242df52?auto=format&fit=crop&w=1080&q=80"
                alt="Medical technology"
                className="w-full h-auto"
              />
            </div>

            {/* Floating Card 1 */}
            <div className="absolute top-8 -left-4 bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-5 border border-white/20 hover:bg-white transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <p className="text-gray-900">15+ Departments</p>
                  <p className="text-gray-500 text-sm">Fully Integrated</p>
                </div>
              </div>
            </div>

            {/* Floating Card 2 */}
            <div className="absolute bottom-8 -right-4 bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-5 border border-white/20 hover:bg-white transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
                  <span className="text-xl">⚡</span>
                </div>
                <div>
                  <p className="text-gray-900">Real-Time Sync</p>
                  <p className="text-gray-500 text-sm">Instant Updates</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
