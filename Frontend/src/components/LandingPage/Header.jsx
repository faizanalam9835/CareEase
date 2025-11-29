import React, { useState, useEffect } from 'react';
import { Menu, X, Heart } from 'lucide-react';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled ? 'bg-white/90 backdrop-blur-lg shadow-lg' : 'bg-white/50 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">

          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#b2ebf2' }}
            >
              <Heart className="w-6 h-6 text-cyan-800" fill="currentColor" />
            </div>
            <span className="text-2xl text-gray-900">CareEase</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {['Home', 'Features', 'Services', 'About', 'Contact'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-gray-700 hover:text-cyan-600 transition-all duration-300 relative group"
              >
                <span>{item}</span>
                <span
                  className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-600 transition-all duration-300 group-hover:w-full"
                ></span>
              </a>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="px-5 py-2 text-gray-700 hover:text-cyan-600 transition-all duration-300 relative group">
              <span>Login</span>
            </button>

            <button
              className="px-6 py-2.5 rounded-full text-white transition-all duration-300 hover:shadow-xl transform hover:scale-105 relative overflow-hidden group"
              style={{ backgroundColor: '#00acc1' }}
            >
              <span className="relative z-10">Sign Up</span>
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-cyan-600 transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="px-4 pt-2 pb-4 space-y-2">
            {['Home', 'Features', 'Services', 'About', 'Contact'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="block px-3 py-2 rounded-md text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 transition-colors"
              >
                {item}
              </a>
            ))}

            <div className="pt-4 space-y-2">
              <button className="w-full px-5 py-2 text-gray-700 border border-gray-300 rounded-full hover:border-cyan-400 transition-colors">
                Login
              </button>

              <button
                className="w-full px-6 py-2 rounded-full text-white transition-all"
                style={{ backgroundColor: '#b2ebf2', color: '#0e4c5c' }}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
