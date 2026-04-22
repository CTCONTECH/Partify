# Partify

A mobile-first web application for finding car parts and comparing suppliers across Cape Town, South Africa.

## Features

### For Clients (Mechanics & Car Owners)
- Search for parts by part number or name
- Vehicle-specific compatibility matching
- Compare suppliers by:
  - Stock availability
  - Distance from your location
  - Item price
  - Total cost (item + estimated travel fuel cost)
- Save search history
- Price drop notifications

### For Suppliers (Auto Parts Stores)
- Manage inventory and pricing
- Update stock quantities in real-time
- Low stock alerts
- Track sales and customer inquiries
- Dashboard with business analytics

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/CTCONTECH/Partify.git
cd Partify
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── client/          # Client-facing pages
│   ├── supplier/        # Supplier-facing pages
│   ├── login/           # Authentication pages
│   └── ...
├── components/          # Reusable React components
├── data/                # Mock data and utilities
└── styles/              # Global styles and theme
```

## Design System

### Color Palette
- **Primary**: Deep Orange (#D84315) - Main brand color
- **Secondary**: Dark Gray (#424242) - Supporting elements
- **Semantic Colors**:
  - Available: Green - In stock items
  - Low Stock: Orange - Low inventory warning
  - Out of Stock: Red - No inventory
  - Best Price: Blue - Lowest price indicator
  - Closest: Purple - Nearest supplier indicator

### Components
- Buttons (Primary, Secondary, Ghost, Destructive)
- Input fields with icons
- Search bars
- Cards (Part, Supplier)
- Badges for status indicators
- Navigation (Top bar, Bottom tabs)
- Segmented controls

## Features in Detail

### Client Journey
1. Welcome screen with app introduction
2. Role selection (Client or Supplier)
3. Account creation
4. Vehicle setup (make, model, year, engine)
5. Part search
6. Supplier comparison with smart sorting
7. Profile management

### Supplier Journey
1. Role selection
2. Account creation
3. Business dashboard
4. Inventory management
5. Price and stock updates
6. Activity tracking

### Smart Cost Calculation
The app calculates total cost by combining:
- Item price at supplier
- Estimated fuel cost (based on distance × R2.50/km round trip)
- This helps users make informed decisions about "cheapest" vs "closest" suppliers

## Mock Data

The app includes realistic mock data for:
- 5 suppliers across Cape Town suburbs
- 5 common car parts
- Inventory pricing and stock levels
- Cape Town-specific locations (Bellville, Parow, Woodstock, Milnerton, Brackenfell)

## Build for Production

```bash
npm run build
npm start
```

## License

Private - CTCONTECH

## Contact

For questions or support, contact: ctconenquiry@gmail.com
