import { Link } from "react-router-dom";
import { FaGraduationCap } from "react-icons/fa";

function Header() {
  return (
    <header className="landing-header sticky top-0 z-50">
      <div className="landing-container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5146ff] text-sm text-white shadow-sm">
            <FaGraduationCap />
          </span>
          <span className="landing-display text-lg font-bold tracking-tight text-[#1f2937] sm:text-xl">
            Smart Career Counselling
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/signin"
            className="px-1 text-sm font-semibold text-[#374151] transition hover:text-[#111827]"
          >
            Sign In
          </Link>
          <Link
            to="/getstarted"
            className="rounded-lg bg-[#5146ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4338ca]"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;
