Bright Smile Attend
A modern, smart attendance tracking application with an enhanced user interface. This project was scaffolded using Vite, React, TypeScript, and Tailwind CSS, with Supabase for the backend.

🚀 Tech Stack
Based on the repository structure, this project utilizes the following technologies:

Frontend Framework: React

Build Tool: Vite

Language: TypeScript

Styling: Tailwind CSS

UI Components: shadcn/ui (indicated by components.json)

Backend/Database: Supabase (indicated by the supabase directory)

Package Manager: Bun (indicated by bun.lockb)

Testing: Vitest (indicated by vitest.config.ts)

📁 Project Structure
/src: Contains the main React application source code, components, and styling.

/public: Static assets served directly.

/supabase: Supabase configuration, migrations, or edge functions.

components.json: Configuration for shadcn/ui components.

tailwind.config.ts: Tailwind CSS configuration.

vite.config.ts: Vite build and development server configuration.

🛠️ Getting Started
Prerequisites
Ensure you have the following installed on your local machine:

Node.js (Recommended LTS version)

Bun (Optional, but recommended as per the lockfile)

Installation
Clone the repository:

Bash
git clone https://github.com/your-username/bright-smile-attend.git
cd bright-smile-attend
Install dependencies:
Using Bun:

Bash
bun install
Alternatively, using npm:

Bash
npm install
Environment Variables
This project requires environment variables to connect to backend services like Supabase.

Duplicate the example environment file (if available) or create a new .env file in the root directory.

Add your Supabase project URL and Anon Key to the .env file:

Code snippet
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
Running the Development Server
To start the local development server, run:

Using Bun:

Bash
bun run dev
Alternatively, using npm:

Bash
npm run dev
The application will typically be available at http://localhost:5173.

🏗️ Building for Production
To build the application for production deployment:

Bash
bun run build
# or
npm run build

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Python Facial Recognition Tool
This repository also includes a Python facial attendance model in `tools/facial_attendance/` with a root launcher `facerecognition.py`.

### Python prerequisites
- Python 3.10+
- A working webcam

### Install Python dependencies
```bash
python -m pip install -r tools/facial_attendance/requirements.txt
```

If your environment blocks package downloads, run the same command on a machine with internet access.

### Run
```bash
python facerecognition.py --known-faces-dir known_faces --output attendance.csv
```

