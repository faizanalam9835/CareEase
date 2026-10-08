import React from "react";
import {
  Heart,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Brand Column */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#b2ebf2" }}
              >
                <Heart className="w-6 h-6 text-cyan-800" fill="currentColor" />
              </div>
              <span className="text-2xl text-white">CareEase</span>
            </div>

            <p className="text-gray-400 mb-6">
              Transforming healthcare management with innovative technology
              solutions for modern hospitals.
            </p>

            <div className="flex gap-4">
              {[
                { icon: Facebook },
                { icon: Twitter },
                { icon: Linkedin },
                { icon: Instagram },
              ].map((item, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-cyan-600 transition-colors"
                  style={{ backgroundColor: "#b2ebf2" }}
                >
                  <item.icon className="w-5 h-5 text-cyan-900" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="text-white mb-4">Product</h3>
            <ul className="space-y-3">
              {[
                "Features",
                "Pricing",
                "Demo",
                "API",
                "Integrations",
                "Updates",
              ].map((t, i) => (
                <li key={i}>
                  <a href="#" className="hover:text-cyan-400 transition-colors">
                    {t}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="text-white mb-4">Company</h3>
            <ul className="space-y-3">
              {[
                "About Us",
                "Careers",
                "Blog",
                "Press",
                "Partners",
                "Contact",
              ].map((t, i) => (
                <li key={i}>
                  <a href="#" className="hover:text-cyan-400 transition-colors">
                    {t}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-white mb-4">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <a
                    href="mailto:support@careease.com"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    support@careease.com
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Phone</p>
                  <a
                    href="tel:+1234567890"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    +1 (234) 567-890
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Address</p>
                  <p>
                    123 Healthcare Ave <br />
                    Medical District, CA 90210
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © 2025 CareEase. All rights reserved.
            </p>

            <div className="flex gap-6">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
                (t, i) => (
                  <a
                    key={i}
                    href="#"
                    className="text-gray-400 hover:text-cyan-400 text-sm transition-colors"
                  >
                    {t}
                  </a>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
