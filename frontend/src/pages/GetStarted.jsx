import { Link } from "react-router-dom";
import GetStartedImage from "../assets/stock1.png";

function GetStarted() {
  return (
    // Changed min-h-screen to h-screen and added overflow-hidden
    <div className="bg-white text-black h-screen w-screen grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
      
      {/* Left Side - Content */}
      <div className="flex flex-col justify-center px-8 py-8 md:px-20 lg:px-32 h-full shadow-sm">
        <div className="max-w-xl p-5  rounded-md">
          <div className="inline-block px-4 py-1.5 mb-4 text-sm font-semibold tracking-wide text-indigo-600 uppercase bg-indigo-50 rounded-full">
            Revolutionize your job search
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
            Welcome to <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-indigo-600">ATS Scanner</span>
          </h1>
          
          <p className="mt-4 text-gray-600 text-base md:text-lg leading-relaxed">
            Stop getting rejected by bots. Discover smarter ways to optimize your resume, 
            beat the tracking systems, and land your dream career.
          </p>

          <div className="flex flex-wrap gap-4 mt-8">
            <Link
              to={"/signup"}
              className="px-10 py-3.5 bg-linear-to-r from-purple-600 to-indigo-600 text-white rounded-full font-bold shadow-lg shadow-purple-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all text-center"
            >
              Get Started Free
            </Link>

            <Link
              to={"/signin"}
              className="px-10 py-3.5 border-2 border-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-50 hover:border-purple-600 hover:text-purple-600 transition-all text-center"
            >
              Sign In
            </Link>
          </div>
          
          <div className="mt-10 flex items-center gap-4 text-sm text-gray-500">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <img 
                  key={i} 
                  src={`https://i.pravatar.cc/100?img=${i + 10}`} 
                  className="w-9 h-9 rounded-full border-2 border-white object-cover" 
                  alt="user"
                />
              ))}
            </div>
            <p>Joined by 2,000+ job seekers this week</p>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Visual */}
      <div className="hidden lg:flex items-center justify-center  p-12 h-full overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center"> 
          <img
            src={GetStartedImage}
            alt="ATS Scanning Dashboard"
            // max-h-full ensures it never gets taller than its half of the screen
            className="relative z-10 max-w-full max-h-full object-contain"
          />
        </div>
      </div>
      
    </div>
  );
}

export default GetStarted;