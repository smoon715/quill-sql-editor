# Quill SQL Editor

A modern SQL editor built with Next.js, TypeScript, and Supabase.

## Features

- 🚀 Next.js 15 with App Router
- 💾 Supabase integration for database operations
- ✨ TypeScript for type safety
- 🎨 Tailwind CSS for styling
- 📝 Monaco Editor for SQL editing

## Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd quill-sql-editor
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `env.example` to `.env.local`
   - Fill in your Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to find your project URL and anon key
3. Add these to your `.env.local` file
4. The app will automatically test the connection on the homepage

## Project Structure

```
src/
├── app/           # Next.js app router pages
├── lib/           # Utility libraries (Supabase client)
└── components/    # React components (to be added)
```

## Next Steps

- [ ] Create database tables in Supabase
- [ ] Build SQL editor interface with Monaco Editor
- [ ] Implement query execution
- [ ] Add results display
- [ ] Set up authentication if needed

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
