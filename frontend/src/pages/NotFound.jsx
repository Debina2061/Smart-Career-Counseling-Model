import { Link } from "react-router-dom";
import { FaExclamationTriangle } from "react-icons/fa";

function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 bg-white text-black">
      
      <FaExclamationTriangle className="text-6xl text-warning mb-4" />

      <h1 className="text-5xl font-bold mb-2">404</h1>

      <p className="text-gray-500 mb-6">
        Oops! The page you’re looking for doesn’t exist.
      </p>

      <Link to="/" className="btn btn-primary">
        Go back home
      </Link>  

    </div>
  );
}

export default NotFound;
