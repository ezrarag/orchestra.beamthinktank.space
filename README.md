# BEAM Orchestra Site

A comprehensive website for the BEAM Orchestra community, featuring performance schedules, rehearsal signups, member directories, donation tracking, and scholarship fund management.

## Features

### 🎵 **Performance Management**
- Schedule of upcoming performances
- City-based filtering (Orlando, Tampa, Miami, Jacksonville)
- Ticket purchasing integration with Stripe
- Performance details and venue information

### 🎼 **Rehearsal System**
- Weekly rehearsal schedules
- Signup functionality for members
- Capacity management and availability tracking
- City-based rehearsal locations

### 👥 **Member Directory**
- Complete member profiles with instruments
- Contact information and join dates
- Filtering by city and instrument type
- Orchestra section breakdowns

### 💝 **Donation Platform**
- Secure donation processing with Stripe
- Anonymous donation options
- Real-time donation tracking
- City-based fundraising goals

### 🎓 **Scholarship Fund**
- Progress tracking for each city
- Application forms for young musicians
- Funding allocation transparency
- Support for music education programs

### 🎧 **Media Player**
- Embedded classical music player
- Custom controls and volume management
- Featured music selections
- Responsive design for all devices

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with custom classical theme
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Payments**: Stripe integration
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd beam-orchestra-site
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Fill in your API keys in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Setup

### Supabase Tables

The application expects the following tables in your Supabase database:

#### Performances
```sql
CREATE TABLE performances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  venue TEXT NOT NULL,
  description TEXT,
  city TEXT NOT NULL,
  ticket_price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Members
```sql
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  instrument TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT NOT NULL,
  join_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Rehearsals
```sql
CREATE TABLE rehearsals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER NOT NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  description TEXT,
  max_participants INTEGER NOT NULL,
  current_participants INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Donations
```sql
CREATE TABLE donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  message TEXT,
  city TEXT NOT NULL,
  anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Scholarship Funds
```sql
CREATE TABLE scholarship_funds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL UNIQUE,
  current_amount DECIMAL(10,2) DEFAULT 0,
  goal_amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Stripe Integration

### Setup
1. Create a Stripe account and get your API keys
2. Set up webhook endpoints for payment confirmation
3. Configure your product catalog for tickets and donations

### Features
- Secure payment processing
- Donation tracking
- Ticket sales for performances
- Automated receipt generation

## Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- **Netlify**: Build command: `npm run build`, Publish directory: `.next`
- **AWS Amplify**: Follow Next.js deployment guide
- **Docker**: Use provided Dockerfile for containerized deployment

## Customization

### Colors and Theme
The site uses a custom classical color palette defined in `tailwind.config.js`:
- Orchestra Gold: `#D4AF37`
- Orchestra Cream: `#F5F5DC`
- Orchestra Brown: `#8B4513`
- Orchestra Dark: `#2C1810`

### Adding New Cities
1. Update the `cities` array in components
2. Add city-specific data to database
3. Update navigation and filtering logic

### Adding New Features
1. Create new components in `components/` directory
2. Add new pages in `app/` directory
3. Update navigation in `Header.tsx`
4. Add database tables as needed

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Email: info@beamorchestra.org
- Phone: (407) 555-1234
- Website: [beamorchestra.org](https://beamorchestra.org)

## Acknowledgments

- Built with Next.js and React
- Styled with Tailwind CSS
- Icons by Lucide React
- Classical music theme inspired by traditional orchestra aesthetics
