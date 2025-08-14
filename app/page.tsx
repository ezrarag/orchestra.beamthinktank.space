import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MediaPlayer from '@/components/MediaPlayer'
import Link from 'next/link'
import { Calendar, Users, Music, Heart, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-pattern">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-serif text-orchestra-dark mb-6 text-shadow">
            BEAM Orchestra
          </h1>
          <p className="text-xl md:text-2xl text-orchestra-brown mb-8 max-w-3xl mx-auto font-medium">
            Building Excellence in Arts and Music
          </p>
          <p className="text-lg text-orchestra-brown/80 mb-12 max-w-2xl mx-auto">
            Experience the transformative power of classical music with Orlando's premier community orchestra. 
            Join us for performances, rehearsals, and musical excellence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/performances" className="btn-primary">
              View Performances
            </Link>
            <Link href="/donate" className="btn-secondary">
              Support Our Mission
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif text-orchestra-dark text-center mb-12">
            What We Offer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card text-center">
              <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-orchestra-gold" />
              </div>
              <h3 className="text-xl font-serif text-orchestra-dark mb-2">Performances</h3>
              <p className="text-orchestra-brown/80">
                Experience our seasonal concerts and special events
              </p>
            </div>
            
            <div className="card text-center">
              <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-orchestra-gold" />
              </div>
              <h3 className="text-xl font-serif text-orchestra-dark mb-2">Rehearsals</h3>
              <p className="text-orchestra-brown/80">
                Join our weekly rehearsals and musical development
              </p>
            </div>
            
            <div className="card text-center">
              <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Music className="h-8 w-8 text-orchestra-gold" />
              </div>
              <h3 className="text-xl font-serif text-orchestra-dark mb-2">Member Directory</h3>
              <p className="text-orchestra-brown/80">
                Connect with fellow musicians and artists
              </p>
            </div>
            
            <div className="card text-center">
              <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Heart className="h-8 w-8 text-orchestra-gold" />
              </div>
              <h3 className="text-xl font-serif text-orchestra-dark mb-2">Scholarship Fund</h3>
              <p className="text-orchestra-brown/80">
                Supporting young musicians in their journey
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Media Player Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif text-orchestra-dark text-center mb-12">
            Featured Music
          </h2>
          <MediaPlayer 
            title="Symphony No. 5 in C Minor"
            composer="Ludwig van Beethoven"
            className="max-w-2xl mx-auto"
          />
        </div>
      </section>

      {/* Upcoming Events Preview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-orchestra-cream/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl md:text-4xl font-serif text-orchestra-dark">
              Upcoming Performances
            </h2>
            <Link href="/performances" className="text-orchestra-gold hover:text-orchestra-brown transition-colors flex items-center space-x-2">
              <span>View All</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Sample Performance Cards */}
            <div className="card">
              <div className="bg-orchestra-gold/20 h-48 rounded-lg mb-4 flex items-center justify-center">
                <Music className="h-16 w-16 text-orchestra-gold" />
              </div>
              <h3 className="text-xl font-serif text-orchestra-dark mb-2">
                Winter Concert Series
              </h3>
              <p className="text-orchestra-brown/80 mb-3">
                A celebration of classical masterpieces featuring our full orchestra
              </p>
              <div className="flex justify-between items-center">
                <span className="text-orchestra-gold font-medium">Dec 15, 2024</span>
                <span className="text-orchestra-brown">$25</span>
              </div>
            </div>
            
            <div className="card">
              <div className="bg-orchestra-gold/20 h-48 rounded-lg mb-4 flex items-center justify-center">
                <Music className="h-16 w-16 text-orchestra-gold" />
              </div>
              <h3 className="text-xl font-serif text-orchestra-dark mb-2">
                Chamber Music Evening
              </h3>
              <p className="text-orchestra-brown/80 mb-3">
                Intimate performances by our chamber ensembles
              </p>
              <div className="flex justify-between items-center">
                <span className="text-orchestra-gold font-medium">Dec 22, 2024</span>
                <span className="text-orchestra-brown">$15</span>
              </div>
            </div>
            
            <div className="card">
              <div className="bg-orchestra-gold/20 h-48 rounded-lg mb-4 flex items-center justify-center">
                <Music className="h-16 w-16 text-orchestra-gold" />
              </div>
              <h3 className="text-xl font-serif text-orchestra-dark mb-2">
                New Year's Gala
              </h3>
              <p className="text-orchestra-brown/80 mb-3">
                Ring in the new year with classical favorites and champagne
              </p>
              <div className="flex justify-between items-center">
                <span className="text-orchestra-gold font-medium">Jan 1, 2025</span>
                <span className="text-orchestra-brown">$50</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-orchestra-dark mb-6">
            Join Our Musical Community
          </h2>
          <p className="text-lg text-orchestra-brown/80 mb-8">
            Whether you're a musician looking to perform, an audience member seeking beautiful music, 
            or a supporter of the arts, there's a place for you in the BEAM Orchestra family.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/rehearsals" className="btn-primary">
              Join Rehearsals
            </Link>
            <Link href="/donate" className="btn-secondary">
              Make a Donation
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
