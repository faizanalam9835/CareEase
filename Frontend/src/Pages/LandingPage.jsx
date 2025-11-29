import React from 'react'
import Header from '../components/LandingPage/Header'
import Hero from '../components/LandingPage/Hero'
import Features from '../components/LandingPage/Features'
import Services from '../components/LandingPage/Services'
import WhyChoose from '../components/LandingPage/WhyChoose'
import Testimonials from '../components/LandingPage/Testimonials'
import CTA from '../components/LandingPage/CTA'
import Footer from '../components/LandingPage/Footer'
import Statistics from '../components/LandingPage/Stats'

export default function LandingPage() {
  return (
     <>
    <div>
      <Header/>
      <Hero/>
      <Features />
      <Services />
      <Statistics/>
      <WhyChoose />
      <Testimonials />
      <CTA/>
      <Footer />
    </div>
     </>
  )
}
