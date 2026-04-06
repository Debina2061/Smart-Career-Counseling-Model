import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GetStartedImage from "../assets/stock1.png";
import { useAuth } from "../context/AuthContext";

function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await login(formData);
      console.log("Login response:", response);
      const role = response?.user?.Role || response?.Role;
      if (role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || err.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Changed max-h-screen/h-screen to min-h-screen for better mobile support
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white text-black">
      
      {/* LEFT – FORM CONTAINER */}
      <div className="flex items-center justify-center px-4 py-8 md:px-16 lg:px-24">
        {/* Removed w-max (which causes overflow) and replaced with w-full max-w-md */}
        <div className="w-full max-w-md shadow-lg rounded-2xl px-5 py-10">
          
          <header>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-5">Sign In</h1>
            <p className="text-gray-500 my-2 text-lg">
              Enter your email and password
            </p>
          </header>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border-b border-gray-300 py-3 focus:outline-none focus:border-purple-600 transition-colors bg-transparent"
                required
              />

              <div className="relative group">
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full border-b border-gray-300 py-3 focus:outline-none focus:border-purple-600 transition-colors bg-transparent"
                  required
                />
                <button 
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="absolute right-0 top-3 text-xs font-semibold text-indigo-600 hover:text-purple-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-purple-600 to-indigo-600 my-2 text-white py-3.5 rounded-full font-bold shadow-md hover:shadow-lg hover:opacity-95 transform active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            Don’t have an account?{" "}
            <Link to="/signup" className="text-indigo-600 font-bold hover:underline">
              Sign up
            </Link>
          </div>

        </div>
      </div>

      {/* RIGHT – IMAGE (Hidden on small screens for better UX) */}
      <div className="hidden md:flex items-center justify-center p-12 ">
              <img
                src={GetStartedImage}
                alt="Sign Up illustration"
                className="max-w-full h-auto max-h-[80vh] object-contain "
              />
            </div>

    </div>
  );
}

export default SignIn;
