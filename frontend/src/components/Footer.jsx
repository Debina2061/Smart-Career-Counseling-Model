import { FaGraduationCap } from "react-icons/fa";

const productLinks = ["Features", "Pricing", "Success Stories"];
const companyLinks = ["About", "Careers", "Contact"];
const legalLinks = ["Privacy", "Terms", "Security"];

function Footer() {
  return (
    <footer className="bg-[#0b1733] text-slate-200">
      <div className="landing-container py-10 sm:py-12">
        <div className="grid gap-8 border-b border-[#1f2c4d] pb-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#5146ff] text-sm text-white">
                <FaGraduationCap />
              </span>
              <p className="landing-display text-base font-bold text-white">Smart Career</p>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              AI-powered career guidance for the next generation of professionals.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Product</h4>
            <ul className="mt-4 space-y-3 text-sm">
              {productLinks.map((item) => (
                <li key={item}>
                  <a href="#" className="text-slate-400 transition hover:text-white">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Company</h4>
            <ul className="mt-4 space-y-3 text-sm">
              {companyLinks.map((item) => (
                <li key={item}>
                  <a href="#" className="text-slate-400 transition hover:text-white">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Legal</h4>
            <ul className="mt-4 space-y-3 text-sm">
              {legalLinks.map((item) => (
                <li key={item}>
                  <a href="#" className="text-slate-400 transition hover:text-white">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-5 text-center text-sm text-slate-500">
          <p>(c) {new Date().getFullYear()} Smart Career Counselling. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
